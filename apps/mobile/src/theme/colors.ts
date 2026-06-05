// "Field Instrument" palette — see DESIGN.md. Industrial/utilitarian, light-first,
// one hi-vis action color (safety orange), cool steel neutrals, loud safety semantics.
export const colors = {
  primary: '#EA580C',        // safety orange — the single action color
  primaryLight: '#FFF4ED',   // orange tint (chips, pressed surfaces)
  primaryPressed: '#C2410C',
  background: '#F5F6F7',      // cool steel neutral
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F2',
  text: '#14181F',           // ink
  textMuted: '#586170',      // steel-500
  textLight: '#8A929C',
  border: '#E4E7EB',         // steel-100
  borderStrong: '#C3C9D0',   // steel-300
  ink: '#14181F',

  // steel neutral scale
  steel100: '#E4E7EB',
  steel300: '#C3C9D0',
  steel500: '#586170',
  steel700: '#2B313B',
  steel900: '#14181F',

  // semantic — loud where it matters
  success: '#15803D',        // verified
  successLight: '#DCFCE7',
  error: '#C81E1E',          // danger / lockout
  errorLight: '#FDEBEB',
  caution: '#B45309',
  cautionLight: '#FEF3C7',

  // legacy project-category colors (retained so old screens don't break)
  make: '#3B82F6',
  makeLight: '#DBEAFE',
  improve: '#8B5CF6',
  improveLight: '#EDE9FE',
  grow: '#15803D',
  growLight: '#DCFCE7',
  create: '#EA580C',
  createLight: '#FFF4ED',

  // ACT chat bubbles
  actBubble: '#FFFFFF',
  actBubbleBorder: '#E4E7EB',
  userBubble: '#EA580C',
  userBubbleText: '#FFFFFF',
} as const;

export type Colors = typeof colors;
