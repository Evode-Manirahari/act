import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  CaptureApiError,
  getRecording,
  listReviewQueue,
  listRecordingMoments,
  logJobEvent,
  requestRecordingRedaction,
  reviewMoment,
} from '../api/captureApi';
import type { MomentOut, RecordingOut, ReviewQueueItem } from '../api/captureApi';
import {
  compileMoment,
  editMomentQuestion,
  LibraryApiError,
  listKnowledgeObjects,
  loadOrCreateMomentQuestion,
  resolveMomentQuestion,
  publishKnowledgeObject,
  safetyCheckKnowledgeObject,
  submitExpertAudioAnswer,
  submitExpertAnswer,
  upsertReviewChecklist,
} from '../api/libraryApi';
import type { ElicitationQuestion, KnowledgeObject } from '../api/libraryApi';
import { AuthRequiredError } from '../lib/authToken';
import { authErrorMessage, isAuthenticationError } from '../lib/authErrors';
import {
  actionFailed,
  answerAccepted,
  answerRejected,
  beginAction,
  canCompile,
  canPublish,
  canRequestQuestion,
  canSubmitAudioAnswer,
  canSubmitTypedAnswer,
  cardPublished,
  draftCompiled,
  initialStateForMoment,
  INITIAL_DEBRIEF_STATE,
  isBusy,
  momentApproved,
  questionReady,
  type DebriefAction,
  sessionExpired,
  setDraftAnswer,
  type DebriefState,
} from './reviewDebriefModel';
import {
  firstReadError,
  hydrateState,
  resolveHeldValue,
  type MomentServerState,
} from './debriefHydration';
import { createHydrator, type Hydrator } from './debriefSync';
import { isUncertainOutcome } from './debriefFailure';
import { createSingleFlight, flightKey } from './singleFlight';
import {
  createReconciliationController,
  nextMomentToReconcile,
} from './debriefReconciler';
import type { PilotStackParamList } from '../navigation/PilotNavigator';
import ActAppShell from '../components/ActAppShell';
import ReviewMomentCard from '../components/ReviewMomentCard';
import {
  ActButton,
  ActCard,
  ActEmptyState,
  ActPill,
  ActText,
  colors,
  spacing,
} from '../design';

type NavProp = NativeStackNavigationProp<PilotStackParamList>;
type ReviewRoute = RouteProp<PilotStackParamList, 'PilotReview'>;

/**
 * Per-moment state for the post-job debrief loop: the phase machine plus the
 * server objects the panel renders. The machine owns every gate — this screen
 * never decides on its own that a moment has been debriefed.
 */
type MomentDebrief = {
  machine: DebriefState;
  question: ElicitationQuestion | null;
  draft: KnowledgeObject | null;
};

const EMPTY_DEBRIEF: MomentDebrief = {
  machine: INITIAL_DEBRIEF_STATE,
  question: null,
  draft: null,
};

/** Prefer the backend's own explanation over the transport-level string. */
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthRequiredError) return err.message;
  if (err instanceof LibraryApiError) return err.detail ?? err.message;
  return err instanceof Error ? err.message : fallback;
}

/** Map a thrown error onto the machine without inventing a success. */
function applyFailure(state: DebriefState, err: unknown): DebriefState {
  if (err instanceof AuthRequiredError) {
    return sessionExpired(state, err.message);
  }
  if (err instanceof LibraryApiError || err instanceof CaptureApiError) {
    if (err.status === 401 || err.status === 403) {
      return sessionExpired(
        state,
        err.status === 403
          ? 'This action can only be taken by the signed-in technician.'
          : undefined,
      );
    }
    const detail = err instanceof LibraryApiError ? err.detail : null;
    if (err.status === 422) {
      const reason = err instanceof LibraryApiError ? err.reason : null;
      return answerRejected(state, reason, detail);
    }
    // 5xx may have landed server-side before the response was lost.
    return actionFailed(state, detail ?? err.message, { uncertain: err.status >= 500 });
  }
  // Network-shaped failure: we genuinely don't know whether the write landed.
  return actionFailed(state, err instanceof Error ? err.message : 'Action failed', {
    uncertain: true,
  });
}

