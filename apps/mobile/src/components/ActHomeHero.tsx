import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActText, colors, radii, spacing } from '../design';
import type { SidebarNavItem } from './ActSidebar';

/** Good morning / afternoon / evening / night, from a 0-23 hour. Pure so it's testable. */
export function greetingForHour(hour: number): string {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export type ActHomeHeroProps = {
  onAsk: () => void;
  /** Reuses the sidebar's real destinations as the quick-action chip row. */
  items: SidebarNavItem[];
};

/**
 * The dark "hero" panel on PilotHome — greeting + a large Ask ACT composer +
 * quick-action chips, in the shape of a familiar chat-app home screen.
 * Scoped to this one card (not an app-wide dark mode — DESIGN.md still calls
 * the rest of the app light-first). Tapping the composer opens the existing
 * single-shot ActAskPanel; nothing about Ask ACT's behavior changes here.
 */
export default function ActHomeHero({ onAsk, items }: ActHomeHeroProps) {
  const greeting = greetingForHour(new Date().getHours());

  return (
    <View style={styles.hero}>
      <ActText variant="display" color="surface" style={styles.greeting}>
        <ActText variant="display" color="primary">
          ✳{' '}
        </ActText>
        {greeting}
      </ActText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask ACT about a job, card, or callback"
        onPress={onAsk}
        style={({ pressed }) => [styles.composer, pressed && styles.pressed]}
      >
        <ActText variant="body" color="textLight">
          What do you need from ACT?
        </ActText>
        <View style={styles.composerFooter}>
          <ActText variant="h2" color="textLight" style={styles.plus}>
            +
          </ActText>
          <Mic />
        </View>
      </Pressable>

      <View style={styles.chipsRow}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={item.onPress}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            <ActText variant="small" weight="medium" color="surface">
              {item.label}
            </ActText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Mic() {
  return (
    <View style={styles.mic}>
      <View style={styles.micCapsule} />
      <View style={styles.micStand} />
    </View>
  );
}

// 44px keeps the chip row inside RN's minimum comfortable tap height without
// forcing the full 48px field tap-target on a compact secondary control.
const CHIP_HEIGHT = 44;

const styles = StyleSheet.create({
  hero: {
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  greeting: { textAlign: 'center' },
  composer: {
    minHeight: 96,
    borderRadius: radii.lg,
    backgroundColor: colors.steel700,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  composerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plus: { lineHeight: 20 },
  pressed: { opacity: 0.7 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: CHIP_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.steel700,
    borderWidth: 1,
    borderColor: colors.steel500,
  },
  mic: { width: 16, alignItems: 'center', gap: 1 },
  micCapsule: { width: 9, height: 13, borderRadius: 4.5, backgroundColor: colors.textLight },
  micStand: { width: 12, height: 2, borderRadius: 1, backgroundColor: colors.textLight },
});
