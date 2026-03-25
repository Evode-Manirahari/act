import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import type { Project } from '@actober/shared-types';

const CATEGORY_COLORS: Record<string, string> = {
  MAKE: colors.make, IMPROVE: colors.improve,
  GROW: colors.grow, CREATE: colors.create,
};

const CATEGORY_EMOJI: Record<string, string> = {
  MAKE: '🔧', IMPROVE: '✨', GROW: '🌱', CREATE: '🎨',
};

interface Props {
  project: Project;
  onResume: () => void;
}

export default function ResumeBanner({ project, onResume }: Props) {
  const color = CATEGORY_COLORS[project.category] ?? colors.primary;
  const completedSteps = project.steps.filter(s => s.completed).length;
  const progress = project.steps.length > 0 ? completedSteps / project.steps.length : 0;

  return (
    <TouchableOpacity style={styles.banner} onPress={onResume} activeOpacity={0.85}>
      <View style={[styles.accent, { backgroundColor: color }]} />
      <View style={styles.body}>
        <Text style={styles.label}>Continue where you left off</Text>
        <View style={styles.row}>
          <Text style={styles.emoji}>{CATEGORY_EMOJI[project.category] ?? '⚡'}</Text>
          <Text style={styles.title} numberOfLines={1}>{project.title}</Text>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressBarBg}>
            <View style={[
              styles.progressBarFill,
              { width: `${Math.round(progress * 100)}%` as any, backgroundColor: color },
            ]} />
          </View>
          <Text style={styles.progressText}>
            {completedSteps}/{project.steps.length} steps
          </Text>
        </View>
      </View>
      <Text style={[styles.arrow, { color }]}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  accent: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: 14, gap: 6 },
  label: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji: { fontSize: 16 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBarBg: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2 },
  progressBarFill: { height: 4, borderRadius: 2 },
  progressText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  arrow: { fontSize: 20, fontWeight: '700', paddingRight: 14 },
});
