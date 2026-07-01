/**
 * ActEmptyState — the honest empty/error surface. A capture-frame glyph (four
 * corner brackets, ties to the logo — no clip-art), a title, and a calm body.
 * Optional action renders an ActButton. Used for empty queues, empty libraries,
 * and error panels (pass tone="err" for the danger-tinted variant).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../tokens';
import ActButton from './ActButton';
import ActText from './ActText';

export type ActEmptyStateProps = {
  title: string;
  body?: string;
  tone?: 'neutral' | 'err';
  actionLabel?: string;
  onAction?: () => void;
};

export default function ActEmptyState({
  title,
  body,
  tone = 'neutral',
  actionLabel,
  onAction,
}: ActEmptyStateProps) {
  const isErr = tone === 'err';
  return (
    <View style={[styles.wrap, isErr && styles.errWrap]}>
      <View style={styles.frame}>
        <View style={[styles.cnr, styles.tl]} />
        <View style={[styles.cnr, styles.tr]} />
        <View style={[styles.cnr, styles.bl]} />
        <View style={[styles.cnr, styles.br]} />
      </View>
      <ActText variant="h2" color={isErr ? 'error' : 'text'}>
        {title}
      </ActText>
      {body ? (
        <ActText variant="small" color="textMuted" style={styles.body}>
          {body}
        </ActText>
      ) : null}
      {actionLabel && onAction ? (
        <ActButton
          label={actionLabel}
          onPress={onAction}
          variant={isErr ? 'danger' : 'secondary'}
          fullWidth={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const CNR = 13;
const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing['2xl'], paddingHorizontal: spacing.xl },
  errWrap: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: '#F3C9C9',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    borderRadius: radii.md,
    paddingVertical: spacing.xl,
  },
  frame: {
    width: 54,
    height: 54,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  cnr: { position: 'absolute', width: CNR, height: CNR, borderColor: colors.borderStrong },
  tl: { top: 13, left: 13, borderLeftWidth: 2, borderTopWidth: 2 },
  tr: { top: 13, right: 13, borderRightWidth: 2, borderTopWidth: 2 },
  bl: { bottom: 13, left: 13, borderLeftWidth: 2, borderBottomWidth: 2 },
  br: { bottom: 13, right: 13, borderRightWidth: 2, borderBottomWidth: 2 },
  body: { textAlign: 'center', maxWidth: 260 },
  action: { marginTop: spacing.sm },
});
