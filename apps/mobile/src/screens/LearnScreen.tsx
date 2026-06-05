/**
 * Learn — apprentice library on mobile.
 *
 * Lists published knowledge objects from the act-api library endpoint
 * and lets the apprentice take a quiz against any card. Quiz attempts
 * are logged via /training-events so the manager dashboard can see
 * who's learning what.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import { colors } from '../theme/colors';
import { fonts, labelStyle } from '../theme/typography';
import {
  KnowledgeObject,
  logTrainingEvent,
  searchLibrary,
} from '../api/libraryApi';
import { createDemoSession, DemoSession } from '../api/actApi';
import type { PilotStackParamList } from '../navigation/PilotNavigator';

type TrainingCard = KnowledgeObject & { demo?: boolean };
type LearnRoute = RouteProp<PilotStackParamList, 'Learn'>;

const SEEDED_HVAC_CARDS: TrainingCard[] = [
  {
    id: 'demo-restricted-airflow-before-charge',
    moment_id: 'demo-moment-restricted-airflow',
    title: 'Frost on suction line: check airflow before charge',
    trade: 'hvac',
    situation:
      'No-cool call. The suction line is frosting and the apprentice wants to add refrigerant immediately.',
    observable_cue:
      'The senior tech notices weak return airflow and a clogged filter before reaching for gauges.',
    expert_reasoning:
      'Restricted airflow can make the coil too cold and mimic low charge. Charging first can hide the real fault and create a callback.',
    decision:
      'Verify airflow, filter condition, blower operation, and coil cleanliness before diagnosing refrigerant charge.',
    novice_trap:
      'Seeing frost and assuming low refrigerant without checking airflow first.',
    safety_boundary:
      'Do not keep running the system with a freezing coil; water damage and compressor stress can follow.',
    verification:
      'After airflow is restored, recheck suction line condition, temperature split, superheat, and subcooling.',
    quiz_json: {
      question: 'What should the apprentice check before adding refrigerant?',
      choices: ['Airflow and filter restriction', 'Thermostat brand', 'Outdoor paint color'],
      answer: 'Airflow and filter restriction',
    },
    tags_json: ['no-cool', 'airflow', 'novice-trap'],
    status: 'published',
    created_by: 'demo',
    published_at: '2026-05-28T00:00:00.000Z',
    created_at: '2026-05-28T00:00:00.000Z',
    demo: true,
  },
];


export default function LearnScreen() {
  const route = useRoute<LearnRoute>();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeObject[]>([]);
  const [selected, setSelected] = useState<TrainingCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await createDemoSession();
        if (!cancelled) setSession(s);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'session error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
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

  // Refresh whenever the tab is focused so newly published cards show
  // up without a manual reload.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const cards: TrainingCard[] = results.length > 0 ? results : SEEDED_HVAC_CARDS;
  const showingDemoCards = !loading && results.length === 0;

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

  if (selected) {
    return (
      <CardDetail
        card={selected}
        userId={session?.user_id}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Apprentice Training</Text>
        <Text style={styles.headerSub}>
          Reviewed cards from senior-tech captures.
        </Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search symptom, equipment, hazard"
          placeholderTextColor={colors.textLight}
          returnKeyType="search"
          onSubmitEditing={refresh}
        />
      </View>

      {error && (
        <View style={[styles.notice, styles.noticeError]}>
          <Text style={styles.noticeText}>{error}</Text>
        </View>
      )}

      {showingDemoCards && (
        <View style={styles.demoNotice}>
          <Text style={styles.demoNoticeTitle}>Demo card</Text>
          <Text style={styles.demoNoticeText}>
            Published cards appear here after review. This seeded HVAC card shows the apprentice output.
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setSelected(item);
                if (session && !item.demo) {
                  void logTrainingEvent({
                    knowledgeObjectId: item.id,
                    userId: session.user_id,
                    eventType: 'viewed',
                  });
                }
              }}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.cardMeta}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{item.trade}</Text>
                </View>
                {item.demo && (
                  <View style={styles.demoPill}>
                    <Text style={styles.demoPillText}>demo</Text>
                  </View>
                )}
                {item.tags_json?.slice(0, 3).map((tag) => (
                  <View key={tag} style={styles.pillLight}>
                    <Text style={styles.pillLightText}>{tag}</Text>
                  </View>
                ))}
              </View>
              {item.novice_trap && (
                <Text numberOfLines={2} style={styles.cardBody}>
                  Novice trap: {item.novice_trap}
                </Text>
              )}
            </Pressable>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
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
  const [completed, setCompleted] = useState(false);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const quiz = card.quiz_json;
  const isCorrect = useMemo(
    () => quiz != null && selectedChoice === quiz.answer,
    [quiz, selectedChoice],
  );

  async function submit() {
    if (!selectedChoice || !quiz) return;
    setSubmitted(true);
    // Log the attempt and the outcome. Two events on purpose — the
    // attempt count and the correct count are useful separately on the
    // dashboard.
    if (userId && !card.demo) {
      void logTrainingEvent({
        knowledgeObjectId: card.id,
        userId,
        eventType: 'quiz_attempted',
      });
      void logTrainingEvent({
        knowledgeObjectId: card.id,
        userId,
        eventType: isCorrect ? 'quiz_correct' : 'quiz_wrong',
        score: isCorrect ? 1.0 : 0.0,
      });
    }
  }

  async function markComplete() {
    if (completed || completionSaving) return;
    setCompletionSaving(true);
    setCompletionError(null);
    try {
      if (userId && !card.demo) {
        await logTrainingEvent({
          knowledgeObjectId: card.id,
          userId,
          eventType: 'completed',
          score: submitted && isCorrect ? 1.0 : undefined,
          note: submitted
            ? `Completed after quiz: ${isCorrect ? 'correct' : 'wrong'}`
            : 'Completed without quiz',
        });
      }
      setCompleted(true);
    } catch (err) {
      setCompletionError(err instanceof Error ? err.message : 'completion save failed');
    } finally {
      setCompletionSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.detailHeader}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      </View>

      <FlatList
        data={[0]}
        keyExtractor={() => 'detail'}
        renderItem={() => (
          <View style={styles.detailBody}>
            <Text style={styles.detailTitle}>{card.title}</Text>

            <View style={styles.cardMeta}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{card.trade}</Text>
              </View>
              {card.demo && (
                <View style={styles.demoPill}>
                  <Text style={styles.demoPillText}>demo</Text>
                </View>
              )}
              {card.tags_json?.map((tag) => (
                <View key={tag} style={styles.pillLight}>
                  <Text style={styles.pillLightText}>{tag}</Text>
                </View>
              ))}
            </View>

            <Section label="Situation" body={card.situation} />
            <Section label="What the master noticed" body={card.observable_cue} />
            <Section label="Why" body={card.expert_reasoning} />
            <Section label="What they did" body={card.decision} />
            <Section
              label="Novice trap"
              body={card.novice_trap}
              tone="warn"
            />
            <Section
              label="Safety"
              body={card.safety_boundary}
              tone="error"
            />
            <Section label="Verification" body={card.verification} />

            {quiz && (
              <View style={styles.quizCard}>
                <Text style={styles.quizLabel}>Quick check</Text>
                <Text style={styles.quizQuestion}>{quiz.question}</Text>
                {quiz.choices.map((choice) => {
                  const isSelected = selectedChoice === choice;
                  const isAnswer = quiz.answer === choice;
                  const showFeedback = submitted;
                  return (
                    <Pressable
                      key={choice}
                      onPress={() => !submitted && setSelectedChoice(choice)}
                      style={[
                        styles.choice,
                        isSelected && styles.choiceSelected,
                        showFeedback && isAnswer && styles.choiceCorrect,
                        showFeedback && isSelected && !isAnswer && styles.choiceWrong,
                      ]}
                    >
                      <Text style={styles.choiceText}>{choice}</Text>
                      {showFeedback && isAnswer && (
                        <Text style={styles.choiceTag}>correct</Text>
                      )}
                    </Pressable>
                  );
                })}
                {!submitted ? (
                  <Pressable
                    style={[
                      styles.submit,
                      !selectedChoice && styles.submitDisabled,
                    ]}
                    disabled={!selectedChoice}
                    onPress={submit}
                  >
                    <Text style={styles.submitText}>Submit answer</Text>
                  </Pressable>
                ) : (
                  <View
                    style={[
                      styles.resultBanner,
                      isCorrect ? styles.resultRight : styles.resultWrong,
                    ]}
                  >
                    <Text style={styles.resultText}>
                      {isCorrect ? 'Right.' : `Not quite. ${quiz.answer}.`}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {(!quiz || submitted) && (
              <View style={styles.completeCard}>
                <Text style={styles.completeLabel}>Progress</Text>
                <Text style={styles.completeBody}>
                  Mark this card complete when the apprentice has reviewed the decision trace.
                </Text>
                <Pressable
                  disabled={completed || completionSaving}
                  style={({ pressed }) => [
                    styles.completeButton,
                    completed && styles.completeButtonDone,
                    (completed || completionSaving) && styles.submitDisabled,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => void markComplete()}
                >
                  <Text
                    style={[
                      styles.completeButtonText,
                      completed && styles.completeButtonDoneText,
                    ]}
                  >
                    {completed
                      ? 'Training complete'
                      : completionSaving
                        ? 'Saving'
                        : 'Mark complete'}
                  </Text>
                </Pressable>
                {completionError && (
                  <Text style={styles.completeErrorText}>{completionError}</Text>
                )}
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
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
    <View
      style={[
        styles.section,
        isWarn && styles.sectionWarn,
        isError && styles.sectionError,
      ]}
    >
      <View style={styles.sectionHd}>
        {isError && (
          <View style={styles.lockoutIcon}>
            <Text style={styles.lockoutIconText}>!</Text>
          </View>
        )}
        <Text
          style={[
            styles.sectionLabel,
            isWarn && styles.sectionLabelWarn,
            isError && styles.sectionLabelError,
          ]}
        >
          {label}
        </Text>
      </View>
      <Text style={[styles.sectionBody, isError && styles.sectionBodyError]}>{body}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.primary },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  searchRow: { padding: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loading: { marginTop: 32 },
  notice: { padding: 12, margin: 12, borderRadius: 8 },
  noticeError: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  noticeText: { fontSize: 13, color: colors.error },
  demoNotice: {
    margin: 12,
    marginBottom: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
  },
  demoNoticeTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  demoNoticeText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  empty: { padding: 32, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  emptyBody: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  listContent: { padding: 12, gap: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardPressed: { opacity: 0.6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  cardBody: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  pillText: { fontSize: 11, fontWeight: '800', color: colors.primary, textTransform: 'uppercase' },
  demoPill: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  demoPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#065F46',
    textTransform: 'uppercase',
  },
  pillLight: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillLightText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  detailHeader: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  detailBody: { padding: 16, gap: 12 },
  detailTitle: { fontSize: 22, fontWeight: '800', color: colors.ink, lineHeight: 28, fontFamily: fonts.display },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.steel300,
    gap: 8,
  },
  sectionWarn: {
    borderColor: '#F1D7A8',
    backgroundColor: colors.cautionLight,
    borderLeftWidth: 5,
    borderLeftColor: colors.caution,
  },
  // Safety = industrial lockout panel: heavy danger left rule + tinted bg.
  sectionError: {
    borderColor: '#F3C9C9',
    backgroundColor: colors.errorLight,
    borderLeftWidth: 5,
    borderLeftColor: colors.error,
  },
  sectionHd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockoutIcon: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockoutIconText: { color: '#fff', fontSize: 12, fontWeight: '800', fontFamily: fonts.mono },
  sectionLabel: { ...labelStyle, color: colors.steel500 },
  sectionLabelWarn: { color: colors.caution },
  sectionLabelError: { color: colors.error },
  sectionBody: { fontSize: 15, color: colors.steel700, lineHeight: 22, fontFamily: fonts.body },
  sectionBodyError: { color: '#5B1212', fontWeight: '500' },
  quizCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  quizLabel: { ...labelStyle, color: colors.primary },
  quizQuestion: { fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 22 },
  choice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight + '60' },
  choiceCorrect: { borderColor: colors.success, backgroundColor: colors.successLight },
  choiceWrong: { borderColor: colors.error, backgroundColor: '#FEE2E2' },
  choiceText: { fontSize: 14, color: colors.text, flex: 1 },
  choiceTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    textTransform: 'uppercase',
  },
  submit: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  resultBanner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  resultRight: { backgroundColor: colors.successLight },
  resultWrong: { backgroundColor: '#FEE2E2' },
  resultText: { fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'center' },
  completeCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 9,
  },
  completeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.success,
    textTransform: 'uppercase',
  },
  completeBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  completeButton: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonDone: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  completeButtonDoneText: {
    color: '#065F46',
  },
  completeErrorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '700',
  },
});
