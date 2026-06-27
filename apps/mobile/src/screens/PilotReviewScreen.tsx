import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
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
import DebriefVoiceAgent from '../components/DebriefVoiceAgent';
import type { DebriefStep } from '../components/ReviewDebriefPanel';
import { colors } from '../theme/colors';
import { fonts, labelStyle } from '../theme/typography';

type NavProp = NativeStackNavigationProp<PilotStackParamList>;
type ReviewRoute = RouteProp<PilotStackParamList, 'PilotReview'>;

/** Per-moment state for the post-job debrief loop. */
type DebriefState = {
  question: ElicitationQuestion | null;
  draft: KnowledgeObject | null;
  busyStep: DebriefStep;
  published: boolean;
};

const EMPTY_DEBRIEF: DebriefState = {
  question: null,
  draft: null,
  busyStep: 'idle',
  published: false,
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
      patchDebrief(momentId, { question, busyStep: 'idle' });
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
      patchDebrief(momentId, { busyStep: 'idle' });
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
      patchDebrief(momentId, { busyStep: 'idle' });
      return answer.transcript;
    } catch (err) {
      patchDebrief(momentId, { busyStep: 'idle' });
      const message = err instanceof Error ? err.message : 'could not save voice answer';
      setError(message);
      throw err;
    }
  }

  async function compileDraft(momentId: string) {
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

  const status = queueMode ? 'ready' : recording?.status ?? 'loading';
  const ready = status === 'ready';

  return (
    <ActAppShell
      mode="Review"
      rightLabel="Training"
      onRightPress={() => navigation.navigate('Learn', undefined)}
      onMenuPress={() =>
        navigation.canGoBack()
          ? navigation.goBack()
          : navigation.navigate('CaptureJob')
      }
    >
      <View style={styles.summary}>
        <View style={styles.summaryTop}>
          <Text style={styles.summaryLabel}>{queueMode ? 'Review queue' : 'Recording'}</Text>
          <Text style={styles.recordingId}>
            {recordingId ? recordingId.slice(0, 8) : `${moments.length} ready`}
          </Text>
          <View style={[styles.statusPill, ready ? styles.statusReady : styles.statusPending]}>
            <Text style={[styles.statusText, ready ? styles.statusReadyText : styles.statusPendingText]}>
              {formatStatus(status)}
            </Text>
          </View>
        </View>
        <Text style={styles.summaryHelp}>
          Approve a moment, then debrief the expert — generate the question, capture
          the answer, compile, and publish into Apprentice Training. The debrief always
          happens after the job, never in the tech&rsquo;s ear.
        </Text>
        {recording?.job_id ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.outcomeLink, pressed && styles.pressed]}
            onPress={() =>
              navigation.navigate('PilotOutcome', {
                jobId: recording.job_id,
                recordedBy: recording.user_id,
                sourceRecordingId: recording.id,
              })
            }
          >
            <Text style={styles.outcomeLinkText}>Log job outcome</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorLabel}>Action failed</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={moments}
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
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {ready ? 'No proposed moments yet' : 'Processing not finished'}
              </Text>
              <Text style={styles.emptyBody}>
                {ready
                  ? 'Pull to refresh after the backend finishes proposing moments.'
                  : 'Pull to refresh when the recording reaches ready.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const debrief = getDebrief(item.id);
            const approved = item.status === 'approved';
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
                  onApprove={() => void approveForDebrief(item)}
                  onReject={() => void actOnMoment(item.id, 'rejected')}
                  onNeedsInfo={() => void actOnMoment(item.id, 'needs_more_info')}
                  onOpenCard={(card) => navigation.navigate('Learn', { card, cardId: card.id })}
                  onGenerateQuestion={() => void generateQuestion(item.id)}
                  onSubmitAnswer={(question, answer) => void submitAnswer(item.id, question, answer)}
                  onSubmitAudioAnswer={(question, audioUri) =>
                    submitAudioAnswer(item.id, question, audioUri)
                  }
                  onCompileDraft={() => void compileDraft(item.id)}
                  onPublishDraft={() => void publishDraft(item.id)}
                />
                {approved && !debrief.published ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setVoiceMomentId(voiceOpen ? null : item.id)}
                    style={({ pressed }) => [styles.voiceToggle, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.voiceToggleText}>
                      {voiceOpen ? 'Hide voice debrief' : '🎙 Run voice debrief instead'}
                    </Text>
                  </Pressable>
                ) : null}
                {approved && voiceOpen ? (
                  <DebriefVoiceAgent
                    momentId={item.id}
                    expertUserId={recording?.user_id ?? null}
                    onComplete={() => void refresh()}
                  />
                ) : null}
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
  summary: {
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 8,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryLabel: {
    ...labelStyle,
    color: colors.textMuted,
    fontSize: 11,
  },
  recordingId: {
    color: colors.text,
    fontFamily: fonts.monoSemibold,
    fontSize: 15,
    flex: 1,
  },
  summaryHelp: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  outcomeLink: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  outcomeLinkText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusReady: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  statusPending: {
    backgroundColor: colors.cautionLight,
    borderColor: colors.caution,
  },
  statusText: {
    ...labelStyle,
    fontSize: 10,
  },
  statusReadyText: { color: '#065F46' },
  statusPendingText: { color: '#92400E' },
  errorBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
    padding: 12,
    gap: 3,
  },
  errorLabel: {
    ...labelStyle,
    color: colors.error,
    fontSize: 10,
  },
  errorText: {
    color: '#7A1212',
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  cardWrap: {
    gap: 8,
  },
  voiceToggle: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceToggleText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  empty: {
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  emptyBody: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  pressed: { opacity: 0.76 },
});
