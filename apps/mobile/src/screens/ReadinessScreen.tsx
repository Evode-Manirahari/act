/**
 * Your readiness — what the manager has entrusted you to handle, by job type.
 *
 * Read-only on mobile. Levels are set in the admin readiness matrix; this
 * screen shows the decision and the evidence behind it. A failed read is
 * unconfirmed, never an empty cell.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ActAppShell from '../components/ActAppShell';
import { getPilotContext } from '../api/captureApi';
import type { PilotStackParamList } from '../navigation/PilotNavigator';
import {
  ActCard,
  ActEmptyState,
  ActPill,
  ActText,
  colors,
  spacing,
} from '../design';
import {
  READINESS_LABEL,
  READINESS_SHORT,
  activityById,
  evidenceSummary,
  type ReadinessCell,
} from '@act/domain';
import { loadMyReadiness } from './readinessLoader';
import type { MyReadiness } from './readinessModel';

type NavProp = NativeStackNavigationProp<PilotStackParamList>;

export default function ReadinessScreen() {
  const navigation = useNavigation<NavProp>();
  const [data, setData] = useState<MyReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const context = await getPilotContext();
      setData(await loadMyReadiness(context));
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'readiness read failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <ActAppShell
      mode="Training"
      onMenuPress={() =>
        navigation.canGoBack() ? navigation.goBack() : navigation.navigate('PilotHome')
      }
    >
      <FlatList
        data={loading || error ? [] : data?.cells ?? []}
        keyExtractor={(item) => item.activityId}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <ActText variant="h1" color="primary">
              Your readiness
            </ActText>
            <ActText variant="small" color="textMuted">
              What your manager has entrusted you to handle, by job type. Evidence is counted; the
              level is their call.
            </ActText>
            {error ? (
              <ActCard tone="err" accent="err">
                <ActText variant="small" color="error" weight="semibold">
                  {error}
                </ActText>
              </ActCard>
            ) : null}
            {data?.levelsSource === 'none' ? (
              <ActCard tone="warn" accent="warn">
                <ActText variant="small" color="caution">
                  Levels are not stored in act-api yet. Practice and field jobs still count here;
                  entrustment decisions land once /readiness/levels ships.
                </ActText>
              </ActCard>
            ) : null}
            {data?.levelsSource === 'unconfirmed' ? (
              <ActCard tone="err" accent="err">
                <ActText variant="small" color="error">
                  The level read failed. What you see is evidence only, not proof that no level was
                  set.
                </ActText>
              </ActCard>
            ) : null}
            {data?.eventsUnconfirmed ? (
              <ActCard tone="warn" accent="warn">
                <ActText variant="small" color="caution">
                  Practice history could not be read, so case practice may be missing from these
                  counts.
                </ActText>
              </ActCard>
            ) : null}
            {data?.warnings.map((warning) => (
              <ActCard key={warning} tone="warn" accent="warn">
                <ActText variant="small" color="caution">
                  {warning}
                </ActText>
              </ActCard>
            ))}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loading} color={colors.primary} />
          ) : error ? null : (
            <ActEmptyState
              title="No evidence yet"
              body="Practice published cases or log field jobs. When your manager sets a level, it shows here with the reason they wrote."
            />
          )
        }
        renderItem={({ item }) => <ActivityRow cell={item} />}
      />
    </ActAppShell>
  );
}

function ActivityRow({ cell }: { cell: ReadinessCell }) {
  const activity = activityById(cell.activityId);
  const summary = evidenceSummary(cell.evidence);
  const level = cell.level;

  return (
    <ActCard
      style={cell.reviewSuggested ? styles.review : undefined}
      accent={cell.reviewSuggested ? 'orange' : 'steel'}
    >
      <View style={styles.rowTop}>
        <ActText variant="h2" weight="semibold">
          {activity.label}
        </ActText>
        {level ? (
          <ActPill label={READINESS_SHORT[level.level]} tone="ok" />
        ) : (
          <ActPill label="Not set" tone="neutral" />
        )}
      </View>
      {summary ? (
        <ActText variant="small" color="textMuted">
          {summary}
        </ActText>
      ) : null}
      {level ? (
        <View style={styles.levelBlock}>
          <ActText variant="label" color="textMuted">
            {READINESS_LABEL[level.level]}
          </ActText>
          {level.note ? (
            <ActText variant="body" color="steel700">
              {level.note}
            </ActText>
          ) : null}
        </View>
      ) : cell.reviewSuggested ? (
        <ActText variant="small" color="primary">
          Your manager has evidence here but has not set a level yet.
        </ActText>
      ) : null}
    </ActCard>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.md, gap: spacing.sm + 2, paddingBottom: spacing.xl },
  header: { gap: spacing.md, paddingBottom: spacing.xs },
  loading: { marginTop: spacing['2xl'] },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  levelBlock: { gap: spacing.xs, marginTop: spacing.xs },
  review: { borderLeftWidth: 3, borderLeftColor: colors.primary },
});
