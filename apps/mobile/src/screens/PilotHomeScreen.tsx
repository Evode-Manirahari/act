import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import ActAppShell from '../components/ActAppShell';
import ActAskPanel from '../components/ActAskPanel';
import ActBottomBar from '../components/ActBottomBar';
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
import { ActCard, ActScreen, ActText, colors, spacing } from '../design';

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

  // Sidebar "+ New chat" navigates here with openAsk so Ask ACT has one
  // consistent entry point regardless of which screen the drawer opened on.
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
      // Offline or API down: tiles stay at "—". Never show made-up counts.
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

  const sidebarItems = buildDefaultSidebarItems(navigation, () => setSidebarOpen(false), {
    review: queueCount > 0 ? `${queueCount} ready` : undefined,
    debrief: debriefBadge(debriefCount) ?? undefined,
  });

  return (
    <ActAppShell
      mode="ACT"
      onMenuPress={() => setSidebarOpen(true)}
      bottomBar={<ActBottomBar onPress={() => setAskOpen(true)} />}
    >
      <ActAskPanel visible={askOpen} onClose={() => setAskOpen(false)} accountId={accountId} />
      <ActSidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={() => {
          setSidebarOpen(false);
          setAskOpen(true);
        }}
        items={sidebarItems}
      />

      <ActScreen>
        {report ? (
          <ActCard>
            <ActText variant="label" color="textMuted">
              {report.week} pilot report
            </ActText>
            <ActText variant="small" color="steel700" style={styles.reportLine}>
              {report.summary}
            </ActText>
            <ActText variant="small" mono color="textMuted" style={styles.reportMetrics}>
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

        {session ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={() => void handleSignOut()}
            style={({ pressed }) => [styles.signOutRow, pressed && styles.pressed]}
          >
            <ActText variant="label" color="textMuted">
              {session.user.email ? `Signed in as ${session.user.email} · ` : ''}Sign out
            </ActText>
            {signOutError ? (
              <ActText variant="small" color="caution">
                {signOutError}
              </ActText>
            ) : null}
          </Pressable>
        ) : null}
      </ActScreen>
    </ActAppShell>
  );
}

const styles = StyleSheet.create({
  reportLine: { marginTop: 2 },
  reportMetrics: {},
  riskRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  riskDot: { width: 6, height: 6, borderRadius: 1, backgroundColor: colors.caution, marginTop: 6 },
  riskText: { flex: 1 },
  signOutRow: { alignItems: 'center', paddingVertical: spacing.sm, gap: 4 },
  pressed: { opacity: 0.85 },
});
