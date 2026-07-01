/**
 * ActScreen — the standard screen body. A padded, gap-spaced ScrollView with the
 * cool-steel background and hidden scrollbars, so every screen shares density and
 * safe scroll behavior. Pass `scroll={false}` for a fixed (non-scrolling) body.
 */
import React from 'react';
import {
  RefreshControlProps,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { colors, spacing } from '../tokens';

export type ActScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: ViewStyle | ViewStyle[];
  /** Screens with a submit button under a text input need "handled" so the
   * first tap presses the button instead of only dismissing the keyboard. */
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
};

export default function ActScreen({
  children,
  scroll = true,
  refreshControl,
  contentStyle,
  keyboardShouldPersistTaps,
}: ActScreenProps) {
  if (!scroll) {
    return <View style={[styles.container, styles.content, contentStyle]}>{children}</View>;
  }
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, contentStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.lg + 4, // 20
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
