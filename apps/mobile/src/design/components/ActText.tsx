/**
 * ActText — typed text primitive for the Field Instrument system.
 *
 * `variant` picks the scale (display/h1/h2/body/small); `label` is the mono,
 * uppercase, tracked instrument label used on every section header, count, and
 * tag. `mono` renders any variant in Geist Mono (for numbers/ids/timestamps).
 */
import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';

import { colors, fonts, labelStyle, type, type TypeScale } from '../tokens';

type ActColor = keyof Pick<
  typeof colors,
  'ink' | 'text' | 'textMuted' | 'textLight' | 'steel700' | 'primary' | 'success' | 'error' | 'caution' | 'surface'
>;

export type ActTextProps = TextProps & {
  variant?: TypeScale | 'label';
  color?: ActColor;
  mono?: boolean;
  weight?: keyof typeof fonts;
  style?: TextStyle | TextStyle[];
};

export default function ActText({
  variant = 'body',
  color = 'text',
  mono = false,
  weight,
  style,
  children,
  ...rest
}: ActTextProps) {
  const base: TextStyle = variant === 'label' ? { ...labelStyle } : { ...type[variant] };
  if (mono) base.fontFamily = fonts.mono;
  if (weight) base.fontFamily = fonts[weight];
  return (
    <Text {...rest} style={[base, { color: colors[color] }, style]}>
      {children}
    </Text>
  );
}
