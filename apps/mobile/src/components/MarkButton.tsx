/**
 * Mark taxonomy — the single source of truth for teachable-moment types.
 *
 * The on-screen control is CaptureMarkButton (the Field Instrument slab). This
 * module holds only the shared data model — types, cycle order, labels, hints,
 * and colors — so the slab and any future surface stay in lockstep. The legacy
 * round-bubble MarkButton was removed once CaptureMarkButton replaced it; the
 * design system uses a squared industrial slab, not a round bubble.
 */
import { colors } from '../theme/colors';


export type MarkType = 'teachable' | 'safety' | 'verification' | 'sensory' | 'counterfactual';

// Order the long-press / rail cycles through.
export const MARK_CYCLE: MarkType[] = [
  'teachable',
  'safety',
  'verification',
  'sensory',
  'counterfactual',
];

export const MARK_LABEL: Record<MarkType, string> = {
  teachable: 'Mark this',
  safety: 'Safety',
  verification: 'Verified',
  sensory: 'I noticed',
  counterfactual: 'Avoid this',
};

export const MARK_HINT: Record<MarkType, string> = {
  teachable: 'teachable moment',
  safety: 'safety boundary',
  verification: 'proof step',
  sensory: 'what changed',
  counterfactual: 'wrong turn avoided',
};

export const MARK_CHIP_LABEL: Record<MarkType, string> = {
  teachable: 'Teach',
  safety: 'Safe',
  verification: 'Verify',
  sensory: 'Notice',
  counterfactual: 'Avoid',
};

// Field Instrument taxonomy: teachable=orange, safety=red, verify=green, and
// sensory/counterfactual stay in the steel/ink family (no purple/sky) to hold
// the "one action color, restraint" direction.
export const MARK_COLOR: Record<MarkType, string> = {
  teachable: colors.primary,   // #EA580C
  safety: colors.error,        // #C81E1E
  verification: colors.success,// #15803D
  sensory: colors.steel500,    // #586170 (was #8B5CF6 purple)
  counterfactual: colors.ink,  // #14181F (was #0EA5E9 sky)
};
