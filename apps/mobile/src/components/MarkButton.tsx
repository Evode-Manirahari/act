/**
 * Glove-friendly "mark this" button. One tap drops a teachable moment at the
 * current recording timestamp. The visible type rail lets a tech tag safety,
 * verification, and sensory cues without opening a modal.
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

const MARK_HINT: Record<MarkType, string> = {
  teachable: 'teachable moment',
  safety: 'safety boundary',
  verification: 'proof step',
  sensory: 'what changed',
  counterfactual: 'wrong turn avoided',
};

const MARK_CHIP_LABEL: Record<MarkType, string> = {
  teachable: 'Teach',
  safety: 'Safe',
  verification: 'Verify',
  sensory: 'Notice',
  counterfactual: 'Avoid',
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
        <Text style={styles.hint}>{MARK_HINT[kind]}</Text>
      </Pressable>
      <View style={styles.typeRail}>
        {MARK_CYCLE.map((type) => {
          const active = type === kind;
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityLabel={`Use ${MARK_LABEL[type]} mark type`}
              disabled={disabled}
              onPress={() => setKind(type)}
              style={({ pressed }) => [
                styles.typeChip,
                active && { borderColor: MARK_COLOR[type], backgroundColor: `${MARK_COLOR[type]}18` },
                (pressed || disabled) && styles.chipMuted,
              ]}
            >
              <Text style={[styles.typeChipText, active && { color: MARK_COLOR[type] }]}>
                {MARK_CHIP_LABEL[type]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center', justifyContent: 'center', gap: 12 },
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
  label: { color: '#fff', fontSize: 22, fontWeight: '800' },
  hint: { color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: 4, fontWeight: '600' },
  typeRail: {
    width: '100%',
    maxWidth: 330,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  typeChip: {
    minWidth: 58,
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  typeChipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  chipMuted: { opacity: 0.64 },
});
