import React, { useCallback, useEffect, useState } from 'react';
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
  generateMomentQuestion,
  publishKnowledgeObject,
  safetyCheckKnowledgeObject,
  submitExpertAudioAnswer,
  submitExpertAnswer,
  upsertReviewChecklist,
} from '../api/libraryApi';
import type { ElicitationQuestion, KnowledgeObject } from '../api/libraryApi';
import type { PilotStackParamList } from '../navigation/PilotNavigator';
import ActAppShell from '../components/ActAppShell';
import ReviewMomentCard from '../components/ReviewMomentCard';
import type { DebriefStep } from '../components/ReviewDebriefPanel';
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

/** Per-moment state for the post-job debrief loop. */
type DebriefState = {
  question: ElicitationQuestion | null;
  draft: KnowledgeObject | null;
  busyStep: DebriefStep;
  published: boolean;
  answered: boolean;
  voiceComplete: boolean;
};

const EMPTY_DEBRIEF: DebriefState = {
  question: null,
  draft: null,
  busyStep: 'idle',
  published: false,
  answered: false,
  voiceComplete: false,
};

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
  const [debriefs, setDebriefs] = useState<Record<string, DebriefState>>({});
  // Which approved moment has the voice debrief agent open (one at a time).
  const [voiceMomentId, setVoiceMomentId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      if (recordingId) {
        const detail = await getRecording(recordingId);
        setRecording(detail.recording);
        const nextMoments = await listRecordingMoments({ recordingId });
        setMoments(nextMoments);
      } else {
        setRecording(null);
        const nextMoments = await listReviewQueue({ status: 'proposed', trade: 'hvac', limit: 50 });
        setMoments(nextMoments);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'review load failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recordingId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function getDebrief(momentId: string): DebriefState {
    return debriefs[momentId] ?? EMPTY_DEBRIEF;
  }

  function patchDebrief(momentId: string, patch: Partial<DebriefState>) {
    setDebriefs((prev) => ({
      ...prev,
      [momentId]: { ...(prev[momentId] ?? EMPTY_DEBRIEF), ...patch },
    }));
  }

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

  // --- Debrief loop (approve -> question -> answer -> draft -> publish) -------
  async function approveForDebrief(moment: MomentOut) {
    setActingId(moment.id);
    setError(null);
    try {
      const updated = moment.status === 'approved'
        ? moment
        : await reviewMoment({ momentId: moment.id, status: 'approved' });
      setMoments((prev) =>
        prev.map((current) => (current.id === moment.id ? updated : current)),
      );
      emitReviewEvent('review_decision', updated, { status: 'approved' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'approve failed');
    } finally {
      setActingId(null);
    }
  }

  async function generateQuestion(momentId: string) {
    patchDebrief(momentId, { busyStep: 'questioning' });
    setError(null);
    try {
      const question = await generateMomentQuestion(momentId);
      patchDebrief(momentId, {
        question,
        busyStep: 'idle',
        answered: false,
        voiceComplete: false,
        draft: null,
        published: false,
      });
    } catch (err) {
      patchDebrief(momentId, { busyStep: 'idle' });
      setError(err instanceof Error ? err.message : 'could not generate question');
    }
  }

  async function submitAnswer(momentId: string, questionText: string, answerText: string) {
    const state = getDebrief(momentId);
    if (!state.question) {
      setError('Generate a question before saving an answer.');
      return;
    }
    patchDebrief(momentId, { busyStep: 'answering' });
    setError(null);
    try {
      const trimmedQuestion = questionText.trim();
      let question = state.question;
      if (trimmedQuestion && trimmedQuestion !== state.question.question) {
        question = await editMomentQuestion({
          questionId: state.question.id,
          question: trimmedQuestion,
        });
        patchDebrief(momentId, { question });
      }
      await submitExpertAnswer({
        questionId: question.id,
        transcript: answerText,
        approvedByExpert: true,
        expertUserId: recording?.user_id ?? null,
      });
      patchDebrief(momentId, {
        busyStep: 'idle',
        answered: true,
        draft: null,
        published: false,
      });
    } catch (err) {
      patchDebrief(momentId, { busyStep: 'idle' });
      setError(err instanceof Error ? err.message : 'could not save answer');
    }
  }

  async function submitAudioAnswer(
    momentId: string,
    questionText: string,
    audioUri: string,
  ): Promise<string | null> {
    const state = getDebrief(momentId);
    if (!state.question) {
      setError('Generate a question before saving an answer.');
      return null;
    }
    patchDebrief(momentId, { busyStep: 'answering' });
    setError(null);
    try {
      const trimmedQuestion = questionText.trim();
      let question = state.question;
      if (trimmedQuestion && trimmedQuestion !== state.question.question) {
        question = await editMomentQuestion({
          questionId: state.question.id,
          question: trimmedQuestion,
        });
        patchDebrief(momentId, { question });
      }
      const answer = await submitExpertAudioAnswer({
        questionId: question.id,
        uri: audioUri,
        approvedByExpert: true,
        expertUserId: recording?.user_id ?? null,
      });
      patchDebrief(momentId, {
        busyStep: 'idle',
        answered: true,
        draft: null,
        published: false,
      });
      return answer.transcript;
    } catch (err) {
      patchDebrief(momentId, { busyStep: 'idle' });
      const message = err instanceof Error ? err.message : 'could not save voice answer';
      setError(message);
      throw err;
    }
  }

  async function compileDraft(momentId: string) {
    const state = getDebrief(momentId);
    if (!state.answered && !state.voiceComplete) {
      setError('Save the expert answer before compiling a draft.');
      return;
    }
    patchDebrief(momentId, { busyStep: 'drafting' });
    setError(null);
    try {
      const moment = moments.find((item) => item.id === momentId);
      const trade = moment ? tradeForMoment(moment, recording) : recording?.trade ?? 'hvac';
      const draft = await compileMoment({ momentId, trade });
      patchDebrief(momentId, {
        draft,
        published: draft.status === 'published',
        busyStep: 'idle',
      });
    } catch (err) {
      patchDebrief(momentId, { busyStep: 'idle' });
      setError(err instanceof Error ? err.message : 'could not compile draft');
    }
  }

  async function publishDraft(momentId: string) {
    const state = getDebrief(momentId);
    if (!state.draft) {
      setError('Compile a draft before publishing.');
      return;
    }
    patchDebrief(momentId, { busyStep: 'publishing' });
    setError(null);
    try {
      const checkedDraft = await requireSafetyReady(state.draft);
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
      patchDebrief(momentId, { draft: published, published: true, busyStep: 'idle' });
      const moment = moments.find((item) => item.id === momentId);
      if (moment) {
        emitReviewEvent('card_published', moment, {
          knowledge_object_id: published.id,
          path: 'debrief',
        });
      }
    } catch (err) {
      patchDebrief(momentId, { busyStep: 'idle' });
      setError(err instanceof Error ? err.message : 'publish failed');
    }
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
            return (
              <View style={styles.cardWrap}>
                <ReviewMomentCard
                  moment={item}
                  busy={actingId === item.id}
                  debriefQuestion={debrief.question}
                  debriefDraft={debrief.draft}
                  debriefBusyStep={debrief.busyStep}
                  debriefPublished={debrief.published}
                  debriefAnswered={debrief.answered}
                  debriefVoiceComplete={debrief.voiceComplete}
                  onApprove={() => void approveForDebrief(item)}
                  onReject={() => void actOnMoment(item.id, 'rejected')}
                  onNeedsInfo={() => void actOnMoment(item.id, 'needs_more_info')}
                  onOpenCard={(card) => navigation.navigate('Learn', { card, cardId: card.id })}
                  voiceDebriefOpen={voiceOpen}
                  expertUserId={recording?.user_id ?? null}
                  onToggleVoiceDebrief={() => setVoiceMomentId(voiceOpen ? null : item.id)}
                  onVoiceDebriefComplete={() => {
                    patchDebrief(item.id, {
                      answered: true,
                      voiceComplete: true,
                      draft: null,
                      published: false,
                      busyStep: 'idle',
                    });
                    setVoiceMomentId(null);
                    if (recordingId) {
                      void refresh();
                    }
                  }}
                  onGenerateQuestion={() => void generateQuestion(item.id)}
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
