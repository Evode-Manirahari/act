import { TextStyle } from 'react-native';

// "Field Instrument" type — see DESIGN.md. Real Geist family, loaded in App.tsx
// via expo-font + @expo-google-fonts. Each weight is its own named family in RN
// (custom fonts don't synthesize weight from fontWeight), so reference the
// specific weight you need. Geist Mono is the instrument accent on numbers/labels.
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

// The ONE smaller label, for dense rows (pill interiors, card meta, badges).
// Nothing in the app goes below this: 8-9px mono is unreadable on a bright
// roof, which is the whole premise of the Field Instrument system. If a label
// doesn't fit at 10px, the layout is too dense — fix the layout, not the size.
export const labelSmallStyle: TextStyle = {
  ...labelStyle,
  fontSize: 10,
  letterSpacing: 0.8,
};
