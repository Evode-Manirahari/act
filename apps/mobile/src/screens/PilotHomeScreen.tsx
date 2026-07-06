import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ActAppShell from '../components/ActAppShell';
import ActAskPanel from '../components/ActAskPanel';
import ActBottomBar from '../components/ActBottomBar';
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
import { ActCard, ActPill, ActScreen, ActText, colors, radii, shadows, spacing } from '../design';

type NavProp = NativeStackNavigationProp<PilotStackParamList>;

// 60-day concierge pilot targets (PILOT.md). Live counts come from /dashboard/summary.
const PILOT_TARGETS = { jobsCaptured: 20, cardsPublished: 50 };

const workflow = ['Record', 'Mark', 'Review', 'Teach', 'Measure'];

export default function PilotHomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { session, signOut } = useAuthSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [report, setReport] = useState<PilotWeeklyReport | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [debriefCount, setDebriefCount] = useState(0);
  const [signOutError, setSignOutError] = useState<string | null>(null);

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

  const progressStats = [
    {
      label: `jobs captured / ${PILOT_TARGETS.jobsCaptured}`,
      value: summary ? String(summary.recordings_total) : '—',
    },
    {
      label: `cards published / ${PILOT_TARGETS.cardsPublished}`,
      value: summary ? String(summary.knowledge_objects_published) : '—',
    },
    {
      label: 'outcomes logged',
      value: summary ? String(summary.jobs_with_outcomes) : '—',
    },
  ];

  const queueCount = summary?.moments_proposed ?? 0;

  return (
    <ActAppShell
      mode="Capture"
      rightLabel="Record"
      onRightPress={() => navigation.navigate('CaptureJob')}
      bottomBar={<ActBottomBar onPress={() => setAskOpen(true)} />}
    >
      <ActAskPanel visible={askOpen} onClose={() => setAskOpen(false)} accountId={accountId} />

      <ActScreen>
        <View style={styles.header}>
          <ActText variant="label" color="primary" style={{ fontSize: 12 }}>
            HVAC · Field Capture
          </ActText>
          <ActText variant="display">Capture what your best techs know.</ActText>
          <ActText variant="body" color="textMuted" style={styles.sub}>
            Record the job, mark the teachable moment, review, publish. The judgment that
            prevents callbacks, captured before it retires.
          </ActText>
        </View>

        <View style={styles.actionBand}>
          <HomeAction
            label="Record senior tech"
            detail="Capture the call and mark what matters"
            primary
            onPress={() => navigation.navigate('CaptureJob')}
          />
          <HomeAction
            label="Apprentice training"
            detail="Open reviewed cards and quick checks"
            onPress={() => navigation.navigate('Learn')}
          />
          <HomeAction
            label="Review queue"
            detail="Approve moments across ready recordings"
            badge={queueCount > 0 ? `${queueCount} ready` : undefined}
            onPress={() => navigation.navigate('PilotReview', { queue: true })}
          />
          <HomeAction
            label="Answer debrief"
            detail="30 seconds in your own words builds the card"
            badge={debriefBadge(debriefCount) ?? undefined}
            onPress={() => navigation.navigate('Debrief')}
          />
          <HomeAction
            label="Measure outcome"
            detail="Available after review from a recorded job"
            disabled
          />
        </View>

        <ActText variant="label" color="textMuted" style={styles.sectionLabel}>
          Pilot progress
        </ActText>
        <View style={styles.statsRow}>
          {progressStats.map((stat) => (
            <ActCard key={stat.label} accent="orange" top style={styles.statTile}>
              <ActText variant="h1" mono color="ink" style={styles.statValue}>
                {stat.value}
              </ActText>
              <ActText variant="label" color="textMuted" style={styles.statLabel}>
                {stat.label}
              </ActText>
            </ActCard>
          ))}
        </View>

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

        <ActCard style={styles.workflowBand} padded={false}>
          {workflow.map((step, index) => (
            <React.Fragment key={step}>
              <View style={styles.workflowStep}>
                <View style={[styles.workflowNum, index === 0 && styles.workflowNumActive]}>
                  <ActText variant="label" style={styles.workflowNumText}>
                    {index + 1}
                  </ActText>
                </View>
                <ActText variant="label" color="steel700" style={styles.workflowLabel}>
                  {step}
                </ActText>
              </View>
              {index < workflow.length - 1 && <View style={styles.workflowLine} />}
            </React.Fragment>
          ))}
        </ActCard>

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

function HomeAction({
  label,
  detail,
  primary = false,
  badge,
  onPress,
  disabled = false,
}: {
  label: string;
  detail: string;
  primary?: boolean;
  badge?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        primary ? styles.actionPrimary : styles.actionSecondary,
        primary && shadows.cta,
        disabled && styles.actionDisabled,
        pressed && styles.pressed,
      ]}
    >
      {badge ? (
        <View style={styles.badge}>
          <ActPill label={badge} tone="orange" />
        </View>
      ) : null}
      <ActText variant="h2" weight="semibold" color={primary ? 'surface' : 'ink'}>
        {label}
      </ActText>
      <ActText
        variant="small"
        color={primary ? 'surface' : 'textMuted'}
        style={[styles.actionDetail, primary && styles.actionDetailPrimary]}
      >
        {detail}
      </ActText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.sm, gap: spacing.sm },
  sub: { maxWidth: 360 },
  actionBand: { gap: spacing.sm + 2 },
  action: {
    minHeight: 86,
    borderRadius: radii.md,
    padding: 18,
    justifyContent: 'center',
    borderWidth: 1,
    gap: 4,
  },
  actionPrimary: { backgroundColor: colors.primary, borderColor: colors.primaryPressed },
  actionSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.steel300,
  },
  actionDisabled: { opacity: 0.55 },
  actionDetail: {},
  actionDetailPrimary: { opacity: 0.9 },
  badge: { position: 'absolute', top: 14, right: 14 },
  pressed: { opacity: 0.85 },
  sectionLabel: { marginBottom: -spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm + 2 },
  statTile: { flex: 1, minHeight: 80, justifyContent: 'center' },
  statValue: { fontSize: 26, lineHeight: 28 },
  statLabel: { fontSize: 10, marginTop: 6 },
  reportLine: { marginTop: 2 },
  reportMetrics: {},
  riskRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  riskDot: { width: 6, height: 6, borderRadius: 1, backgroundColor: colors.caution, marginTop: 6 },
  riskText: { flex: 1 },
  workflowBand: {
    minHeight: 80,
    paddingHorizontal: spacing.lg - 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workflowStep: { alignItems: 'center', minWidth: 50, gap: 6 },
  workflowNum: {
    width: 26,
    height: 26,
    borderRadius: 3, // square instrument chip, not a round pill
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workflowNumActive: { backgroundColor: colors.primary },
  workflowNumText: { color: '#FFFFFF', fontSize: 12, letterSpacing: 0 },
  workflowLabel: { fontSize: 9 },
  workflowLine: { flex: 1, height: 1, backgroundColor: colors.border, marginHorizontal: 2, marginBottom: 20 },
  signOutRow: { alignItems: 'center', paddingVertical: spacing.sm, gap: 4 },
});
