import { TextStyle } from 'react-native';

// "Field Instrument" type — see DESIGN.md. Real Geist family, loaded in App.tsx
// via expo-font + @expo-google-fonts. Each weight is its own named family in RN
// (custom fonts don't synthesize weight from fontWeight), so reference the
// specific weight you need. Geist Mono is the instrument accent on numbers/labels.
//
// NOTE: General Sans was the original display pick; standardized on Geist for
// clean bundling (one family, no manual font files). Swap later if desired.
export const fonts = {
  body: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  display: 'Geist_700Bold',
  mono: 'GeistMono_500Medium',
  monoSemibold: 'GeistMono_600SemiBold',
} as const;

// Mono, uppercase, tracked-out — the instrument section label.
export const labelStyle: TextStyle = {
  fontFamily: fonts.mono,
  fontSize: 11,
  letterSpacing: 1,
  textTransform: 'uppercase',
};
