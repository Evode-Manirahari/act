import { Platform, TextStyle } from 'react-native';

// "Field Instrument" type — see DESIGN.md.
// TODO: bundle General Sans (display), Geist (body, tabular-nums), and
// Geist Mono (instrument accent) via expo-font in assets/fonts/. Until then,
// system fallbacks hold the structure; the monospace accent is what makes the
// numbers + section labels read like a gauge.
export const fonts = {
  display: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
  body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
} as const;

// Mono, uppercase, tracked-out — the instrument section label.
export const labelStyle: TextStyle = {
  fontFamily: fonts.mono,
  fontSize: 11,
  letterSpacing: 1,
  textTransform: 'uppercase',
};
