import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useActStore } from '../store/act';
import { api } from '../api/act';
import type { Project } from '@actober/shared-types';
import { useStreak } from '../hooks/useStreak';

const CATEGORY_COLORS: Record<string, string> = {
  MAKE: colors.make, IMPROVE: colors.improve,
  GROW: colors.grow, CREATE: colors.create,
};

const CATEGORY_EMOJI: Record<string, string> = {
  MAKE: '🔧', IMPROVE: '✨', GROW: '🌱', CREATE: '🎨',
};

const STATUS_LABEL: Record<string, string> = {
  SUGGESTED: 'Suggested',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ABANDONED: 'Abandoned',
};

function StatsBar({ streak, totalCompleted, projects }: {
  streak: number;
  totalCompleted: number;
  projects: Project[];
}) {
  const categoryCounts = projects.reduce<Record<string, number>>((acc, p) => {
    if (p.status === 'COMPLETED') acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});

  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <View style={styles.statsBar}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{streak}</Text>
        <Text style={styles.statLabel}>{streak === 1 ? 'day streak' : 'day streak'} 🔥</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{totalCompleted}</Text>
        <Text style={styles.statLabel}>completed</Text>
      </View>
      {topCategory && (
        <>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{CATEGORY_EMOJI[topCategory[0]]}</Text>
            <Text style={styles.statLabel}>favorite</Text>
          </View>
        </>
      )}
    </View>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const color = CATEGORY_COLORS[project.category] ?? colors.primary;
  const completedSteps = project.steps.filter(s => s.completed).length;
  const isComplete = project.status === 'COMPLETED';
  const isAbandoned = project.status === 'ABANDONED';

  return (
    <View style={[styles.card, (isAbandoned) && styles.cardDim]}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={styles.cardEmoji}>{CATEGORY_EMOJI[project.category] ?? '⚡'}</Text>
          <Text style={styles.cardTitle} numberOfLines={1}>{project.title}</Text>
          <View style={[
            styles.statusBadge,
            isComplete && styles.statusBadgeComplete,
            isAbandoned && styles.statusBadgeAbandoned,
          ]}>
            <Text style={[
              styles.statusText,
              isComplete && styles.statusTextComplete,
              isAbandoned && styles.statusTextAbandoned,
            ]}>
              {STATUS_LABEL[project.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDesc} numberOfLines={2}>{project.description}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaText}>{project.timeRequired} min</Text>
          <Text style={styles.cardMetaDot}>·</Text>
          <Text style={styles.cardMetaText}>{completedSteps}/{project.steps.length} steps</Text>
          <Text style={styles.cardMetaDot}>·</Text>
          <Text style={styles.cardMetaText}>{project.category}</Text>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { user, projects, setProjects } = useActStore();
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

  const completed = projects.filter(p => p.status === 'COMPLETED');
  const inProgress = projects.filter(p => p.status === 'IN_PROGRESS');
  const abandoned = projects.filter(p => p.status === 'ABANDONED');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Projects</Text>
        {user?.name && <Text style={styles.headerName}>{user.name}</Text>}
      </View>

      {(streak > 0 || totalCompleted > 0) && (
        <StatsBar streak={streak} totalCompleted={totalCompleted} projects={projects} />
      )}

      {projects.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔧</Text>
          <Text style={styles.emptyTitle}>Nothing built yet.</Text>
          <Text style={styles.emptyText}>Go to Today and tell ACT what's around you.</Text>
        </View>
      )}

      {inProgress.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>In Progress</Text>
          {inProgress.map(p => <ProjectCard key={p.id} project={p} />)}
        </>
      )}

      {completed.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Completed</Text>
          {completed.map(p => <ProjectCard key={p.id} project={p} />)}
        </>
      )}

      {abandoned.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Not Finished</Text>
          {abandoned.map(p => <ProjectCard key={p.id} project={p} />)}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48, gap: 10 },

  header: {
    paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    marginBottom: 4,
    flexDirection: 'row', alignItems: 'baseline', gap: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  headerName: { fontSize: 14, color: colors.textMuted },

  statsBar: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: 14, padding: 16, gap: 4,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'space-around',
    marginBottom: 4,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },

  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 8,
  },

  empty: { alignItems: 'center', paddingVertical: 56, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },

  card: {
    backgroundColor: colors.surface, borderRadius: 14,
    flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  cardDim: { opacity: 0.6 },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 5 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardEmoji: { fontSize: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  statusBadge: {
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
    backgroundColor: colors.surfaceAlt,
  },
  statusBadgeComplete: { backgroundColor: colors.successLight },
  statusBadgeAbandoned: { backgroundColor: colors.surfaceAlt },
  statusText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  statusTextComplete: { color: colors.success },
  statusTextAbandoned: { color: colors.textLight },
  cardDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMetaText: { fontSize: 12, color: colors.textLight },
  cardMetaDot: { fontSize: 12, color: colors.textLight },
});