export default function PilotReviewScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ReviewRoute>();
  const recordingId = route.params?.recordingId;
  const queueMode = !recordingId;
  const [recording, setRecording] = useState<RecordingOut | null>(null);
  const [moments, setMoments] = useState<MomentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [debriefs, setDebriefs] = useState<Record<string, MomentDebrief>>({});
  // Which approved moment has the voice debrief agent open (one at a time).
  const [voiceMomentId, setVoiceMomentId] = useState<string | null>(null);

  /**
   * The synchronous mutex for every debrief write. React state can't do this
   * job: two presses in one frame both read `action: 'idle'` and both fire.
   * Claiming the key here happens before any await, so the second press loses.
   */
  const flight = useRef(createSingleFlight());

  /** Owns *when* an automatic reconciliation may run. See debriefReconciler. */
  const reconciler = useRef(createReconciliationController());

  /**
   * Seed a machine for every moment we haven't seen yet, from its server
   * status. Moments already in the map keep their state — a refresh must not
   * wipe an answer the technician is part-way through typing. Hydration
   * immediately corrects these seeds with complete server state.
   */
  const seedDebriefs = useCallback((nextMoments: MomentOut[]) => {
    setDebriefs((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const moment of nextMoments) {
        if (!next[moment.id]) {
          next[moment.id] = {
            ...EMPTY_DEBRIEF,
            machine: initialStateForMoment(moment.status),
          };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  /**
   * The single authoritative hydration path. Reads moment status, the
   * authoritative question, whether it is answered, and the card (draft or
   * published) — then folds all of it into each machine.
   *
   * Runs on first load, pull-to-refresh, voice-agent completion, and after any
   * uncertain write. Nothing else is allowed to decide those phases.
   */
  const applyServerState = useCallback((server: MomentServerState[]) => {
    setDebriefs((prev) => {
      const next = { ...prev };
      for (const entry of server) {
        const current = next[entry.momentId] ?? EMPTY_DEBRIEF;
        let machine = hydrateState(current.machine, entry);

        // An expired or rejected session is the one read failure worth naming
        // specifically: it is actionable (sign in) rather than "try again
        // later", and retrying cannot fix it. Covers a locally-missing token
        // (AuthRequiredError) and a token the backend rejected (401/403).
        const readError = firstReadError(entry);
        if (isAuthenticationError(readError)) {
          machine = sessionExpired(machine, authErrorMessage(readError));
        }

        next[entry.momentId] = {
          machine,
          // Only a successful read may replace or clear these. A failed read
          // leaves the reviewer looking at what they had — flagged unconfirmed
          // by the machine, and not actionable.
          question: resolveHeldValue(
            entry.question.ok
              ? { ok: true as const, value: entry.question.value?.question ?? null }
              : entry.question,
            current.question,
          ),
          draft: resolveHeldValue(entry.card, current.draft),
        };
      }
      return next;
    });
  }, []);

  // The hydrator is built once, so it reads `apply` through a ref to avoid
  // capturing a stale closure over screen state.
  const applyServerStateRef = useRef(applyServerState);
  applyServerStateRef.current = applyServerState;

  /**
   * Every hydration goes through the shared hydrator, which claims each moment
   * synchronously before awaiting and collapses concurrent batches. See
   * debriefSync for why both are required.
   */
  const hydrator = useRef<Hydrator | null>(null);
  if (hydrator.current === null) {
    hydrator.current = createHydrator({
      api: { listRecordingMoments, resolveMomentQuestion, listKnowledgeObjects },
      controller: reconciler.current,
      flight: flight.current,
      apply: (server) => applyServerStateRef.current(server),
    });
  }

  const hydrate = useCallback(async (nextMoments: MomentOut[]) => {
    await hydrator.current?.(
      nextMoments.map((moment) => ({
        id: moment.id,
        // Local status seeds the initial UI only; hydration re-reads it.
        status: moment.status,
        recordingId: moment.recording_id,
      })),
    );
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      let nextMoments: MomentOut[];
      if (recordingId) {
        const detail = await getRecording(recordingId);
        setRecording(detail.recording);
        nextMoments = await listRecordingMoments({ recordingId });
      } else {
        setRecording(null);
        nextMoments = await listReviewQueue({ status: 'proposed', trade: 'hvac', limit: 50 });
      }
      setMoments(nextMoments);
      seedDebriefs(nextMoments);
      await hydrate(nextMoments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'review load failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recordingId, seedDebriefs, hydrate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function getDebrief(momentId: string): MomentDebrief {
    return debriefs[momentId] ?? EMPTY_DEBRIEF;
  }

  function patchDebrief(momentId: string, patch: Partial<MomentDebrief>) {
    setDebriefs((prev) => ({
      ...prev,
      [momentId]: { ...(prev[momentId] ?? EMPTY_DEBRIEF), ...patch },
    }));
  }

  /** Advance the phase machine for one moment. */
  function updateMachine(momentId: string, fn: (state: DebriefState) => DebriefState) {
    setDebriefs((prev) => {
      const current = prev[momentId] ?? EMPTY_DEBRIEF;
      return { ...prev, [momentId]: { ...current, machine: fn(current.machine) } };
    });
  }

  /** Seed a moment's machine from its server status the first time we see it. */
  function machineFor(moment: MomentOut): DebriefState {
    const existing = debriefs[moment.id];
    return existing ? existing.machine : initialStateForMoment(moment.status);
  }

  /**
   * Ask the server what actually happened, after a write whose outcome we
   * couldn't observe. This is the same hydration used on load — a lost compile
   * response and a fresh screen are the same question ("what does the server
   * say?"), so they get the same answer path. Guessing here is what turns one
   * dropped response into a duplicate question or a second card.
   */
  const reconcileMoment = useCallback(
    async (momentId: string, moment: MomentOut | undefined) => {
      if (!moment) return;
      await hydrate([moment]).catch(() => {
        // Leave the machine as-is; the banner already says the last action
        // failed and the reviewer can pull-to-refresh.
      });
    },
    [hydrate],
  );

  /**
   * One automatic reconciliation per uncertain write — not one per render.
   *
   * `needsRefetch` means "unresolved", and a failed hydration keeps it set. If
   * that flag also drove scheduling, the failure would write state, the state
   * write would re-run this effect, and it would fail again forever. The
   * controller owns scheduling separately: it hands out one attempt, and only a
   * confirmed result or an explicit user action re-arms it.
   */
  useEffect(() => {
    const momentId = nextMomentToReconcile(
      reconciler.current,
      Object.entries(debriefs),
    );
    if (!momentId) return;
    // Claim synchronously, before any await, so a second render in the same
    // tick cannot also claim it.
    reconciler.current.claim(momentId);
    const moment = moments.find((item) => item.id === momentId);
    void reconcileMoment(momentId, moment);
  }, [debriefs, moments, reconcileMoment]);

  /**
   * Explicit user retry for one moment. No `allowRetry` here: the hydrator
   * claims the moment synchronously, so this manual attempt is itself the
   * attempt and the automatic effect stays out of its way.
   */
  const retryMoment = useCallback(
    (momentId: string) => {
      const moment = moments.find((item) => item.id === momentId);
      void reconcileMoment(momentId, moment);
    },
    [moments, reconcileMoment],
  );

  function emitReviewEvent(
    eventType: string,
    moment: MomentOut,
    payload?: Record<string, unknown>,
  ) {
    void logJobEvent({
      eventType,
      actorId: recording?.user_id ?? moment.reviewer_id ?? null,
      jobId: recording?.job_id ?? (moment as Partial<ReviewQueueItem>).job_id ?? null,
      recordingId: moment.recording_id,
      payload: {
        moment_id: moment.id,
        ...payload,
      },
    }).catch(() => {
      // Workflow telemetry should never block review/publish.
    });
  }

  // --- PRESERVED: review status actions (approve / reject / needs_more_info) -
  async function actOnMoment(
    momentId: string,
    status: 'approved' | 'rejected' | 'needs_more_info',
  ) {
    setActingId(momentId);
    setError(null);
    try {
      const current = moments.find((moment) => moment.id === momentId);
      const updated = await reviewMoment({ momentId, status });
      setMoments((prev) =>
        prev.map((moment) => (moment.id === momentId ? updated : moment)),
      );
      emitReviewEvent('review_decision', current ?? updated, {
        status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'review action failed');
    } finally {
      setActingId(null);
    }
  }

  // --- Debrief loop -----------------------------------------------------------
  // approve -> create/load question -> real technician answer -> compile -> publish
  //
  // Each step runs only if the machine's gate allows it, which is what makes a
  // second tap on a slow network a no-op instead of a duplicate write. No step
  // supplies content on the technician's behalf; if they haven't answered, the
  // moment stays in pending_debrief and says so.

  /**
   * Run one debrief write under the moment+action lock.
   *
   * The `isBusy` check inside the lock is not redundant with the UI gate: the
   * gate can be stale by a frame, this cannot. If the key is already claimed the
   * second caller returns without touching state or the network.
   */
  function guarded<T>(
    momentId: string,
    action: Exclude<DebriefAction, 'idle'>,
    fn: () => Promise<T>,
  ): Promise<T | undefined> {
    const key = flightKey(momentId, action);
    if (flight.current.isBusy(key)) return Promise.resolve(undefined);
    return flight.current.run(key, fn);
  }

  /**
   * A write failed. If its outcome is genuinely unknown, open a new
   * reconciliation generation for the moment so this write gets its own
   * automatic attempt — independent of any earlier hydration that may have
   * already been attempted and failed.
   *
   * Called synchronously here rather than inside the state updater: updaters
   * must stay pure, and React may invoke them more than once.
   */
  function noteFailure(momentId: string, err: unknown) {
    if (isUncertainOutcome(err)) {
      reconciler.current.beginGeneration(momentId);
    }
  }

  async function approveForDebrief(moment: MomentOut) {
    const state = machineFor(moment);
    if (isBusy(state)) return;
    await guarded(moment.id, 'approving', async () => {
      updateMachine(moment.id, (s) => beginAction(s, 'approving'));
      setActingId(moment.id);
      setError(null);
      try {
        const updated = moment.status === 'approved'
          ? moment
          : await reviewMoment({ momentId: moment.id, status: 'approved' });
        setMoments((prev) =>
          prev.map((current) => (current.id === moment.id ? updated : current)),
        );
        updateMachine(moment.id, momentApproved);
        emitReviewEvent('review_decision', updated, { status: 'approved' });
      } catch (err) {
        noteFailure(moment.id, err);
        updateMachine(moment.id, (s) => applyFailure(s, err));
        setError(errorMessage(err, 'approve failed'));
      } finally {
        setActingId(null);
      }
    });
  }

  /**
   * Load this moment's authoritative question, drafting one only if nothing
   * relevant exists. An already-answered question reconciles the machine to
   * `answered` instead of presenting an empty answer box for a finished debrief.
   */
  async function loadQuestion(momentId: string) {
    const { machine } = getDebrief(momentId);
    if (!canRequestQuestion(machine)) return;
    await guarded(momentId, 'questioning', async () => {
      updateMachine(momentId, (s) => beginAction(s, 'questioning'));
      setError(null);
      try {
        const { question, answered } = await loadOrCreateMomentQuestion(momentId);
        patchDebrief(momentId, { question });
        updateMachine(momentId, (s) =>
          answered ? answerAccepted(questionReady(s, question.id)) : questionReady(s, question.id),
        );
      } catch (err) {
        noteFailure(momentId, err);
        updateMachine(momentId, (s) => applyFailure(s, err));
        setError(errorMessage(err, 'could not load the debrief question'));
      }
    });
  }

  /** Persist a reviewer's edit to the question text before the answer lands. */
  async function persistQuestionEdit(
    momentId: string,
    current: ElicitationQuestion,
    questionText: string,
  ): Promise<ElicitationQuestion> {
    const trimmed = questionText.trim();
    if (!trimmed || trimmed === current.question) return current;
    const updated = await editMomentQuestion({
      questionId: current.id,
      question: trimmed,
    });
    patchDebrief(momentId, { question: updated });
    return updated;
  }

  async function submitAnswer(momentId: string, questionText: string, answerText: string) {
    const { machine, question } = getDebrief(momentId);
    // The gate needs the text the panel currently holds.
    const staged = setDraftAnswer(machine, answerText);
    if (!question || !canSubmitTypedAnswer(staged)) return;
    await guarded(momentId, 'answering', async () => {
      updateMachine(momentId, (s) => beginAction(setDraftAnswer(s, answerText), 'answering'));
      setError(null);
      try {
        const current = await persistQuestionEdit(momentId, question, questionText);
        await submitExpertAnswer({
          questionId: current.id,
          transcript: answerText,
          approvedByExpert: true,
        });
        // Only now is the moment debriefed — the server stored a real answer.
        updateMachine(momentId, answerAccepted);
      } catch (err) {
        noteFailure(momentId, err);
        updateMachine(momentId, (s) => applyFailure(s, err));
        setError(errorMessage(err, 'could not save answer'));
      }
    });
  }

  async function submitAudioAnswer(
    momentId: string,
    questionText: string,
    audioUri: string,
  ): Promise<string | null> {
    const { machine, question } = getDebrief(momentId);
    if (!question || !canSubmitAudioAnswer(machine)) return null;
    const result = await guarded(momentId, 'answering', async () => {
      updateMachine(momentId, (s) => beginAction(s, 'answering'));
      setError(null);
      try {
        const current = await persistQuestionEdit(momentId, question, questionText);
        const answer = await submitExpertAudioAnswer({
          questionId: current.id,
          uri: audioUri,
          approvedByExpert: true,
        });
        updateMachine(momentId, answerAccepted);
        return answer.transcript;
      } catch (err) {
        noteFailure(momentId, err);
        updateMachine(momentId, (s) => applyFailure(s, err));
        setError(errorMessage(err, 'could not save voice answer'));
        throw err;
      }
    });
    return result ?? null;
  }

  async function compileDraft(momentId: string) {
    const { machine } = getDebrief(momentId);
    // Unlocked by a stored answer only.
    if (!canCompile(machine)) return;
    await guarded(momentId, 'compiling', async () => {
      updateMachine(momentId, (s) => beginAction(s, 'compiling'));
      setError(null);
      try {
        const moment = moments.find((item) => item.id === momentId);
        const trade = moment ? tradeForMoment(moment, recording) : recording?.trade ?? 'hvac';
        const draft = await compileMoment({ momentId, trade });
        patchDebrief(momentId, { draft });
        updateMachine(momentId, (s) =>
          draft.status === 'published' ? cardPublished(s) : draftCompiled(s),
        );
      } catch (err) {
        // Compile is not idempotent server-side, so a lost response must be
        // resolved by asking which card exists — never by compiling again.
        noteFailure(momentId, err);
        updateMachine(momentId, (s) => applyFailure(s, err));
        setError(errorMessage(err, 'could not compile draft'));
      }
    });
  }

  async function publishDraft(momentId: string) {
    const { machine, draft } = getDebrief(momentId);
    if (!draft || !canPublish(machine)) return;
    await guarded(momentId, 'publishing', async () => {
      updateMachine(momentId, (s) => beginAction(s, 'publishing'));
      setError(null);
      try {
        const checkedDraft = await requireSafetyReady(draft);
        patchDebrief(momentId, { draft: checkedDraft });
        await saveReviewChecklistForPublish({
          knowledgeObjectId: checkedDraft.id,
          reviewerId: recording?.user_id ?? null,
          evidenceChecked: true,
          safetyReviewed: true,
          noviceTrapClear: true,
          quizAnswerCorrect: true,
          approvedBy: recording?.user_id ?? null,
          notes: 'Mobile debrief publish path.',
        });
        const published = checkedDraft.status === 'published'
          ? checkedDraft
          : await publishKnowledgeObject(checkedDraft.id);
        patchDebrief(momentId, { draft: published });
        updateMachine(momentId, cardPublished);
        const moment = moments.find((item) => item.id === momentId);
        if (moment) {
          emitReviewEvent('card_published', moment, {
            knowledge_object_id: published.id,
            path: 'debrief',
          });
        }
      } catch (err) {
        noteFailure(momentId, err);
        updateMachine(momentId, (s) => applyFailure(s, err));
        setError(errorMessage(err, 'publish failed'));
      }
    });
  }

  async function requestSourceRedaction() {
    if (!recording) return;
    const reason = 'Mobile reviewer requested source recording redaction.';
    setActingId(recording.id);
    setError(null);
    try {
      const updated = await requestRecordingRedaction({
        recordingId: recording.id,
        reason,
        requestedBy: recording.user_id,
      });
      setRecording(updated);
      setMoments([]);
      void logJobEvent({
        eventType: 'recording_redaction_requested',
        actorId: updated.redaction_requested_by ?? recording.user_id,
        jobId: updated.job_id,
        recordingId: updated.id,
        payload: {
          reason: updated.redaction_reason ?? reason,
          redaction_state: updated.redaction_state,
        },
      }).catch(() => {
        // Redaction request succeeded; telemetry must not roll it back.
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'redaction request failed');
    } finally {
      setActingId(null);
    }
  }

  function confirmSourceRedaction() {
    Alert.alert(
      'Request source redaction?',
      'This locks review and publishing for this recording until an admin resolves the redaction.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request redaction',
          style: 'destructive',
          onPress: () => void requestSourceRedaction(),
        },
      ],
    );
  }

  const status = queueMode ? 'ready' : recording?.status ?? 'loading';
  const ready = status === 'ready';
  const redactionState = recording?.redaction_state ?? 'none';
  const redactionBlocked = redactionState !== 'none';
  const consentBlocked = recording?.consent_state === 'do_not_share';
  const reviewBlocked = Boolean(recording && (redactionBlocked || consentBlocked));
  const visibleMoments = reviewBlocked ? [] : moments;

  return (
    <ActAppShell
      mode="Review"
      rightLabel="Training"
      rightMuted
      onRightPress={() => navigation.navigate('Learn', undefined)}
      onMenuPress={() =>
        navigation.canGoBack()
          ? navigation.goBack()
          : navigation.navigate('CaptureJob')
      }
    >
      <ActCard style={styles.summary}>
        <View style={styles.summaryTop}>
          <ActText variant="label" color="textMuted">
            {queueMode ? 'Review queue' : 'Recording'}
          </ActText>
          <ActText variant="bodyStrong" mono style={styles.recordingId}>
            {recordingId ? recordingId.slice(0, 8) : `${moments.length} ready`}
          </ActText>
          <ActPill label={formatStatus(status)} tone={ready ? 'ok' : 'warn'} />
        </View>
        <ActText variant="small" color="textMuted">
          Approve a moment, then debrief the expert — generate the question, capture the
          answer, compile, and publish into Apprentice Training. The debrief always happens
          after the job, never in the tech&apos;s ear.
        </ActText>
        {recording ? (
          <View style={styles.trustRow}>
            <ActPill
              label={`Consent · ${formatConsent(recording.consent_state)}`}
              tone={consentBlocked ? 'err' : 'neutral'}
              dot
            />
            <ActPill
              label={`Redaction · ${formatRedaction(redactionState)}`}
              tone={redactionBlocked ? 'err' : 'neutral'}
              dot
            />
          </View>
        ) : null}
        {recording?.job_id ? (
          <ActButton
            label="Log job outcome"
            variant="secondary"
            onPress={() =>
              navigation.navigate('PilotOutcome', {
                jobId: recording.job_id,
                recordedBy: recording.user_id,
                sourceRecordingId: recording.id,
              })
            }
          />
        ) : null}
        {recording && !redactionBlocked ? (
          <ActButton
            label={
              actingId === recording.id ? 'Requesting redaction' : 'Request source redaction'
            }
            variant="danger"
            disabled={actingId === recording.id}
            onPress={confirmSourceRedaction}
          />
        ) : null}
      </ActCard>

      {error ? (
        <ActCard tone="err" accent="err" style={styles.outer}>
          <ActText variant="label" color="error">
            Action failed
          </ActText>
          <ActText variant="small" color="error" weight="medium" style={styles.gapTiny}>
            {error}
          </ActText>
        </ActCard>
      ) : null}

      {reviewBlocked ? (
        <ActCard tone="err" accent="err" style={styles.outer}>
          <View style={styles.lockRow}>
            <View style={styles.lockGlyph}>
              <ActText variant="label" mono style={styles.lockGlyphText}>
                !
              </ActText>
            </View>
            <ActText variant="label" color="error">
              Review locked
            </ActText>
          </View>
          <ActText variant="small" color="error" weight="semibold" style={styles.gapTiny}>
            {redactionBlocked
              ? `Recording redaction is ${formatRedaction(redactionState).toLowerCase()}.`
              : 'Recording consent is do not share.'}
          </ActText>
          {recording?.redaction_reason ? (
            <ActText variant="small" color="error">
              {recording.redaction_reason}
            </ActText>
          ) : null}
        </ActCard>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visibleMoments}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void refresh();
              }}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <ActEmptyState
              tone={reviewBlocked ? 'err' : 'neutral'}
              title={
                reviewBlocked
                  ? 'Recording blocked'
                  : ready
                    ? 'No proposed moments yet'
                    : 'Processing not finished'
              }
              body={
                reviewBlocked
                  ? 'Consent or redaction state prevents review and publishing.'
                  : ready
                    ? 'Pull to refresh after the backend finishes proposing moments.'
                    : 'Pull to refresh when the recording reaches ready.'
              }
            />
          }
          renderItem={({ item }) => {
            const debrief = getDebrief(item.id);
            const voiceOpen = voiceMomentId === item.id;
            // Seeded in refresh(), so this is the single source of truth for
            // the moment — including any answer text mid-edit.
            const machine = debrief.machine;
            return (
              <View style={styles.cardWrap}>
                <ReviewMomentCard
                  moment={item}
                  busy={actingId === item.id}
                  debriefState={machine}
                  debriefQuestion={debrief.question}
                  debriefDraft={debrief.draft}
                  onApprove={() => void approveForDebrief(item)}
                  onReject={() => void actOnMoment(item.id, 'rejected')}
                  onNeedsInfo={() => void actOnMoment(item.id, 'needs_more_info')}
                  onOpenCard={(card) => navigation.navigate('Learn', { card, cardId: card.id })}
                  voiceDebriefOpen={voiceOpen}
                  onToggleVoiceDebrief={() => setVoiceMomentId(voiceOpen ? null : item.id)}
                  onVoiceDebriefComplete={() => {
                    // The agent's "complete" is a local claim. Hydrate and let
                    // the server decide whether this moment is really answered —
                    // the same path a cold reload takes.
                    setVoiceMomentId(null);
                    void hydrate([item]);
                  }}
                  onDraftAnswerChange={(text) =>
                    updateMachine(item.id, (s) => setDraftAnswer(s, text))
                  }
                  onRetrySync={() => retryMoment(item.id)}
                  onLoadQuestion={() => void loadQuestion(item.id)}
                  onSubmitAnswer={(question, answer) => void submitAnswer(item.id, question, answer)}
                  onSubmitAudioAnswer={(question, audioUri) =>
                    submitAudioAnswer(item.id, question, audioUri)
                  }
                  onCompileDraft={() => void compileDraft(item.id)}
                  onPublishDraft={() => void publishDraft(item.id)}
                />
              </View>
            );
          }}
        />
      )}
    </ActAppShell>
  );
}

function formatStatus(status: string): string {
  if (status === 'ready') return 'Ready for review';
  if (status === 'processing') return 'Processing';
  if (status === 'uploaded') return 'Uploaded';
  if (status === 'failed') return 'Failed';
  if (status === 'pending') return 'Pending upload';
  return status;
}

function formatConsent(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatRedaction(value: string): string {
  if (value === 'none') return 'Clear';
  return formatConsent(value);
}

function tradeForMoment(moment: MomentOut, recording: RecordingOut | null): string {
  return recording?.trade ?? (moment as Partial<ReviewQueueItem>).trade ?? 'hvac';
}

async function saveReviewChecklistForPublish(input: {
  knowledgeObjectId: string;
  reviewerId?: string | null;
  evidenceChecked?: boolean;
  safetyReviewed?: boolean;
  noviceTrapClear?: boolean;
  quizAnswerCorrect?: boolean;
  approvedBy?: string | null;
  notes?: string | null;
}) {
  await upsertReviewChecklist(input);
}

async function requireSafetyReady(card: KnowledgeObject): Promise<KnowledgeObject> {
  const checked = await safetyCheckKnowledgeObject(card.id);
  if (checked.safety_recommendation !== 'ready') {
    const risk = checked.safety_risk ? ` (${checked.safety_risk})` : '';
    throw new Error(
      `Safety review blocked publishing${risk}. Edit the card and run review again.`,
    );
  }
  return checked;
}

const styles = StyleSheet.create({
  summary: { margin: spacing.lg, gap: spacing.sm },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  recordingId: { flex: 1 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  outer: { marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: 3 },
  gapTiny: { marginTop: 2 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lockGlyph: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockGlyphText: { color: '#FFFFFF', fontSize: 12, letterSpacing: 0 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  cardWrap: { gap: spacing.sm },
});
