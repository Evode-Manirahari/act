import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Animated, Share, Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import type { Project } from '@actober/shared-types';

const CATEGORY_EMOJI: Record<string, string> = {
  MAKE: '🔧', IMPROVE: '✨', GROW: '🌱', CREATE: '🎨',
};

const CATEGORY_COLORS: Record<string, string> = {
  MAKE: colors.make, IMPROVE: colors.improve,
  GROW: colors.grow, CREATE: colors.create,
};

interface Props {
  project: Project;
  visible: boolean;
  onStartAnother: () => void;
  onDismiss: () => void;
}

export default function CompletionModal({ project, visible, onStartAnother, onDismiss }: Props) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const color = CATEGORY_COLORS[project.category] ?? colors.primary;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.7);
      opacity.setValue(0);
    }
  }, [visible]);

  async function handleShare() {
    try {
      await Share.share({
        message: `I just built "${project.title}" with ACT — AI guidance for physical work. 🔧`,
        title: 'ACT',
      });
    } catch {}
  }

  const startedAt = project.startedAt ? new Date(project.startedAt) : null;
  const completedAt = project.completedAt ? new Date(project.completedAt) : null;
  const minutesTaken = startedAt && completedAt
    ? Math.round((completedAt.getTime() - startedAt.getTime()) / 60000)
    : null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <View style={[styles.iconCircle, { backgroundColor: color + '22' }]}>
            <Text style={styles.icon}>{CATEGORY_EMOJI[project.category] ?? '⚡'}</Text>
          </View>

          <Text style={styles.doneLabel}>Done.</Text>
          <Text style={styles.title}>{project.title}</Text>
          <Text style={styles.subtitle}>You made something real today.</Text>

          {minutesTaken !== null && minutesTaken > 0 && (
            <View style={[styles.timeBadge, { backgroundColor: color + '22' }]}>
              <Text style={[styles.timeText, { color }]}>{minutesTaken} minutes well spent</Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: color }]}
              onPress={onStartAnother}
            >
              <Text style={styles.nextBtnText}>Build Another →</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.dismiss} onPress={onDismiss}>
            <Text style={styles.dismissText}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: 24,
    padding: 28, alignItems: 'center', width: '100%', maxWidth: 360, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 12,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  icon: { fontSize: 34 },
  doneLabel: {
    fontSize: 13, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  timeBadge: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4,
  },
  timeText: { fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
  shareBtn: {
    flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center',
  },
  shareBtnText: { fontSize: 15, fontWeight: '700', color: colors.text },
  nextBtn: {
    flex: 2, padding: 14, borderRadius: 12, alignItems: 'center',
  },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  dismiss: { marginTop: 4 },
  dismissText: { fontSize: 13, color: colors.textLight },
});
