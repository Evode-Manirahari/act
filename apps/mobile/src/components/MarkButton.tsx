/**
 * Glove-friendly "mark this" button. One tap drops a teachable moment at the
 * current recording timestamp; long-press cycles the mark type so a tech can
 * tag safety / verification / sensory cues without a modal.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';


export type MarkType = 'teachable' | 'safety' | 'verification' | 'sensory' | 'counterfactual';

const MARK_CYCLE: MarkType[] = [
  'teachable',
  'safety',
  'verification',
  'sensory',
  'counterfactual',
];

const MARK_LABEL: Record<MarkType, string> = {
  teachable: 'Mark this',
  safety: 'Safety',
  verification: 'Verified',
  sensory: 'I noticed',
  counterfactual: 'Avoid this',
};

const MARK_COLOR: Record<MarkType, string> = {
  teachable: colors.primary,
  safety: colors.error,
  verification: colors.success,
  sensory: '#8B5CF6',
  counterfactual: '#0EA5E9',
};

interface Props {
  disabled?: boolean;
  onMark: (kind: MarkType) => void;
}

export default function MarkButton({ disabled, onMark }: Props) {
  const [kind, setKind] = useState<MarkType>('teachable');

  function handlePress() {
    if (disabled) return;
    onMark(kind);
  }

  function handleLongPress() {
    if (disabled) return;
    const idx = MARK_CYCLE.indexOf(kind);
    const next = MARK_CYCLE[(idx + 1) % MARK_CYCLE.length];
    setKind(next);
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Mark ${MARK_LABEL[kind]}`}
        accessibilityHint="Long-press to change mark type"
        disabled={disabled}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: MARK_COLOR[kind] },
          (disabled || pressed) && styles.pressed,
        ]}
      >
        <Text style={styles.label}>{MARK_LABEL[kind]}</Text>
        <Text style={styles.hint}>hold to change type</Text>
      </Pressable>
    </View>
  );
}


const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  button: {
    width: 152,
    height: 152,
    borderRadius: 76,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  label: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  hint: { color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: 4, fontWeight: '600' },
});
