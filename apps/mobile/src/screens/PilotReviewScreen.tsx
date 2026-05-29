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
import type { KnowledgeObject } from '../api/libraryApi';
import type { PilotStackParamList } from '../navigation/PilotNavigator';
import { colors } from '../theme/colors';

type NavProp = NativeStackNavigationProp<PilotStackParamList>;
type ReviewRoute = RouteProp<PilotStackParamList, 'PilotReview'>;
type PublishStage = 'approving' | 'answering' | 'drafting' | 'publishing';

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

  const status = recording?.status ?? 'loading';
  const ready = status === 'ready';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            navigation.canGoBack()
              ? navigation.goBack()
              : navigation.navigate('CaptureJob')
          }
          hitSlop={12}
        >
          <Text style={styles.headerBack}>‹ Capture</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Review Moments</Text>
        <Pressable onPress={() => navigation.navigate('Learn', undefined)} hitSlop={12}>
          <Text style={styles.headerAction}>Training</Text>
        </Pressable>
      </View>

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
        <Text style={styles.summaryHelp}>Approve + publish sends reviewed moments into Apprentice Training.</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

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
          renderItem={({ item }) => (
            <MomentCard
              moment={item}
              busy={actingId === item.id}
              publishStage={publishStages[item.id]}
              publishedCard={publishedCards[item.id]}
              onApproveAndPublish={() => void approveAndPublish(item)}
              onOpenCard={(card) => navigation.navigate('Learn', { card, cardId: card.id })}
              onReject={() => void actOnMoment(item.id, 'rejected')}
              onNeedsInfo={() => void actOnMoment(item.id, 'needs_more_info')}
            />
          )}
        />
      )}
    </View>
  );
}

function MomentCard({
  moment,
  busy,
  publishStage,
  publishedCard,
  onApproveAndPublish,
  onOpenCard,
  onReject,
  onNeedsInfo,
}: {
  moment: MomentOut;
  busy: boolean;
  publishStage?: PublishStage;
  publishedCard?: KnowledgeObject;
  onApproveAndPublish: () => void;
  onOpenCard: (card: KnowledgeObject) => void;
  onReject: () => void;
  onNeedsInfo: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.cardTitle}>{humanizeMomentType(moment.moment_type)}</Text>
          <Text style={styles.cardTime}>
            {formatTimestamp(moment.start_s)}-{formatTimestamp(moment.end_s)}
          </Text>
        </View>
        <View style={styles.scorePill}>
          <Text style={styles.scoreText}>{Math.round(moment.score)}</Text>
        </View>
      </View>

      {moment.why_it_matters && (
        <Text style={styles.cardBody}>{moment.why_it_matters}</Text>
      )}

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Text style={styles.metaText}>{moment.status}</Text>
        </View>
        {moment.do_not_interrupt && (
          <View style={[styles.metaPill, styles.warnPill]}>
            <Text style={[styles.metaText, styles.warnText]}>post-job only</Text>
          </View>
        )}
        {publishedCard && (
          <View style={[styles.metaPill, styles.publishedPill]}>
            <Text style={[styles.metaText, styles.publishedText]}>published</Text>
          </View>
        )}
      </View>

      {publishedCard && (
        <Pressable
          style={({ pressed }) => [styles.publishedBand, pressed && styles.pressed]}
          onPress={() => onOpenCard(publishedCard)}
        >
          <Text style={styles.publishedBandLabel}>Apprentice card</Text>
          <Text style={styles.publishedBandTitle}>{publishedCard.title}</Text>
        </Pressable>
      )}

      <View style={styles.actionRow}>
        <Pressable
          disabled={busy}
          style={({ pressed }) => [
            styles.actionButton,
            styles.approveButton,
            styles.approveActionButton,
            pressed && styles.pressed,
            busy && styles.disabled,
          ]}
          onPress={() => (publishedCard ? onOpenCard(publishedCard) : onApproveAndPublish())}
        >
          <Text numberOfLines={1} style={styles.approveText}>
            {publishedCard
              ? 'Open card'
              : busy
                ? formatPublishStage(publishStage)
                : 'Approve + publish'}
          </Text>
        </Pressable>
        <Pressable
          disabled={busy || !!publishedCard}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.pressed,
            (busy || !!publishedCard) && styles.disabled,
          ]}
          onPress={onNeedsInfo}
        >
          <Text style={styles.actionText}>Follow-up</Text>
        </Pressable>
        <Pressable
          disabled={busy || !!publishedCard}
          style={({ pressed }) => [
            styles.actionButton,
            styles.rejectButton,
            pressed && styles.pressed,
            (busy || !!publishedCard) && styles.disabled,
          ]}
          onPress={onReject}
        >
          <Text style={styles.rejectText}>Reject</Text>
        </Pressable>
      </View>
    </View>
  );
}

function formatPublishStage(stage: PublishStage | undefined): string {
  if (stage === 'approving') return 'Approving';
  if (stage === 'answering') return 'Adding answer';
  if (stage === 'drafting') return 'Drafting card';
  if (stage === 'publishing') return 'Publishing';
  return 'Saving';
}

function humanizeMomentType(value: string): string {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatStatus(status: string): string {
  if (status === 'ready') return 'Ready for review';
  if (status === 'processing') return 'Processing';
  if (status === 'uploaded') return 'Uploaded';
  if (status === 'failed') return 'Failed';
  if (status === 'pending') return 'Pending upload';
  return status;
}

function formatTimestamp(seconds: number): string {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const ss = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mm}:${ss}`;
}

function buildExpertAnswer(moment: MomentOut): string {
  const parts = [
    `Moment: ${humanizeMomentType(moment.moment_type)} from ${formatTimestamp(moment.start_s)} to ${formatTimestamp(moment.end_s)}.`,
    moment.why_it_matters ? `Why it matters: ${moment.why_it_matters}` : null,
    summarizeEvidence(moment.evidence_json),
  ].filter(Boolean);
  return parts.join('\n');
}

function summarizeEvidence(evidence: MomentOut['evidence_json']): string | null {
  if (!evidence) return null;
  if (typeof evidence === 'string') {
    return evidence.trim() ? `Evidence: ${evidence.slice(0, 700)}` : null;
  }
  const entries = Object.entries(evidence)
    .map(([key, value]) => `${key}: ${formatEvidenceValue(value)}`)
    .filter((entry) => entry.length > 0)
    .slice(0, 6);
  return entries.length > 0 ? `Evidence: ${entries.join('; ')}` : null;
}

function formatEvidenceValue(value: unknown): string {
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBack: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  headerAction: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
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
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  recordingId: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    flex: 1,
  },
  summaryHelp: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
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
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },
  statusReadyText: {
    color: '#065F46',
  },
  statusPendingText: {
    color: '#92400E',
  },
  errorBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 16,
    fontWeight: '900',
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  cardTime: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  scorePill: {
    minWidth: 42,
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  cardBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  warnPill: {
    backgroundColor: '#FEF3C7',
  },
  warnText: {
    color: '#92400E',
  },
  publishedPill: {
    backgroundColor: colors.successLight,
  },
  publishedText: {
    color: '#065F46',
  },
  publishedBand: {
    borderRadius: 8,
    backgroundColor: colors.successLight,
    padding: 12,
    gap: 3,
  },
  publishedBandLabel: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  publishedBandTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minHeight: 42,
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  approveButton: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  approveActionButton: {
    flex: 1.35,
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  actionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  approveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  rejectText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.76,
  },
  disabled: {
    opacity: 0.54,
  },
});
