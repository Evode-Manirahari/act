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

export type ActSidebarAccount = {
  /** Signed-in email, shown so a shared truck phone makes the account obvious. */
  email?: string;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  /** Surfaced inline; sign-out failing shouldn't be silent. */
  error?: string | null;
};

export type ActSidebarProps = {
  visible: boolean;
  onClose: () => void;
  items: SidebarNavItem[];
  /** Account controls live here, not on the home screen. */
  account?: ActSidebarAccount;
};

/**
 * Left-hand nav drawer, opened from ActAppShell's menu button: the app's real
 * destinations, then the account footer.
 *
 * Deliberately NOT a chat-app sidebar. There is no "+ New chat" primary — the
 * first row is Record, because recording a job is what this product does; Ask
 * ACT is one destination among several, not the reason the drawer exists.
 */
export default function ActSidebar({ visible, onClose, items, account }: ActSidebarProps) {
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
              <ActText variant="label" color="primary">
                HVAC · Field Capture
              </ActText>
              <ActText variant="h1">ACT</ActText>
            </View>

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
                        <ActText variant="label" color="primary" mono style={styles.badgeText}>
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

            {account ? (
              <View style={styles.account}>
                {account.email ? (
                  <ActText variant="label" color="textMuted" numberOfLines={1}>
                    {account.email}
                  </ActText>
                ) : null}
                {account.error ? (
                  <ActText variant="small" color="caution">
                    {account.error}
                  </ActText>
                ) : null}
                <View style={styles.accountActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sign out"
                    onPress={account.onSignOut}
                    style={({ pressed }) => [styles.accountButton, pressed && styles.pressed]}
                  >
                    <ActText variant="small" weight="semibold" color="steel700">
                      Sign out
                    </ActText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete my account"
                    onPress={account.onDeleteAccount}
                    style={({ pressed }) => [styles.accountButton, pressed && styles.pressed]}
                  >
                    <ActText variant="small" weight="semibold" color="error">
                      Delete account
                    </ActText>
                  </Pressable>
                </View>
              </View>
            ) : null}
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
  badgeText: {},
  account: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  accountActions: { flexDirection: 'row', gap: spacing.sm },
  accountButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  pressed: { opacity: 0.7 },
});
