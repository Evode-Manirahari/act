// Durable, slightly squared corners — never bubbly SaaS. Default is `md` (6).
// Chips and status tags use `sm` (squared instrument tag), NOT a rounded pill;
// there is deliberately no 999 token, so a pill can't be reached for by habit.
export const radii = {
  sm: 4,
  md: 6, // cards, buttons, inputs — the default
  lg: 8, // the largest corner in the app
} as const;

export type Radii = typeof radii;
