// 8-pt spacing. Comfortable field density; interactive targets >= 48 for gloves.
export const spacing = {
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const tapTarget = 48;
export type Spacing = typeof spacing;
