// Restrained shadows. Neutral cards use BORDERS, not shadows — only the orange
// CTAs and the MARK slab get a soft, colored lift. RN style fragments.
import { colors } from '../../theme/colors';

export const shadows = {
  none: {},
  // Primary orange CTA (Record, Publish, Save, Start).
  cta: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 16,
    elevation: 6,
  },
  // The dominant MARK THIS slab — a touch stronger.
  slab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  // Bottom sheet / toast lift.
  overlay: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 40,
    elevation: 12,
  },
} as const;

export type Shadows = typeof shadows;
