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
  listRecordingMoments,
  reviewMoment,
} from '../api/captureApi';
import type { MomentOut, RecordingOut } from '../api/captureApi';
import {
  compileMoment,
  generateMomentQuestion,
  publishKnowledgeObject,
  submitExpertAnswer,
} from '../api/libraryApi';
import type { ElicitationQuestion, KnowledgeObject } from '../api/libraryApi';
import type { PilotStackParamList } from '../navigation/PilotNavigator';
import ActAppShell from '../components/ActAppShell';
import ReviewMomentCard from '../components/ReviewMomentCard';
import type { DebriefStep } from '../components/ReviewDebriefPanel';
import { colors } from '../theme/colors';
import { fonts, labelStyle } from '../theme/typography';

type NavProp = NativeStackNavigationProp<PilotStackParamList>;
type ReviewRoute = RouteProp<PilotStackParamList, 'PilotReview'>;
type PublishStage = 'approving' | 'answering' | 'drafting' | 'publishing';

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
  const { recordingId } = route.params;
  const [recording, setRecording] = useState<RecordingOut | null>(null);
  const [moments, setMoments] = useState<MomentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [publishedCards, setPublishedCards] = useState<Record<string, KnowledgeObject>>({});
  const [publishStages, setPublishStages] = useState<Record<string, PublishStage>>({});
  const [debriefs, setDebriefs] = useState<Record<string, DebriefState>>({});

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const detail = await getRecording(recordingId);
      setRecording(detail.recording);
      const nextMoments = await listRecordingMoments({ recordingId });
      setMoments(nextMoments);
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

  // --- PRESERVED: review status actions (approve / reject / needs_more_info) -
  async function actOnMoment(
    momentId: string,
    status: 'approved' | 'rejected' | 'needs_more_info',
  ) {
    setActingId(momentId);
    setError(null);
    try {
      const updated = await reviewMoment({ momentId, status });
      setMoments((prev) =>
        prev.map((moment) => (moment.id === momentId ? updated : moment)),
      );
      if (status !== 'approved') {
        setPublishedCards((prev) => {
          const next = { ...prev };
          delete next[momentId];
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'review action failed');
    } finally {
      setActingId(null);
    }
  }

  // --- PRESERVED: one-tap approve + publish fallback path --------------------
  async function approveAndPublish(moment: MomentOut) {
    setActingId(moment.id);
    setError(null);
    try {
      setPublishStage(moment.id, 'approving');
      const approvedMoment = moment.status === 'approved'
        ? moment
        : await reviewMoment({ momentId: moment.id, status: 'approved' });
      setMoments((prev) =>
        prev.map((current) => (current.id === moment.id ? approvedMoment : current)),
      );

      const trade = recording?.trade ?? 'hvac';
      setPublishStage(moment.id, 'drafting');
      let card: KnowledgeObject;
      try {
        card = await compileMoment({ momentId: moment.id, trade });
      } catch (compileError) {
        const transcript = buildExpertAnswer(approvedMoment);
        if (!transcript) throw compileError;
        setPublishStage(moment.id, 'answering');
        const question = await generateMomentQuestion(moment.id);
        await submitExpertAnswer({
          questionId: question.id,
          transcript,
          approvedByExpert: true,
          expertUserId: recording?.user_id ?? approvedMoment.reviewer_id,
        });
        setPublishStage(moment.id, 'drafting');
        card = await compileMoment({ momentId: moment.id, trade });
      }

      setPublishStage(moment.id, 'publishing');
      const published = card.status === 'published'
        ? card
        : await publishKnowledgeObject(card.id);
      setPublishedCards((prev) => ({ ...prev, [moment.id]: published }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'publish failed');
    } finally {
      setActingId(null);
      setPublishStage(moment.id, undefined);
    }
  }

  function setPublishStage(momentId: string, stage: PublishStage | undefined) {
    setPublishStages((prev) => {
      const next = { ...prev };
      if (stage) next[momentId] = stage;
      else delete next[momentId];
      return next;
    });
  }

  // --- NEW: debrief loop (approve -> question -> answer -> draft -> publish) --
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

  async function submitAnswer(momentId: string, answerText: string) {
    const state = getDebrief(momentId);
    if (!state.question) {
      setError('Generate a question before saving an answer.');
      return;
    }
    patchDebrief(momentId, { busyStep: 'answering' });
    setError(null);
    try {
      await submitExpertAnswer({
        questionId: state.question.id,
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

  async function compileDraft(momentId: string) {
    patchDebrief(momentId, { busyStep: 'drafting' });
    setError(null);
    try {
      const trade = recording?.trade ?? 'hvac';
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
      const published = state.draft.status === 'published'
        ? state.draft
        : await publishKnowledgeObject(state.draft.id);
      patchDebrief(momentId, { draft: published, published: true, busyStep: 'idle' });
    } catch (err) {
      patchDebrief(momentId, { busyStep: 'idle' });
      setError(err instanceof Error ? err.message : 'publish failed');
    }
  }

  const status = recording?.status ?? 'loading';
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
          <Text style={styles.summaryLabel}>Recording</Text>
          <Text style={styles.recordingId}>{recordingId.slice(0, 8)}</Text>
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
            return (
              <ReviewMomentCard
                moment={item}
                busy={actingId === item.id}
                publishStageLabel={formatPublishStage(publishStages[item.id])}
                publishedCard={publishedCards[item.id]}
                debriefQuestion={debrief.question}
                debriefDraft={debrief.draft}
                debriefBusyStep={debrief.busyStep}
                debriefPublished={debrief.published}
                onApproveAndPublish={() => void approveAndPublish(item)}
                onApprove={() => void approveForDebrief(item)}
                onReject={() => void actOnMoment(item.id, 'rejected')}
                onNeedsInfo={() => void actOnMoment(item.id, 'needs_more_info')}
                onOpenCard={(card) => navigation.navigate('Learn', { card, cardId: card.id })}
                onGenerateQuestion={() => void generateQuestion(item.id)}
                onSubmitAnswer={(_question, answer) => void submitAnswer(item.id, answer)}
                onCompileDraft={() => void compileDraft(item.id)}
                onPublishDraft={() => void publishDraft(item.id)}
              />
            );
          }}
        />
      )}
    </ActAppShell>
  );
}

function formatPublishStage(stage: PublishStage | undefined): string {
  if (stage === 'approving') return 'Approving';
  if (stage === 'answering') return 'Adding answer';
  if (stage === 'drafting') return 'Drafting card';
  if (stage === 'publishing') return 'Publishing';
  return 'Saving';
}

function formatStatus(status: string): string {
  if (status === 'ready') return 'Ready for review';
  if (status === 'processing') return 'Processing';
  if (status === 'uploaded') return 'Uploaded';
  if (status === 'failed') return 'Failed';
  if (status === 'pending') return 'Pending upload';
  return status;
}

/**
 * Fallback expert-answer text used only by the one-tap approve+publish path
 * when the backend needs a question answered before it will compile. The
 * debrief loop uses the reviewer's typed answer instead.
 */
function buildExpertAnswer(moment: MomentOut): string {
  const parts = [
    `Moment: ${humanizeType(moment.moment_type)} from ${fmt(moment.start_s)} to ${fmt(moment.end_s)}.`,
    moment.why_it_matters ? `Why it matters: ${moment.why_it_matters}` : null,
    summarizeEvidenceText(moment.evidence_json),
  ].filter(Boolean);
  return parts.join('\n');
}

function humanizeType(value: string): string {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function fmt(seconds: number): string {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function summarizeEvidenceText(evidence: MomentOut['evidence_json']): string | null {
  if (!evidence) return null;
  if (typeof evidence === 'string') {
    return evidence.trim() ? `Evidence: ${evidence.slice(0, 700)}` : null;
  }
  const entries = Object.entries(evidence)
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .filter((entry) => entry.length > 0)
    .slice(0, 6);
  return entries.length > 0 ? `Evidence: ${entries.join('; ')}` : null;
}

function formatValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value).slice(0, 180);
  } catch {
    return String(value);
  }
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
