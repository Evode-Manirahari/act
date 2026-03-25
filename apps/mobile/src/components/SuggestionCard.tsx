import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import type { ProjectSuggestion } from '@actober/shared-types';

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: 'Easy start',
  MEDIUM: 'Some effort',
  HARD: 'Good challenge',
};

const CATEGORY_EMOJI: Record<string, string> = {
  MAKE: '🔧',
  IMPROVE: '✨',
  GROW: '🌱',
  CREATE: '🎨',
};

interface Props {
  suggestion: ProjectSuggestion;
  color: string;
  onPress: () => void;
}

export default function SuggestionCard({ suggestion, color, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.accent, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.emoji}>{CATEGORY_EMOJI[suggestion.category] ?? '⚡'}</Text>
          <Text style={styles.title}>{suggestion.title}</Text>
        </View>
        <Text style={styles.description}>{suggestion.description}</Text>
        <Text style={styles.why}>{suggestion.whyItFits}</Text>
        <View style={styles.meta}>
          <View style={[styles.badge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.badgeText, { color }]}>
              {suggestion.timeRequired} min
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.badgeText, { color }]}>
              {DIFFICULTY_LABEL[suggestion.difficulty] ?? suggestion.difficulty}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.badgeText, { color }]}>
              {suggestion.category}
            </Text>
          </View>
        </View>
        <Text style={styles.cta}>Tap to start →</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  accent: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: { fontSize: 18 },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  description: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  why: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cta: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 2,
  },
});
