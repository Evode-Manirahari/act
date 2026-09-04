/**
 * High-value episode types. Not every job becomes a case — only these.
 * Callbacks are the wedge; the rest keep the library from becoming only mistakes.
 */
export const EPISODE_TYPES = [
  'callback',
  'near_miss',
  'hard_solve',
  'adaptation',
  'proficiency',
] as const;

export type EpisodeType = (typeof EPISODE_TYPES)[number];

export const EPISODE_LABEL: Record<EpisodeType, string> = {
  callback: 'Callback',
  near_miss: 'Near miss',
  hard_solve: 'Hard diagnosis',
  adaptation: 'Adaptation',
  proficiency: 'Proficiency',
};

const TAG_ALIASES: Record<string, EpisodeType> = {
  callback: 'callback',
  callbacks: 'callback',
  recovery: 'callback',
  'near-miss': 'near_miss',
  near_miss: 'near_miss',
  nearmiss: 'near_miss',
  safety: 'near_miss',
  'hard-solve': 'hard_solve',
  hard_solve: 'hard_solve',
  diagnosis: 'hard_solve',
  adaptation: 'adaptation',
  workaround: 'adaptation',
  proficiency: 'proficiency',
  verification: 'proficiency',
};

export type CaptureMarkType =
  | 'teachable'
  | 'safety'
  | 'verification'
  | 'sensory'
  | 'counterfactual';

const MARK_TO_EPISODE: Record<CaptureMarkType, EpisodeType> = {
  teachable: 'hard_solve',
  sensory: 'hard_solve',
  safety: 'near_miss',
  verification: 'proficiency',
  counterfactual: 'adaptation',
};

export function isEpisodeType(value: unknown): value is EpisodeType {
  return typeof value === 'string' && (EPISODE_TYPES as readonly string[]).includes(value);
}

/** Tags win over marks so a lead can label a callback that was marked "teachable". */
export function inferEpisodeType(input: {
  tags?: string[] | null;
  markType?: CaptureMarkType | string | null;
  explicit?: string | null;
}): EpisodeType {
  if (isEpisodeType(input.explicit)) return input.explicit;
  for (const tag of input.tags ?? []) {
    const key = tag.trim().toLowerCase().replace(/\s+/g, '_');
    if (TAG_ALIASES[key]) return TAG_ALIASES[key];
  }
  if (input.markType && input.markType in MARK_TO_EPISODE) {
    return MARK_TO_EPISODE[input.markType as CaptureMarkType];
  }
  return 'hard_solve';
}
