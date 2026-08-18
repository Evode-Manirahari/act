import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import ActAppShell from '../components/ActAppShell';
import ActAskPanel from '../components/ActAskPanel';
import ActSidebar from '../components/ActSidebar';
import {
  getDashboardSummary,
  getPendingDebrief,
  getPilotWeeklyReport,
  type DashboardSummary,
  type PilotWeeklyReport,
} from '../api/libraryApi';
import { debriefBadge } from './debriefModel';
import { getPilotContext } from '../api/captureApi';
import { useAuthSession } from '../hooks/useAuthSession';
import type { PilotStackParamList } from '../navigation/PilotNavigator';
import { buildDefaultSidebarItems } from '../navigation/sidebarItems';
import { ActButton, ActCard, ActScreen, ActText, colors, spacing } from '../design';

type NavProp = NativeStackNavigationProp<PilotStackParamList>;
type PilotHomeRoute = RouteProp<PilotStackParamList, 'PilotHome'>;

export default function PilotHomeScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<PilotHomeRoute>();
  const { session, signOut } = useAuthSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [report, setReport] = useState<PilotWeeklyReport | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [debriefCount, setDebriefCount] = useState(0);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Other screens can deep-link straight into Ask ACT so it has one entry point
  // regardless of where it was opened from.
  useFocusEffect(
    useCallback(() => {
      if (route.params?.openAsk) {
        setAskOpen(true);
        navigation.setParams({ openAsk: undefined });
      }
    }, [route.params?.openAsk, navigation]),
  );

  async function handleSignOut() {
    setSignOutError(null);
    const { error } = await signOut();
    if (error) setSignOutError(error);
    // On success the navigator swaps to LoginScreen via onAuthStateChange.
  }

  const refresh = useCallback(async () => {
    let scopedAccountId = accountId;
    if (!scopedAccountId) {
      try {
        const context = await getPilotContext();
        scopedAccountId = context.account_id;
        setAccountId(context.account_id);
      } catch {
        scopedAccountId = null;
      }
    }

    try {
      setSummary(await getDashboardSummary());
    } catch {
      // Offline or API down: counts stay null. Never show made-up numbers.
    }

    try {
      setDebriefCount((await getPendingDebrief()).count);
    } catch {
      // Older API deployment or offline: no badge, never a fake count.
    }

    try {
      if (scopedAccountId) {
        setReport(await getPilotWeeklyReport({ accountId: scopedAccountId }));
      }
    } catch {
      // Report is additive; older API deployments should not hide the live summary.
    }
  }, [accountId]);

  // Refresh whenever the screen regains focus so a just-uploaded job or
  // just-published card shows up without a reload.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const queueCount = summary?.moments_proposed ?? 0;

  const sidebarItems = buildDefaultSidebarItems(
    navigation,
    () => setSidebarOpen(false),
    {
      review: queueCount > 0 ? `${queueCount} ready` : undefined,
      debrief: debriefBadge(debriefCount) ?? undefined,
    },
    () => setAskOpen(true),
  );

  return (
    <ActAppShell mode="ACT" onMenuPress={() => setSidebarOpen(true)}>
      <ActAskPanel visible={askOpen} onClose={() => setAskOpen(false)} accountId={accountId} />
      <ActSidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        items={sidebarItems}
        account={{
          email: session?.user.email ?? undefined,
          onSignOut: () => void handleSignOut(),
          onDeleteAccount: () => {
            setSidebarOpen(false);
            navigation.navigate('DeleteAccount');
          },
          error: signOutError,
        }}
      />

      <ActScreen>
        {/* The product is capture. The first thing on the home screen is the
            thing the tech came to do, at field-CTA size. */}
        <ActButton
          label="Record a job"
          detail="Capture the call, mark what matters"
          size="lg"
          onPress={() => navigation.navigate('CaptureJob')}
        />

        <PendingWork
          debriefCount={debriefCount}
          queueCount={queueCount}
          onDebrief={() => navigation.navigate('Debrief')}
          onReview={() => navigation.navigate('PilotReview', { queue: true })}
        />

        {report ? (
          <ActCard>
            <ActText variant="label" color="textMuted">
              {report.week} pilot report
            </ActText>
            <ActText variant="small" color="steel700" style={styles.reportLine}>
              {report.summary}
            </ActText>
            <ActText variant="small" mono color="textMuted">
              {report.metrics.cards_published} cards · {report.metrics.callbacks}/
              {report.metrics.outcomes_logged} callbacks · {report.metrics.training_events} training events
            </ActText>
            {report.risks.slice(0, 2).map((risk) => (
              <View key={risk} style={styles.riskRow}>
                <View style={styles.riskDot} />
                <ActText variant="small" color="caution" weight="medium" style={styles.riskText}>
                  {risk}
                </ActText>
              </View>
            ))}
          </ActCard>
        ) : null}
      </ActScreen>
    </ActAppShell>
  );
}

/**
 * The two things that can actually be waiting on this user, as tappable rows.
 * Renders nothing when both are zero — an empty queue needs no tile, and a row
 * reading "0" is noise a tech has to parse on a roof.
 */
function PendingWork({
  debriefCount,
  queueCount,
  onDebrief,
  onReview,
}: {
  debriefCount: number;
  queueCount: number;
  onDebrief: () => void;
  onReview: () => void;
}) {
  if (debriefCount === 0 && queueCount === 0) return null;
  return (
    <View style={styles.pending}>
      <ActText variant="label" color="textMuted">
        Waiting on you
      </ActText>
      {debriefCount > 0 ? (
        <ActCard accent="orange" onPress={onDebrief}>
          <View style={styles.pendingRow}>
            <ActText variant="bodyStrong">Answer debrief</ActText>
            <ActText variant="h2" mono color="primary">
              {debriefCount}
            </ActText>
          </View>
          <ActText variant="small" color="textMuted">
            30 seconds in your own words builds the card
          </ActText>
        </ActCard>
      ) : null}
      {queueCount > 0 ? (
        <ActCard accent="steel" onPress={onReview}>
          <View style={styles.pendingRow}>
            <ActText variant="bodyStrong">Review queue</ActText>
            <ActText variant="h2" mono color="ink">
              {queueCount}
            </ActText>
          </View>
          <ActText variant="small" color="textMuted">
            Moments proposed across ready recordings
          </ActText>
        </ActCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  reportLine: { marginTop: 2 },
  riskRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  riskDot: { width: 6, height: 6, borderRadius: 1, backgroundColor: colors.caution, marginTop: 6 },
  riskText: { flex: 1 },
  pending: { gap: spacing.sm },
  pendingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
