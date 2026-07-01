/**
 * Learn — apprentice library on mobile.
 *
 * Lists published knowledge objects from the act-api library endpoint and lets
 * the apprentice take a quiz against any card. Quiz attempts are logged via
 * /training-events so the manager dashboard can see who's learning what.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ActAppShell from '../components/ActAppShell';
import ActAskPanel from '../components/ActAskPanel';
import ActBottomBar from '../components/ActBottomBar';
import { getDemoContext } from '../api/captureApi';
import type { DemoContext } from '../api/captureApi';
import { logTrainingEvent, searchLibrary } from '../api/libraryApi';
import type { KnowledgeObject } from '../api/libraryApi';
import type { PilotStackParamList } from '../navigation/PilotNavigator';
import {
  ActButton,
  ActCard,
  ActEmptyState,
  ActInput,
  ActPill,
  ActText,
  colors,
  radii,
  spacing,
} from '../design';
import {
  getVisibleTrainingCards,
  shouldShowEmptyState,
  type TrainingCard,
} from './learnScreenModel';

type LearnRoute = RouteProp<PilotStackParamList, 'Learn'>;
type NavProp = NativeStackNavigationProp<PilotStackParamList>;

export default function LearnScreen() {
  const route = useRoute<LearnRoute>();
  const navigation = useNavigation<NavProp>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeObject[]>([]);
  const [selected, setSelected] = useState<TrainingCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [learnerContext, setLearnerContext] = useState<DemoContext | null>(null);
  const [learnerLoading, setLearnerLoading] = useState(true);
  const [learnerError, setLearnerError] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);

  const loadLearnerContext = useCallback(async () => {
    setLearnerLoading(true);
    setLearnerError(null);
    try {
      setLearnerContext(await getDemoContext());
    } catch (err) {
      setLearnerContext(null);
      setLearnerError(err instanceof Error ? err.message : 'apprentice identity failed');
    } finally {
      setLearnerLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cards = await searchLibrary({ q: query, limit: 50 });
      setResults(cards);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'search failed');
    } finally {
      setLoading(false);
    }
  }, [query]);

  // Refresh whenever the tab is focused so newly published cards show up.
  useFocusEffect(
    useCallback(() => {
      void refresh();
      void loadLearnerContext();
    }, [loadLearnerContext, refresh]),
  );

  const cards = getVisibleTrainingCards(results);
  const learnerId = learnerContext?.user_id;
  const showingEmpty = shouldShowEmptyState({ loading, error, resultsCount: results.length });

  useEffect(() => {
    if (route.params?.card) {
      setSelected(route.params.card);
    }
  }, [route.params?.card?.id]);

  useEffect(() => {
    if (route.params?.card || !route.params?.cardId) return;
    const match = cards.find((card) => card.id === route.params?.cardId);
    if (match) setSelected(match);
  }, [cards, route.params?.card, route.params?.cardId]);

  function openCard(item: TrainingCard) {
    if (!learnerId) {
      setLearnerError('identity has not loaded yet');
      return;
    }
    setSelected(item);
    void logTrainingEvent({ knowledgeObjectId: item.id, userId: learnerId, eventType: 'viewed' }).catch(
      (err) => setLearnerError(err instanceof Error ? err.message : 'view event failed'),
    );
  }

  return (
    <ActAppShell
      mode="Training"
      rightLabel="Capture"
      rightMuted
      onRightPress={() => navigation.navigate('CaptureJob')}
      onMenuPress={() =>
        navigation.canGoBack() ? navigation.goBack() : navigation.navigate('PilotHome')
      }
      bottomBar={<ActBottomBar onPress={() => setAskOpen(true)} />}
    >
      <ActAskPanel
        visible={askOpen}
        onClose={() => setAskOpen(false)}
        accountId={learnerContext?.account_id}
      />
      {selected ? (
        <CardDetail card={selected} userId={learnerId} onBack={() => setSelected(null)} />
      ) : (
        <View style={styles.container}>
          <FlatList
            data={loading ? [] : cards}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <View style={styles.header}>
                  <ActText variant="h1" color="primary">
                    Apprentice training
                  </ActText>
                  <ActText variant="small" color="textMuted">
                    Reviewed cards from your own senior techs — company-specific, field-tested.
                  </ActText>
                </View>

                <ActInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search symptom, equipment, hazard"
                  returnKeyType="search"
                  onSubmitEditing={refresh}
                />

                {error ? (
                  <ActCard tone="err" accent="err">
                    <ActText variant="small" color="error" weight="semibold">
                      {error}
                    </ActText>
                  </ActCard>
                ) : null}
                {learnerError ? (
                  <ActCard tone="err" accent="err">
                    <ActText variant="small" color="error">
                      Apprentice identity is required to measure transfer: {learnerError}
                    </ActText>
                  </ActCard>
                ) : null}
                {learnerLoading && !learnerId ? (
                  <ActText variant="small" color="textMuted">
                    Loading apprentice identity…
                  </ActText>
                ) : null}

                {!loading && !showingEmpty ? (
                  <ActText variant="label" color="textMuted">
                    {cards.length} published cards
                  </ActText>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator style={styles.loading} color={colors.primary} />
              ) : showingEmpty ? (
                <ActEmptyState
                  title="No reviewed cards yet"
                  body="Publish a reviewed moment from the capture flow and it will appear here."
                />
              ) : null
            }
            renderItem={({ item }) => (
              <ActCard
                onPress={() => openCard(item)}
                style={learnerId ? styles.card : [styles.card, styles.cardDisabled]}
              >
                <ActText variant="h2" weight="semibold">
                  {item.title}
                </ActText>
                <View style={styles.meta}>
                  <ActPill label={item.trade} tone="orange" />
                  {isCompanyApproved(item) ? <ActPill label="company-approved" tone="ok" /> : null}
                  {item.jurisdiction ? <ActPill label={item.jurisdiction} /> : null}
                  {item.tags_json?.slice(0, 3).map((tag) => (
                    <ActPill key={tag} label={tag} />
                  ))}
                </View>
                {item.novice_trap ? (
                  <ActText numberOfLines={2} variant="small" color="textMuted">
                    Novice trap: {item.novice_trap}
                  </ActText>
                ) : null}
              </ActCard>
            )}
          />
        </View>
      )}
    </ActAppShell>
  );
}

function CardDetail({
  card,
  userId,
  onBack,
}: {
  card: TrainingCard;
  userId: string | undefined;
  onBack: () => void;
}) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [quizSaving, setQuizSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const quiz = card.quiz_json;
  const isCorrect = useMemo(() => quiz != null && selectedChoice === quiz.answer, [quiz, selectedChoice]);

  async function submit() {
    if (!selectedChoice || !quiz) return;
    if (!userId) {
      setTrackingError('Apprentice identity is required before logging progress.');
      return;
    }
    setQuizSaving(true);
    setTrackingError(null);
    // Two events on purpose — attempt count and correct count are useful separately.
    try {
      await logTrainingEvent({ knowledgeObjectId: card.id, userId, eventType: 'quiz_attempted' });
      await logTrainingEvent({
        knowledgeObjectId: card.id,
        userId,
        eventType: isCorrect ? 'quiz_correct' : 'quiz_wrong',
        score: isCorrect ? 1.0 : 0.0,
      });
      setSubmitted(true);
    } catch (err) {
      setTrackingError(err instanceof Error ? err.message : 'quiz event failed');
    } finally {
      setQuizSaving(false);
    }
  }

  async function markComplete() {
    if (completed || completionSaving) return;
    if (!userId) {
      setTrackingError('Apprentice identity is required before logging progress.');
      return;
    }
    setCompletionSaving(true);
    setTrackingError(null);
    try {
      await logTrainingEvent({
        knowledgeObjectId: card.id,
        userId,
        eventType: 'completed',
        score: submitted && isCorrect ? 1.0 : undefined,
        note: submitted
          ? `Completed after quiz: ${isCorrect ? 'correct' : 'wrong'}`
          : 'Completed without quiz',
      });
      setCompleted(true);
    } catch (err) {
      setTrackingError(err instanceof Error ? err.message : 'completion save failed');
    } finally {
      setCompletionSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.detailHeader}>
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button">
          <ActText variant="bodyStrong" weight="semibold" color="primary">
            ‹ Library
          </ActText>
        </Pressable>
      </View>

      <FlatList
        data={[0]}
        keyExtractor={() => 'detail'}
        contentContainerStyle={styles.detailBody}
        renderItem={() => (
          <>
            <ActText variant="display" style={styles.detailTitle}>
              {card.title}
            </ActText>

            <View style={styles.meta}>
              <ActPill label={card.trade} tone="orange" />
              {isCompanyApproved(card) ? <ActPill label="company-approved" tone="ok" /> : null}
              {card.tags_json?.map((tag) => (
                <ActPill key={tag} label={tag} />
              ))}
            </View>

            <TrustBand card={card} />

            <Section label="Situation" body={card.situation} />
            <Section label="What the master noticed" body={card.observable_cue} />
            <Section label="Why" body={card.expert_reasoning} />
            <Section label="What they did" body={card.decision} />
            <Section label="Novice trap" body={card.novice_trap} tone="warn" />
            <Section label="Safety" body={card.safety_boundary} tone="error" />
            <Section label="Verification" body={card.verification} />

            {quiz ? (
              <ActCard style={styles.block}>
                <ActText variant="label" color="primary">
                  Quick check
                </ActText>
                <ActText variant="bodyStrong" weight="semibold">
                  {quiz.question}
                </ActText>
                {quiz.choices.map((choice) => {
                  const isSelected = selectedChoice === choice;
                  const isAnswer = quiz.answer === choice;
                  const showFeedback = submitted;
                  return (
                    <Pressable
                      key={choice}
                      accessibilityRole="button"
                      onPress={() => !submitted && setSelectedChoice(choice)}
                      style={[
                        styles.choice,
                        isSelected && styles.choiceSelected,
                        showFeedback && isAnswer && styles.choiceCorrect,
                        showFeedback && isSelected && !isAnswer && styles.choiceWrong,
                      ]}
                    >
                      <ActText variant="small" style={styles.choiceText}>
                        {choice}
                      </ActText>
                      {showFeedback && isAnswer ? (
                        <ActText variant="label" color="success" style={styles.choiceTag}>
                          correct
                        </ActText>
                      ) : null}
                    </Pressable>
                  );
                })}
                {!submitted ? (
                  <ActButton
                    label={quizSaving ? 'Saving answer' : 'Submit answer'}
                    onPress={submit}
                    disabled={!selectedChoice || !userId}
                    loading={quizSaving}
                  />
                ) : (
                  <View style={[styles.resultBanner, isCorrect ? styles.resultRight : styles.resultWrong]}>
                    <ActText variant="small" weight="semibold" style={styles.resultText}>
                      {isCorrect ? 'Right.' : `Not quite. ${quiz.answer}.`}
                    </ActText>
                  </View>
                )}
              </ActCard>
            ) : null}

            {!quiz || submitted ? (
              <ActCard style={styles.block}>
                <ActText variant="label" color="success" style={styles.okLabel}>
                  Progress
                </ActText>
                <ActText variant="small" color="textMuted">
                  Mark this card complete when the apprentice has reviewed the decision trace.
                </ActText>
                <ActButton
                  label={completed ? 'Training complete' : completionSaving ? 'Saving' : 'Mark complete'}
                  onPress={() => void markComplete()}
                  variant={completed ? 'ghost' : 'primary'}
                  disabled={completed}
                  loading={completionSaving}
                  style={completed ? styles.completeDone : undefined}
                />
              </ActCard>
            ) : null}
            {trackingError ? (
              <ActText variant="small" color="error" weight="semibold">
                {trackingError}
              </ActText>
            ) : null}
          </>
        )}
      />
    </View>
  );
}

function TrustBand({ card }: { card: TrainingCard }) {
  const equipment = [card.system_type, card.equipment_make, card.equipment_model]
    .filter(isNonEmpty)
    .join(' ');
  const rows = [
    {
      label: 'Approval',
      value: isCompanyApproved(card) ? 'Company-approved training card' : 'Draft under review',
    },
    { label: 'Jurisdiction', value: card.jurisdiction ?? 'Not specified' },
    card.customer_site_label ? { label: 'Site', value: card.customer_site_label } : null,
    equipment ? { label: 'Equipment', value: equipment } : null,
  ].filter((row): row is { label: string; value: string } => row != null);

  return (
    <ActCard style={styles.trustBand}>
      {rows.map((row) => (
        <View key={row.label} style={styles.trustRow}>
          <ActText variant="label" color="textMuted" style={styles.trustLabel}>
            {row.label}
          </ActText>
          <ActText variant="small" weight="medium" style={styles.trustValue}>
            {row.value}
          </ActText>
        </View>
      ))}
    </ActCard>
  );
}

function isCompanyApproved(card: TrainingCard): boolean {
  return card.status === 'published' && card.published_at != null;
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function Section({
  label,
  body,
  tone,
}: {
  label: string;
  body: string | null;
  tone?: 'warn' | 'error';
}) {
  if (!body) return null;
  const isWarn = tone === 'warn';
  const isError = tone === 'error'; // safety -> lockout panel
  return (
    <ActCard
      tone={isError ? 'err' : isWarn ? 'warn' : 'surface'}
      accent={isError ? 'err' : isWarn ? 'warn' : 'steel'}
    >
      <View style={styles.sectionHd}>
        {isError ? (
          <View style={styles.lockoutIcon}>
            <ActText variant="label" mono style={styles.lockoutIconText}>
              !
            </ActText>
          </View>
        ) : null}
        <ActText variant="label" color={isError ? 'error' : isWarn ? 'caution' : 'textMuted'}>
          {label}
        </ActText>
      </View>
      <ActText
        variant="body"
        color={isError ? 'error' : 'steel700'}
        weight={isError ? 'medium' : undefined}
        style={isError ? styles.errBody : undefined}
      >
        {body}
      </ActText>
    </ActCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md, gap: spacing.sm + 2, paddingBottom: spacing.xl },
  listHeader: { gap: spacing.md, paddingBottom: spacing.xs },
  header: { gap: spacing.xs, paddingTop: spacing.xs },
  loading: { marginTop: spacing['2xl'] },
  card: { gap: spacing.sm },
  cardDisabled: { opacity: 0.5 },
  meta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  detailHeader: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailBody: { padding: spacing.lg, gap: spacing.md },
  detailTitle: { fontSize: 22, lineHeight: 28 },
  trustBand: { backgroundColor: colors.surfaceAlt, gap: spacing.sm },
  trustRow: { flexDirection: 'row', gap: spacing.sm + 2 },
  trustLabel: { width: 92, fontSize: 10 },
  trustValue: { flex: 1 },
  sectionHd: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lockoutIcon: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockoutIconText: { color: '#FFFFFF', fontSize: 12, letterSpacing: 0 },
  errBody: { color: '#5B1212' },
  block: { gap: spacing.sm + 2 },
  choice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  choiceCorrect: { borderColor: colors.success, backgroundColor: colors.successLight },
  choiceWrong: { borderColor: colors.error, backgroundColor: colors.errorLight },
  choiceText: { flex: 1 },
  choiceTag: {},
  resultBanner: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: radii.md },
  resultRight: { backgroundColor: colors.successLight },
  resultWrong: { backgroundColor: colors.errorLight },
  resultText: { textAlign: 'center' },
  okLabel: { color: '#0E6B30' },
  completeDone: { backgroundColor: colors.successLight, borderColor: colors.success },
});
