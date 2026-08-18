// "Field Instrument" palette — see DESIGN.md. Industrial/utilitarian, light-first,
// one hi-vis action color (safety orange), cool steel neutrals, loud safety semantics.
//
// Every semantic family (orange / ok / warn / err) is a complete 4-role ramp:
//   base   — the loud color itself (rules, icons, solid fills)
//   Light  — the tint used as a panel background
//   Border — the hairline that separates that tint from the page
//   Ink    — text that stays readable ON the tint (base is too light to read)
// Components must never invent a fifth value. If a shade is missing here, add it
// here; a one-off hex in a StyleSheet is how the four families drifted before.
export const colors = {
  primary: '#EA580C',        // safety orange — the single action color
  primaryLight: '#FFF4ED',   // orange tint (chips, pressed surfaces)
  primaryBorder: '#F6D3BC',
  primaryPressed: '#C2410C', // doubles as ink-on-tint
  background: '#F5F6F7',      // cool steel neutral
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F2',
  text: '#14181F',           // ink
  textMuted: '#586170',      // steel-500
  textLight: '#8A929C',
  border: '#E4E7EB',         // steel-100
  borderStrong: '#C3C9D0',   // steel-300
  ink: '#14181F',
  /** Text/glyphs on any solid color fill (orange CTA, danger button, ink panel). */
  onSolid: '#FFFFFF',

  // steel neutral scale
  steel100: '#E4E7EB',
  steel300: '#C3C9D0',
  steel500: '#586170',
  steel700: '#2B313B',
  steel900: '#14181F',

  // semantic — loud where it matters
  success: '#15803D',        // verified
  successLight: '#E7F5EC',
  successBorder: '#BCE3C6',
  successInk: '#0E6B30',
  error: '#C81E1E',          // danger / lockout
  errorLight: '#FDEBEB',
  errorBorder: '#EBC4C4',
  errorInk: '#7A1212',
  caution: '#B45309',
  cautionLight: '#FEF3C7',
  cautionBorder: '#F1D7A8',
  cautionInk: '#7C3B06',
} as const;

export type Colors = typeof colors;
