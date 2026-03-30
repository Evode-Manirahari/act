import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useActStore } from '../store/act';
import { api } from '../api/act';
import type { Project, Step } from '@actober/shared-types';
import type { HistoryStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<HistoryStackParamList, 'ProjectDetail'>;
type RoutePropType = RouteProp<HistoryStackParamList, 'ProjectDetail'>;

const CATEGORY_COLORS: Record<string, string> = {
  MAKE: colors.make,
  IMPROVE: colors.improve,
  GROW: colors.grow,
  CREATE: colors.create,
};

const CATEGORY_EMOJI: Record<string, string> = {
  MAKE: '🔧', IMPROVE: '✨', GROW: '🌱', CREATE: '🎨',
};

const CATEGORY_LABEL: Record<string, string> = {
  MAKE: 'Make', IMPROVE: 'Improve', GROW: 'Grow', CREATE: 'Create',
};

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function minutesSince(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
}

export default function ProjectDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { projectId } = route.params;

  const { projects, setActiveProject, upsertProject } = useActStore();
  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Project not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const color = CATEGORY_COLORS[project.category] ?? colors.primary;
  const emoji = CATEGORY_EMOJI[project.category] ?? '⚡';
  const completedSteps = project.steps.filter(s => s.completed).length;
  const progress = project.steps.length > 0 ? completedSteps / project.steps.length : 0;
  const isCompleted = project.status === 'COMPLETED';
  const isInProgress = project.status === 'IN_PROGRESS';
  const isAbandoned = project.status === 'ABANDONED';

  const timeTaken = project.startedAt && project.completedAt
    ? minutesSince(project.startedAt, project.completedAt)
    : null;

  async function handleResume() {
    setActiveProject(project!);
    navigation.getParent()?.navigate('Today' as any, {
      screen: 'Project',
      params: { projectId: project!.id },
    });
  }

  async function handlePickBackUp() {
    try {
      const updated = await api.updateProject(project!.id, { status: 'IN_PROGRESS' });
      upsertProject(updated);
      setActiveProject(updated);
      navigation.getParent()?.navigate('Today' as any, {
        screen: 'Project',
        params: { projectId: project!.id },
      });
    } catch {
      setActiveProject(project!);
      navigation.getParent()?.navigate('Today' as any);
    }
  }

  async function handleBuildAgain() {
    navigation.getParent()?.navigate('Today' as any);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Just finished "${project!.title}" with ACT — AI guidance for physical work. ${timeTaken ? `Took ${timeTaken} minutes.` : ''} 🔧`,
      });
    } catch {}
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Projects</Text>
        </TouchableOpacity>
        {isCompleted && (
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.emojiCircle, { backgroundColor: color + '18' }]}>
            <Text style={styles.emojiLarge}>{emoji}</Text>
          </View>

          <StatusPill status={project.status} color={color} />

          <Text style={styles.title}>{project.title}</Text>
          <Text style={styles.description}>{project.description}</Text>

          <View style={styles.metaRow}>
            <MetaChip icon="⏱" label={`${project.timeRequired} min`} />
            <Text style={styles.metaDot}>·</Text>
            <MetaChip icon={emoji} label={CATEGORY_LABEL[project.category] ?? project.category} />
            {isCompleted && project.completedAt && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <MetaChip icon="✓" label={formatDate(project.completedAt)} color={colors.success} />
              </>
            )}
            {isInProgress && project.startedAt && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <MetaChip icon="▶" label={`Started ${formatDate(project.startedAt)}`} color={color} />
              </>
            )}
          </View>

          {timeTaken !== null && timeTaken > 0 && (
            <View style={[styles.timeBanner, { backgroundColor: color + '12', borderColor: color + '30' }]}>
              <Text style={[styles.timeBannerText, { color }]}>
                Finished in {timeTaken} min · {completedSteps} of {project.steps.length} steps
              </Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Progress */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Steps</Text>
            <Text style={styles.sectionCount}>{completedSteps}/{project.steps.length}</Text>
          </View>

          <View style={styles.progressBarBg}>
            <View style={[
              styles.progressBarFill,
              { width: `${Math.round(progress * 100)}%` as any, backgroundColor: color },
            ]} />
          </View>

          <View style={styles.stepList}>
            {project.steps.map((step: Step, i: number) => (
              <StepRow
                key={step.id}
                step={step}
                index={i}
                isCurrent={i === project.currentStepIndex && isInProgress}
                isLast={i === project.steps.length - 1}
                color={color}
              />
            ))}
          </View>
        </View>

        {/* Materials */}
        {project.materials.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Materials</Text>
              <View style={styles.materialsList}>
                {project.materials.map((m, i) => (
                  <View key={i} style={styles.materialChip}>
                    <Text style={styles.materialText}>{m}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        <View style={styles.actions}>
          {isInProgress && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: color }]}
              onPress={handleResume}
            >
              <Text style={styles.primaryBtnText}>Resume Job →</Text>
            </TouchableOpacity>
          )}

          {isCompleted && (
            <>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: color }]}
                onPress={handleBuildAgain}
              >
                <Text style={styles.primaryBtnText}>Build Something New →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleShare}>
                <Text style={styles.secondaryBtnText}>Share this build</Text>
              </TouchableOpacity>
            </>
          )}

          {isAbandoned && (
            <>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: color }]}
                onPress={handlePickBackUp}
              >
                <Text style={styles.primaryBtnText}>Pick Back Up →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleBuildAgain}>
                <Text style={styles.secondaryBtnText}>Start something new instead</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatusPill({ status, color }: { status: string; color: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    IN_PROGRESS: { label: 'In Progress', bg: color + '18', text: color },
    COMPLETED:   { label: 'Completed',   bg: colors.successLight, text: colors.success },
    ABANDONED:   { label: 'Not Finished', bg: colors.surfaceAlt, text: colors.textMuted },
    SUGGESTED:   { label: 'Suggested',   bg: colors.surfaceAlt, text: colors.textMuted },
  };
  const c = config[status] ?? config.SUGGESTED;

  return (
    <View style={[styles.statusPill, { backgroundColor: c.bg }]}>
      <Text style={[styles.statusPillText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

function MetaChip({ icon, label, color }: { icon: string; label: string; color?: string }) {
  return (
    <View style={styles.metaChip}>
      <Text style={[styles.metaChipText, color ? { color } : {}]}>{icon} {label}</Text>
    </View>
  );
}

function StepRow({ step, index, isCurrent, isLast, color }: {
  step: Step;
  index: number;
  isCurrent: boolean;
  isLast: boolean;
  color: string;
}) {
  return (
    <View style={styles.stepRow}>
      {/* Timeline */}
      <View style={styles.stepTimeline}>
        <View style={[
          styles.stepDot,
          step.completed && { backgroundColor: colors.success, borderColor: colors.success },
          isCurrent && !step.completed && { borderColor: color, borderWidth: 2 },
        ]}>
          {step.completed && <Text style={styles.stepCheck}>✓</Text>}
          {isCurrent && !step.completed && (
            <View style={[styles.stepCurrentDot, { backgroundColor: color }]} />
          )}
        </View>
        {!isLast && (
          <View style={[
            styles.stepLine,
            step.completed && { backgroundColor: colors.success },
          ]} />
        )}
      </View>

      {/* Content */}
      <View style={[styles.stepContent, isLast && { paddingBottom: 0 }]}>
        <Text style={[
          styles.stepTitle,
          step.completed && styles.stepTitleDone,
          isCurrent && { color: color, fontWeight: '700' },
        ]}>
          {index + 1}. {step.title}
        </Text>
        {(isCurrent || !step.completed) && step.description && (
          <Text style={[
            styles.stepDesc,
            isCurrent && { color: colors.textMuted },
          ]}>
            {step.description}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16, color: colors.textMuted },
  backLink: { fontSize: 14, color: colors.primary, fontWeight: '600' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8,
    backgroundColor: colors.background,
  },
  backBtn: { paddingVertical: 8 },
  backBtnText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  shareBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  shareBtnText: { fontSize: 15, color: colors.primary, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  hero: {
    alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 28, gap: 10,
  },
  emojiCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emojiLarge: { fontSize: 36 },

  statusPill: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  statusPillText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },

  title: {
    fontSize: 24, fontWeight: '800', color: colors.text,
    textAlign: 'center', lineHeight: 30, marginTop: 2,
  },
  description: {
    fontSize: 14, color: colors.textMuted, textAlign: 'center',
    lineHeight: 21, paddingHorizontal: 8,
  },

  metaRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    justifyContent: 'center', gap: 4, marginTop: 4,
  },
  metaDot: { fontSize: 12, color: colors.border },
  metaChip: {},
  metaChipText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },

  timeBanner: {
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, marginTop: 6,
  },
  timeBannerText: { fontSize: 13, fontWeight: '600' },

  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20 },

  section: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  sectionCount: { fontSize: 13, fontWeight: '700', color: colors.textMuted },

  progressBarBg: {
    height: 4, backgroundColor: colors.border, borderRadius: 2, marginBottom: 20,
  },
  progressBarFill: { height: 4, borderRadius: 2 },

  stepList: { gap: 0 },
  stepRow: { flexDirection: 'row', gap: 14 },
  stepTimeline: { alignItems: 'center', width: 24 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepCheck: { fontSize: 11, color: '#fff', fontWeight: '800' },
  stepCurrentDot: { width: 8, height: 8, borderRadius: 4 },
  stepLine: {
    width: 1.5, flex: 1, minHeight: 16,
    backgroundColor: colors.border, marginVertical: 2,
  },
  stepContent: { flex: 1, paddingBottom: 16 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 20 },
  stepTitleDone: { color: colors.textLight, textDecorationLine: 'line-through' },
  stepDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginTop: 3 },

  materialsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  materialChip: {
    backgroundColor: colors.surfaceAlt, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.border,
  },
  materialText: { fontSize: 13, color: colors.text, fontWeight: '500' },

  actions: { paddingHorizontal: 20, paddingTop: 28, gap: 12 },
  primaryBtn: {
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondaryBtn: { alignItems: 'center', paddingVertical: 8 },
  secondaryBtnText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
});
