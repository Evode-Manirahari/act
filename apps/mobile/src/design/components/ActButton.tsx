/**
 * ActButton — the one tactile action primitive.
 *
 * variant: primary (safety-orange fill + colored lift) · secondary (surface +
 * orange rule) · danger (lockout red) · ghost. All variants meet the 48px field
 * tap target; `size="lg"` is the big field CTA. Shows a spinner while `loading`.
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing, tapTarget } from '../tokens';
import ActText from './ActText';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'md' | 'lg';

export type ActButtonProps = {
  label: string;
  detail?: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
  accessibilityLabel?: string;
};

export default function ActButton({
  label,
  detail,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  accessibilityLabel,
}: ActButtonProps) {
  const v = VARIANTS[variant];
  const inert = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inert }}
      disabled={inert}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { minHeight: size === 'lg' ? 76 : tapTarget },
        v.container,
        variant === 'primary' && shadows.cta,
        fullWidth && styles.full,
        pressed && styles.pressed,
        inert && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.spinner} />
      ) : (
        <View style={styles.stack}>
          <ActText
            variant={size === 'lg' ? 'h2' : 'bodyStrong'}
            weight="bold"
            style={[styles.labelText, { color: v.fg }]}
          >
            {label}
          </ActText>
          {detail ? (
            <ActText variant="small" style={{ color: v.detail }}>
              {detail}
            </ActText>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<
  Variant,
  { container: ViewStyle; fg: string; detail: string; spinner: string }
> = {
  primary: {
    container: { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primaryPressed },
    fg: '#FFFFFF',
    detail: 'rgba(255,255,255,0.85)',
    spinner: '#FFFFFF',
  },
  secondary: {
    container: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
    fg: colors.primary,
    detail: colors.textMuted,
    spinner: colors.primary,
  },
  danger: {
    container: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.error },
    fg: colors.error,
    detail: colors.error,
    spinner: colors.error,
  },
  ghost: {
    container: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    fg: colors.steel700,
    detail: colors.textMuted,
    spinner: colors.steel700,
  },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  full: { width: '100%' },
  stack: { alignItems: 'center', gap: 3 },
  labelText: { letterSpacing: 0.2 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
});
