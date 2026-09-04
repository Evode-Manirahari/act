/**
 * Learn — diagnostic case practice on mobile.
 *
 * Lists published knowledge objects and opens the commit-first case player.
 * Expert reasoning stays hidden until the apprentice states a hypothesis and
 * next test. Attempts are logged via /training-events.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ActAppShell from '../components/ActAppShell';
import ActAskPanel from '../components/ActAskPanel';
import CasePlayer from '../components/CasePlayer';
import { getPilotContext } from '../api/captureApi';
import type { DemoContext } from '../api/captureApi';
import { logTrainingEvent, searchLibrary } from '../api/libraryApi';
import type { KnowledgeObject } from '../api/libraryApi';
import type { PilotStackParamList } from '../navigation/PilotNavigator';
import {
  ActCard,
  ActEmptyState,
  ActInput,
  ActPill,
  ActText,
  colors,
  spacing,
} from '../design';
import { EPISODE_LABEL, diagnosticCaseFromKnowledgeObject } from '@act/domain';
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
      setLearnerContext(await getPilotContext());
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
      rightLabel="Ask ACT"
      rightMuted
      onRightPress={() => setAskOpen(true)}
      onMenuPress={() =>
        navigation.canGoBack() ? navigation.goBack() : navigation.navigate('PilotHome')
      }
    >
      <ActAskPanel
        visible={askOpen}
        onClose={() => setAskOpen(false)}
        accountId={learnerContext?.account_id}
      />
      {selected ? (
        <CasePlayer card={selected} userId={learnerId} onBack={() => setSelected(null)} />
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
                    Diagnostic cases
                  </ActText>
                  <ActText variant="small" color="textMuted">
                    Practice the decision before you see what the senior did. Company jobs only.
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
                    {cards.length} published cases
                  </ActText>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator style={styles.loading} color={colors.primary} />
              ) : showingEmpty ? (
                <ActEmptyState
                  title="No reviewed cases yet"
                  body="A callback, hard diagnosis, near miss, or adaptation has to be debriefed and published before anyone can practice it."
                />
              ) : null
            }
            renderItem={({ item }) => {
              const diag = diagnosticCaseFromKnowledgeObject(item);
              return (
                <ActCard
                  onPress={() => openCard(item)}
                  style={learnerId ? styles.card : [styles.card, styles.cardDisabled]}
                >
                  <ActText variant="h2" weight="semibold">
                    {item.title}
                  </ActText>
                  <View style={styles.meta}>
                    <ActPill label={EPISODE_LABEL[diag.episodeType]} tone="orange" />
                    {isCompanyApproved(item) ? <ActPill label="company-approved" tone="ok" /> : null}
                    {item.jurisdiction ? <ActPill label={item.jurisdiction} /> : null}
                  </View>
                  {item.situation ? (
                    <ActText numberOfLines={2} variant="small" color="textMuted">
                      {item.situation}
                    </ActText>
                  ) : null}
                </ActCard>
              );
            }}
          />
        </View>
      )}
    </ActAppShell>
  );
}

function isCompanyApproved(card: TrainingCard): boolean {
  return card.status === 'published' && card.published_at != null;
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
});
