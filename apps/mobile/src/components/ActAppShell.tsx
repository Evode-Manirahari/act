import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { fonts, labelStyle } from '../theme/typography';

/**
 * Shared chrome for every ACT screen — the "calm workspace" shell.
 *
 * Top row: left menu/history button · center mode pill · right primary
 * shortcut. The screen owns the main area (scroll, state, workflow), so the
 * shell never imposes a ScrollView. An optional bottom bar (ActBottomBar)
 * docks above the safe-area inset.
 *
 * This is a field instrument, not a chat app: square-ish corners, steel
 * neutrals, one orange action color, mono instrument labels.
 */
export type ActAppShellProps = {
  /** Center mode pill, e.g. "Capture", "Review", "Training". */
  mode: string;
  /** Top-right shortcut label, e.g. "Record". Omit to hide it. */
  rightLabel?: string;
  onRightPress?: () => void;
  /** Menu / history affordance (placeholder until the drawer lands). */
  onMenuPress?: () => void;
  /** Docked bottom bar (e.g. <ActBottomBar />). */
  bottomBar?: React.ReactNode;
  children: React.ReactNode;
};

export default function ActAppShell({
  mode,
  rightLabel,
  onRightPress,
  onMenuPress,
  bottomBar,
  children,
}: ActAppShellProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <View style={styles.side}>
          <MenuButton onPress={onMenuPress} />
        </View>
        <ModePill label={mode} />
        <View style={[styles.side, styles.sideRight]}>
          {rightLabel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={rightLabel}
              onPress={onRightPress}
              style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}
            >
              <Text style={styles.shortcutLabel}>{rightLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.main}>{children}</View>

      {bottomBar ? <View style={styles.bottom}>{bottomBar}</View> : null}
    </SafeAreaView>
  );
}

function MenuButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Menu and history"
      onPress={onPress}
      style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
    >
      <View style={styles.menuBar} />
      <View style={styles.menuBar} />
      <View style={styles.menuBar} />
    </Pressable>
  );
}

function ModePill({ label }: { label: string }) {
  return (
    <View style={styles.modePill}>
      <View style={styles.modeDot} />
      <Text style={styles.modeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  side: { minWidth: 64, justifyContent: 'center' },
  sideRight: { alignItems: 'flex-end' },
  // 44px tap target; three steel bars = instrument menu glyph (no icon lib).
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 4,
  },
  menuBar: { height: 2, borderRadius: 1, backgroundColor: colors.steel700 },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  modeLabel: { ...labelStyle, color: colors.steel700, fontSize: 11 },
  shortcut: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutLabel: { color: colors.primary, fontSize: 15, fontFamily: fonts.semibold },
  pressed: { opacity: 0.6 },
  main: { flex: 1 },
  bottom: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
