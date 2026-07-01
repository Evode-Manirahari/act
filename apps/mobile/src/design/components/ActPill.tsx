/**
 * ActPill — the mono, uppercase instrument tag. Used for status/mode chips and
 * type badges. A tone tints bg + border + text; `dot` shows a leading square
 * marker (its color follows the tone, or an explicit `dotColor`).
 */
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii } from '../tokens';
import ActText from './ActText';

type Tone = 'neutral' | 'orange' | 'ok' | 'err' | 'warn';

export type ActPillProps = {
  label: string;
  tone?: Tone;
  dot?: boolean;
  dotColor?: string;
  style?: ViewStyle;
};

const TONE: Record<Tone, { bg: string; border: string; fg: string }> = {
  neutral: { bg: colors.surfaceAlt, border: colors.border, fg: colors.steel700 },
  orange: { bg: colors.primaryLight, border: '#F6D3BC', fg: colors.primaryPressed },
  ok: { bg: colors.successLight, border: '#BCE3C6', fg: '#0E6B30' },
  err: { bg: colors.errorLight, border: '#EBC4C4', fg: colors.error },
  warn: { bg: colors.cautionLight, border: '#F1D7A8', fg: colors.caution },
};

export default function ActPill({ label, tone = 'neutral', dot = false, dotColor, style }: ActPillProps) {
  const t = TONE[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: dotColor ?? t.fg }]} /> : null}
      <ActText variant="label" style={{ color: t.fg, fontSize: 10 }}>
        {label}
      </ActText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  dot: { width: 7, height: 7, borderRadius: 2 },
});
