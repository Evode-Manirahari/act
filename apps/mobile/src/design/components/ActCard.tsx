/**
 * ActCard — the neutral surface container. Border, not shadow (per the system).
 * `accent` adds a 3px left rule (steel default, or semantic warn/err/ok); `top`
 * swaps it for a 3px orange top rule (the stat-tile look). `tone` tints the
 * whole card for the lockout / caution / verified panels.
 */
import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../tokens';

type Accent = 'none' | 'steel' | 'orange' | 'warn' | 'err' | 'ok';
type Tone = 'surface' | 'warn' | 'err' | 'ok';

export type ActCardProps = {
  children: React.ReactNode;
  accent?: Accent;
  top?: boolean;
  tone?: Tone;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
};

const ACCENT_COLOR: Record<Exclude<Accent, 'none'>, string> = {
  steel: colors.borderStrong,
  orange: colors.primary,
  warn: colors.caution,
  err: colors.error,
  ok: colors.success,
};

const TONE: Record<Tone, { bg: string; border: string }> = {
  surface: { bg: colors.surface, border: colors.border },
  warn: { bg: colors.cautionLight, border: '#F1D7A8' },
  err: { bg: colors.errorLight, border: '#F3C9C9' },
  ok: { bg: colors.successLight, border: '#BCE3C6' },
};

export default function ActCard({
  children,
  accent = 'none',
  top = false,
  tone = 'surface',
  onPress,
  style,
  padded = true,
}: ActCardProps) {
  const t = TONE[tone];
  const accentColor = accent !== 'none' ? ACCENT_COLOR[accent] : undefined;
  const cardStyle: ViewStyle[] = [
    styles.card,
    { backgroundColor: t.bg, borderColor: t.border },
    padded && styles.padded,
    accentColor && !top ? { borderLeftWidth: 3, borderLeftColor: accentColor } : null,
    accentColor && top ? { borderTopWidth: 3, borderTopColor: accentColor } : null,
    style,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  padded: { padding: spacing.lg - 2 }, // 14
  pressed: { opacity: 0.92 },
});
