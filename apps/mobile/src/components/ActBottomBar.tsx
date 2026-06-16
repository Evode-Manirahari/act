import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { fonts, labelStyle } from '../theme/typography';

/**
 * The bottom "Ask ACT" bar. When wired (Prompt 6 / P2), Ask ACT answers
 * questions about published cards, past jobs, and callbacks — never live job
 * diagnosis. Until that endpoint exists, this renders as an honest, inert
 * placeholder (a "soon" tag) rather than a fake input that does nothing.
 *
 * Pass `onPress` once the Ask panel exists to make it interactive.
 */
export type ActBottomBarProps = {
  placeholder?: string;
  onPress?: () => void;
};

export default function ActBottomBar({
  placeholder = 'Ask ACT about a job, card, or callback',
  onPress,
}: ActBottomBarProps) {
  const Inner = (
    <View style={styles.field}>
      <Text style={styles.plus}>+</Text>
      <Text style={styles.placeholder} numberOfLines={1}>
        {placeholder}
      </Text>
      {onPress ? <Mic /> : <Text style={styles.soon}>soon</Text>}
    </View>
  );

  if (!onPress) {
    return <View style={styles.wrap}>{Inner}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={placeholder}
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      {Inner}
    </Pressable>
  );
}

function Mic() {
  // Dependency-free mic glyph: a rounded capsule on a stand.
  return (
    <View style={styles.mic}>
      <View style={styles.micCapsule} />
      <View style={styles.micStand} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingVertical: 10 },
  pressed: { opacity: 0.7 },
  field: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  plus: { color: colors.steel500, fontSize: 18, fontFamily: fonts.medium },
  placeholder: { flex: 1, color: colors.textMuted, fontSize: 14, fontFamily: fonts.body },
  soon: { ...labelStyle, color: colors.textLight, fontSize: 9 },
  mic: { width: 16, alignItems: 'center', gap: 1 },
  micCapsule: { width: 9, height: 13, borderRadius: 4.5, backgroundColor: colors.steel500 },
  micStand: { width: 12, height: 2, borderRadius: 1, backgroundColor: colors.steel500 },
});
