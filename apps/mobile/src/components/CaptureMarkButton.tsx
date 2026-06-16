/**
 * CaptureMarkButton — the dominant, glove-friendly "MARK THIS" control.
 *
 * Field Instrument styling: a big rectangular/industrial slab in safety
 * orange, NOT a playful round bubble. One obvious action while the tech
 * works.
 *
 *  - Default tap drops a mark at the CURRENT (default) mark type. The screen
 *    owns the actual mark write; this component just reports `onMark(kind)`.
 *  - Long-press cycles the active mark type (with haptic-free local state) so
 *    a tech never has to choose a taxonomy unless they want to.
 *  - The inline "+" affordance opens the mark-type rail (and is also where an
 *    "add note" entry point lives, via `onAddNote`). The rail stays hidden by
 *    default to keep the working state to ONE obvious action.
 *
 * The mark taxonomy + colors are sourced from MarkButton so the data model
 * stays the single source of truth.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { fonts, labelStyle } from '../theme/typography';
import {
  MARK_CYCLE,
  MARK_CHIP_LABEL,
  MARK_HINT,
  MARK_COLOR,
  type MarkType,
} from './MarkButton';

interface Props {
  disabled?: boolean;
  /** Drop a mark at the active type. */
  onMark: (kind: MarkType) => void;
  /** Open the note area. */
  onAddNote?: () => void;
}

export default function CaptureMarkButton({ disabled, onMark, onAddNote }: Props) {
  const [kind, setKind] = useState<MarkType>('teachable');
  const [railOpen, setRailOpen] = useState(false);
  const accent = MARK_COLOR[kind];

  function handlePress() {
    if (disabled) return;
    onMark(kind);
  }

  function cycleKind() {
    if (disabled) return;
    const idx = MARK_CYCLE.indexOf(kind);
    setKind(MARK_CYCLE[(idx + 1) % MARK_CYCLE.length]);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.slabRow}>
        {/* The dominant MARK THIS slab. Long-press cycles type. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mark this teachable moment"
          accessibilityHint="Long-press to change the mark type, or tap plus to open the type rail"
          disabled={disabled}
          onPress={handlePress}
          onLongPress={cycleKind}
          delayLongPress={500}
          style={({ pressed }) => [
            styles.slab,
            { backgroundColor: accent, borderColor: darken(kind) },
            (disabled || pressed) && styles.pressed,
          ]}
        >
          <Text style={styles.slabLabel}>MARK THIS</Text>
          <Text style={styles.slabHint}>{disabled ? 'start capture to mark' : MARK_HINT[kind]}</Text>
        </Pressable>

        {/* "+" affordance: opens the mark-type rail / note area. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open mark type rail"
          disabled={disabled}
          onPress={() => setRailOpen((v) => !v)}
          style={({ pressed }) => [
            styles.plusButton,
            railOpen && styles.plusButtonActive,
            (disabled || pressed) && styles.pressed,
          ]}
        >
          <Text style={[styles.plusGlyph, railOpen && styles.plusGlyphActive]}>+</Text>
          <Text style={[styles.plusLabel, railOpen && styles.plusLabelActive]}>TYPE</Text>
        </Pressable>
      </View>

      {/* Active-type readout — mono instrument label, always visible. */}
      <View style={styles.activeRow}>
        <View style={[styles.activeDot, { backgroundColor: accent }]} />
        <Text style={styles.activeLabel}>{MARK_CHIP_LABEL[kind].toUpperCase()}</Text>
        <Text style={styles.activeHint}>hold MARK to change · + for rail</Text>
      </View>

      {railOpen && (
        <View style={styles.rail}>
          {MARK_CYCLE.map((type) => {
            const active = type === kind;
            return (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityLabel={`Use ${MARK_CHIP_LABEL[type]} mark type`}
                disabled={disabled}
                onPress={() => setKind(type)}
                style={({ pressed }) => [
                  styles.chip,
                  active && { borderColor: MARK_COLOR[type], backgroundColor: `${MARK_COLOR[type]}18` },
                  (pressed || disabled) && styles.chipMuted,
                ]}
              >
                <View style={[styles.chipDot, { backgroundColor: MARK_COLOR[type] }]} />
                <Text style={[styles.chipText, active && { color: MARK_COLOR[type] }]}>
                  {MARK_CHIP_LABEL[type].toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
          {onAddNote && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a note"
              disabled={disabled}
              onPress={onAddNote}
              style={({ pressed }) => [styles.noteChip, (pressed || disabled) && styles.chipMuted]}
            >
              <Text style={styles.noteChipText}>+ NOTE</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// Slightly darkened accent for the slab border so it reads as a pressed
// industrial button, not a flat fill.
function darken(kind: MarkType): string {
  return kind === 'teachable' ? colors.primaryPressed : MARK_COLOR[kind];
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 10 },
  slabRow: { flexDirection: 'row', gap: 10 },
  slab: {
    flex: 1,
    minHeight: 128,
    borderRadius: 6, // square-ish instrument slab, not a round bubble
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  slabLabel: {
    color: '#FFFFFF',
    fontSize: 30,
    letterSpacing: 1.5,
    fontFamily: fonts.bold,
  },
  slabHint: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 6,
    fontFamily: fonts.medium,
  },
  pressed: { opacity: 0.78 },
  plusButton: {
    width: 72,
    minHeight: 128,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  plusButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  plusGlyph: { color: colors.steel700, fontSize: 30, fontFamily: fonts.medium, lineHeight: 32 },
  plusGlyphActive: { color: colors.primary },
  plusLabel: { ...labelStyle, color: colors.steel500, fontSize: 9 },
  plusLabelActive: { color: colors.primary },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeDot: { width: 8, height: 8, borderRadius: 2 },
  activeLabel: { ...labelStyle, color: colors.text, fontSize: 11 },
  activeHint: { color: colors.textLight, fontSize: 11, fontFamily: fonts.body, flexShrink: 1 },
  rail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
  },
  chipDot: { width: 7, height: 7, borderRadius: 2 },
  chipText: { ...labelStyle, color: colors.textMuted, fontSize: 11 },
  chipMuted: { opacity: 0.6 },
  noteChip: {
    minHeight: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteChipText: { ...labelStyle, color: colors.steel500, fontSize: 11 },
});
