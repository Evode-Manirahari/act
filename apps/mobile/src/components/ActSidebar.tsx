import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActText, colors, durations, easings, radii, spacing } from '../design';

const DRAWER_WIDTH = Math.min(320, Dimensions.get('window').width * 0.84);

export type SidebarNavItem = {
  key: string;
  label: string;
  detail: string;
  badge?: string;
  onPress: () => void;
};

export type ActSidebarProps = {
  visible: boolean;
  onClose: () => void;
  /** "+ New chat" row — opens Ask ACT fresh. Always the first, primary row. */
  onNewChat: () => void;
  items: SidebarNavItem[];
};

/**
 * Left-hand nav drawer, opened from ActAppShell's hamburger button. Field
 * Instrument reskin of the familiar chat-app sidebar: "+ New chat" up top,
 * then the app's real destinations below it — no icon library, mono
 * instrument labels, same tokens as everywhere else in the app.
 */
export default function ActSidebar({ visible, onClose, onNewChat, items }: ActSidebarProps) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(translateX, {
        toValue: 0,
        duration: durations.sheet,
        easing: easings.sheet,
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: durations.short,
        easing: easings.exit,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, mounted, translateX]);

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          style={styles.scrim}
          onPress={onClose}
        />
        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.header}>
              <ActText variant="label" color="primary" style={styles.kicker}>
                HVAC · Field Capture
              </ActText>
              <ActText variant="h1">ACT</ActText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New chat with Ask ACT"
              onPress={onNewChat}
              style={({ pressed }) => [styles.newChat, pressed && styles.pressed]}
            >
              <ActText variant="h2" color="surface" style={styles.newChatPlus}>
                +
              </ActText>
              <ActText variant="bodyStrong" color="surface">
                New chat
              </ActText>
            </Pressable>

            <ActText variant="label" color="textMuted" style={styles.sectionLabel}>
              Workspace
            </ActText>

            <View style={styles.list}>
              {items.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={item.onPress}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={styles.rowTop}>
                    <ActText variant="bodyStrong" color="ink">
                      {item.label}
                    </ActText>
                    {item.badge ? (
                      <View style={styles.badge}>
                        <ActText variant="label" color="primary" style={styles.badgeText} mono>
                          {item.badge}
                        </ActText>
                      </View>
                    ) : null}
                  </View>
                  <ActText variant="small" color="textMuted">
                    {item.detail}
                  </ActText>
                </Pressable>
              ))}
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,24,31,0.42)' },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  safe: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  header: { gap: spacing['2xs'] },
  kicker: { fontSize: 10 },
  newChat: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  newChatPlus: { lineHeight: 20 },
  sectionLabel: { marginTop: spacing.sm, fontSize: 10 },
  list: { gap: spacing['2xs'] },
  row: {
    minHeight: 56,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    gap: 2,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryLight,
  },
  badgeText: { fontSize: 9 },
  pressed: { opacity: 0.7 },
});
