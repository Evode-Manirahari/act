/**
 * ActInput — labeled text field. Mono instrument label over a steel-fill input
 * (surfaceAlt, 1px border, radius 6, >= 46 tall). `multiline` grows it and
 * top-aligns; the label is optional so it also works as a bare input.
 */
import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { colors, fonts, radii, spacing } from '../tokens';
import ActText from './ActText';

export type ActInputProps = TextInputProps & {
  label?: string;
  multiline?: boolean;
};

export default function ActInput({ label, multiline = false, style, ...rest }: ActInputProps) {
  return (
    <View style={styles.group}>
      {label ? (
        <ActText variant="label" color="textMuted">
          {label}
        </ActText>
      ) : null}
      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={colors.textLight}
        style={[styles.input, multiline && styles.multiline, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  input: {
    minHeight: 46,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.body,
  },
  multiline: { minHeight: 82, textAlignVertical: 'top' },
});
