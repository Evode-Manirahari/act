// Restrained shadows. Neutral cards use BORDERS, not shadows — the orange CTA
// and the MARK slab are the only two surfaces that lift off the page.
import { colors } from '../../theme/colors';

export const shadows = {
  // Primary orange CTA (Record, Publish, Save, Start).
  cta: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 16,
    elevation: 6,
  },
  // The dominant MARK THIS slab — neutral, a touch stronger.
  slab: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
} as const;

export type Shadows = typeof shadows;
