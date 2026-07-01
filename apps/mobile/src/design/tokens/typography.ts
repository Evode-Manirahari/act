// Design-system type — canonical source is src/theme/typography.ts. Re-exported
// (plus a `type` scale for the primitives) so design/ components have the full
// set in one import. Geist Sans for text; Geist Mono is the instrument accent on
// every number, id, timestamp, count, mark type, and section label.
import { TextStyle } from 'react-native';

export { fonts, labelStyle } from '../../theme/typography';
import { fonts } from '../../theme/typography';

// Named scale used by ActText + screens. Display uses tight tracking; body 15/22.
export const type = {
  display: { fontFamily: fonts.display, fontSize: 27, lineHeight: 32, letterSpacing: -0.4 } as TextStyle,
  h1: { fontFamily: fonts.bold, fontSize: 21, lineHeight: 26, letterSpacing: -0.2 } as TextStyle,
  h2: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 } as TextStyle,
  bodyStrong: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 } as TextStyle,
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 } as TextStyle,
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 } as TextStyle,
} as const;

export type TypeScale = keyof typeof type;
