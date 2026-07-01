// Durable, slightly squared corners — never bubbly SaaS. Default is `md` (6).
// `full` only for true pills/toggles and tag chips; bottom sheets use `sheet`.
export const radii = {
  sm: 4,
  md: 6, // cards, buttons, inputs — the default
  lg: 8,
  xl: 14,
  sheet: 18,
  full: 999,
} as const;

export type Radii = typeof radii;
