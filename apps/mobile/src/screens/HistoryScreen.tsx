import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useActStore } from '../store/act';
import { api } from '../api/act';
import type { Project } from '@actober/shared-types';
import { useStreak } from '../hooks/useStreak';
import type { HistoryStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<HistoryStackParamList, 'HistoryList'>;

const CATEGORY_COLORS: Record<string, string> = {
  MAKE: colors.make, IMPROVE: colors.improve,
  GROW: colors.grow, CREATE: colors.create,
};

const CATEGORY_EMOJI: Record<string, string> = {
  MAKE: '🔧', IMPROVE: '✨', GROW: '🌱', CREATE: '🎨',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function minutesTaken(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const m = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return m > 0 ? m : null;
}

// ─── Stats Banner ────────────────────────────────────────────────────────────

function StatsBanner({ streak, totalCompleted, projects }: {
  streak: number;
  totalCompleted: number;
  projects: Project[];
}) {
  const categoryCounts = projects.reduce<Record<string, number>>((acc, p) => {
    if (p.status === 'COMPLETED') acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
  const totalMinutes = projects
    .filter(p => p.status === 'COMPLETED')
    .reduce((sum, p) => {
      const m = minutesTaken(p.startedAt, p.completedAt);
      return sum + (m ?? p.timeRequired);
    }, 0);

  return (
    <View style={styles.statsBanner}>
      <StatCell value={`${streak}`} label="day streak" sub="🔥" highlight={streak > 0} />
      <View style={styles.statsDivider} />
      <StatCell value={`${totalCompleted}`} label="completed" />
      <View style={styles.statsDivider} />
      <StatCell
        value={totalMinutes >= 60 ? `${Math.round(totalMinutes / 60)}h` : `${totalMinutes}m`}
        label="hands-on"
        sub={topCategory ? CATEGORY_EMOJI[topCategory[0]] : undefined}
      />
    </View>
  );
}

function StatCell({ value, label, sub, highlight }: {
  value: string; label: string; sub?: string; highlight?: boolean;
}) {
  return (
    <View style={styles.statCell}>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, highlight && { color: colors.primary }]}>{value}</Text>
        {sub && <Text style={styles.statSub}>{sub}</Text>}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Project Cards ────────────────────────────────────────────────────────────

function InProgressCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const color = CATEGORY_COLORS[project.category] ?? colors.primary;
  const completedSteps = project.steps.filter(s => s.completed).length;
  const progress = project.steps.length > 0 ? completedSteps / project.steps.length : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.cardBar, { backgroundColor: color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={[styles.categoryDot, { backgroundColor: color }]} />
          <Text style={styles.cardTitle} numberOfLines={1}>{project.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: color + '18' }]}>
            <Text style={[styles.statusBadgeText, { color }]}>Active</Text>
          </View>
        </View>

        <Text style={styles.cardDesc} numberOfLines={1}>{project.description}</Text>

        <View style={styles.progressSection}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, {
              width: `${Math.round(progress * 100)}%` as any,
              backgroundColor: color,
            }]} />
          </View>
          <Text style={styles.progressText}>{completedSteps}/{project.steps.length} steps</Text>
        </View>

        <View style={styles.cardFooter}>
          {project.startedAt && (
            <Text style={styles.cardDate}>Started {formatDate(project.startedAt)}</Text>
          )}
          <Text style={[styles.cardCta, { color }]}>Resume →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CompletedCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const color = CATEGORY_COLORS[project.category] ?? colors.primary;
  const completedSteps = project.steps.filter(s => s.completed).length;
  const taken = minutesTaken(project.startedAt, project.completedAt);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.cardBar, { backgroundColor: colors.success }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardEmoji}>{CATEGORY_EMOJI[project.category] ?? '⚡'}</Text>
          <Text style={styles.cardTitle} numberOfLines={1}>{project.title}</Text>
          <View style={styles.completedCheck}>
            <Text style={styles.completedCheckText}>✓</Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          {project.completedAt && (
            <Text style={styles.cardMetaText}>{formatDate(project.completedAt)}</Text>
          )}
          {taken && (
            <>
              <Text style={styles.cardMetaDot}>·</Text>
              <Text style={styles.cardMetaText}>{taken} min</Text>
            </>
          )}
          <Text style={styles.cardMetaDot}>·</Text>
          <Text style={styles.cardMetaText}>{completedSteps} steps</Text>
          <View style={styles.cardChevron}>
            <Text style={styles.cardChevronText}>›</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function AbandonedCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const color = CATEGORY_COLORS[project.category] ?? colors.primary;
  const completedSteps = project.steps.filter(s => s.completed).length;
  const progress = project.steps.length > 0 ? completedSteps / project.steps.length : 0;

  return (
    <TouchableOpacity style={[styles.card, styles.cardAbandoned]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.cardBar, { backgroundColor: colors.border }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardEmoji}>{CATEGORY_EMOJI[project.category] ?? '⚡'}</Text>
          <Text style={[styles.cardTitle, styles.cardTitleDim]} numberOfLines={1}>
            {project.title}
          </Text>
          <View style={styles.statusBadgeDim}>
            <Text style={styles.statusBadgeDimText}>Stopped</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, {
              width: `${Math.round(progress * 100)}%` as any,
              backgroundColor: colors.textLight,
            }]} />
          </View>
          <Text style={styles.progressTextDim}>{completedSteps}/{project.steps.length}</Text>
        </View>

        <Text style={[styles.cardCta, { color: colors.textMuted }]}>Pick back up →</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionCount}>
        <Text style={styles.sectionCountText}>{count}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, projects, setProjects, setActiveProject } = useActStore();
  const { streak, totalCompleted, load: loadStreak } = useStreak();

  useFocusEffect(
    React.useCallback(() => {
      loadStreak();
      if (user) loadProjects();
    }, [user])
  );

  async function loadProjects() {
    if (!user) return;
    try {
      const data = await api.getUserProjects(user.id);
      setProjects(data);
    } catch {}
  }

  function openDetail(project: Project) {
    navigation.push('ProjectDetail', { projectId: project.id });
  }

  function resumeProject(project: Project) {
    setActiveProject(project);
    navigation.getParent()?.navigate('Today' as any, {
      screen: 'Project',
      params: { projectId: project.id },
    });
  }

  const inProgress = projects.filter(p => p.status === 'IN_PROGRESS');
  const completed = projects.filter(p => p.status === 'COMPLETED');
  const abandoned = projects.filter(p => p.status === 'ABANDONED');
  const hasAny = projects.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Build Log</Text>
          {user?.name && <Text style={styles.headerSub}>Hey {user.name}</Text>}
        </View>
      </View>

      {/* Stats */}
      {(streak > 0 || totalCompleted > 0) && (
        <StatsBanner
          streak={streak}
          totalCompleted={totalCompleted}
          projects={projects}
        />
      )}

      {/* Empty state */}
      {!hasAny && (
        <View style={styles.empty}>
          <View style={styles.emptyIconBg}>
            <Text style={styles.emptyIcon}>🔧</Text>
          </View>
          <Text style={styles.emptyTitle}>Nothing built yet.</Text>
          <Text style={styles.emptyBody}>
            Tap Today, tell ACT what you're working on, and get your first job done.
          </Text>
        </View>
      )}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <View style={styles.section}>
          <SectionHeader label="In Progress" count={inProgress.length} />
          {inProgress.map(p => (
            <InProgressCard
              key={p.id}
              project={p}
              onPress={() => resumeProject(p)}
            />
          ))}
        </View>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <View style={styles.section}>
          <SectionHeader label="Completed" count={completed.length} />
          {completed.map(p => (
            <CompletedCard
              key={p.id}
              project={p}
              onPress={() => openDetail(p)}
            />
          ))}
        </View>
      )}

      {/* Abandoned */}
      {abandoned.length > 0 && (
        <View style={styles.section}>
          <SectionHeader label="Not Finished" count={abandoned.length} />
          {abandoned.map(p => (
            <AbandonedCard
              key={p.id}
              project={p}
              onPress={() => openDetail(p)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 60 },

  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  // Stats banner
  statsBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 20, marginTop: 16,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 3 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  statSub: { fontSize: 16 },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statsDivider: { width: 1, height: 36, backgroundColor: colors.border },

  // Section
  section: { marginTop: 28, paddingHorizontal: 20, gap: 10 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  sectionCount: {
    backgroundColor: colors.surfaceAlt, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 1,
    borderWidth: 1, borderColor: colors.border,
  },
  sectionCountText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },

  // Card shared
  card: {
    backgroundColor: colors.surface, borderRadius: 14,
    flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardAbandoned: { opacity: 0.75 },
  cardBar: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardEmoji: { fontSize: 16 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  cardTitleDim: { color: colors.textMuted },
  cardDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },

  // Status badges
  statusBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadgeDim: {
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3,
    backgroundColor: colors.surfaceAlt,
  },
  statusBadgeDimText: { fontSize: 11, fontWeight: '600', color: colors.textLight },
  completedCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.successLight,
    alignItems: 'center', justifyContent: 'center',
  },
  completedCheckText: { fontSize: 11, fontWeight: '800', color: colors.success },

  // Progress
  progressSection: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2,
  },
  progressBarBg: {
    flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2,
  },
  progressBarFill: { height: 4, borderRadius: 2 },
  progressText: { fontSize: 12, fontWeight: '600', color: colors.textMuted, minWidth: 40, textAlign: 'right' },
  progressTextDim: { fontSize: 12, color: colors.textLight, minWidth: 30, textAlign: 'right' },

  // Card footer
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardDate: { fontSize: 12, color: colors.textLight },
  cardCta: { fontSize: 13, fontWeight: '700' },

  // Completed meta row
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMetaText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  cardMetaDot: { fontSize: 13, color: colors.border },
  cardChevron: { marginLeft: 'auto' as any },
  cardChevronText: { fontSize: 20, color: colors.textLight, lineHeight: 20 },

  // Empty state
  empty: {
    alignItems: 'center', paddingVertical: 64,
    paddingHorizontal: 40, gap: 12,
  },
  emptyIconBg: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  emptyBody: {
    fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21,
  },
});
