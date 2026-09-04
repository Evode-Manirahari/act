/**
 * Commit-first case player. Expert guidance is hidden until the learner
 * states a hypothesis and next test. Skipping ahead is not a legal transition.
 */
export type PlayerStage = 'safety' | 'commit' | 'challenge' | 'reveal' | 'reflect' | 'complete';

export interface LearnerCommit {
  cue: string;
  hypothesis: string;
  nextTest: string;
  rationale: string;
}

export interface PlayerState {
  stage: PlayerStage;
  commit: LearnerCommit;
  disconfirm: string;
  reflection: string;
}

export type PlayerEvent =
  | { type: 'acknowledge_safety' }
  | { type: 'set_commit'; field: keyof LearnerCommit; value: string }
  | { type: 'submit_commit' }
  | { type: 'set_disconfirm'; value: string }
  | { type: 'submit_challenge' }
  | { type: 'continue_reveal' }
  | { type: 'set_reflection'; value: string }
  | { type: 'submit_reflect' };

const EMPTY_COMMIT: LearnerCommit = {
  cue: '',
  hypothesis: '',
  nextTest: '',
  rationale: '',
};

export function initialPlayerState(input: { hasSafety: boolean }): PlayerState {
  return {
    stage: input.hasSafety ? 'safety' : 'commit',
    commit: { ...EMPTY_COMMIT },
    disconfirm: '',
    reflection: '',
  };
}

export function filled(value: string): boolean {
  return value.trim().length > 0;
}

export function commitReady(commit: LearnerCommit): boolean {
  return (
    filled(commit.cue) &&
    filled(commit.hypothesis) &&
    filled(commit.nextTest) &&
    filled(commit.rationale)
  );
}

export function expertHidden(stage: PlayerStage): boolean {
  return stage === 'safety' || stage === 'commit' || stage === 'challenge';
}

export function reducePlayer(state: PlayerState, event: PlayerEvent): PlayerState {
  switch (event.type) {
    case 'acknowledge_safety':
      if (state.stage !== 'safety') return state;
      return { ...state, stage: 'commit' };
    case 'set_commit':
      if (state.stage !== 'commit') return state;
      return {
        ...state,
        commit: { ...state.commit, [event.field]: event.value },
      };
    case 'submit_commit':
      if (state.stage !== 'commit' || !commitReady(state.commit)) return state;
      return { ...state, stage: 'challenge' };
    case 'set_disconfirm':
      if (state.stage !== 'challenge') return state;
      return { ...state, disconfirm: event.value };
    case 'submit_challenge':
      if (state.stage !== 'challenge' || !filled(state.disconfirm)) return state;
      return { ...state, stage: 'reveal' };
    case 'continue_reveal':
      if (state.stage !== 'reveal') return state;
      return { ...state, stage: 'reflect' };
    case 'set_reflection':
      if (state.stage !== 'reflect') return state;
      return { ...state, reflection: event.value };
    case 'submit_reflect':
      if (state.stage !== 'reflect' || !filled(state.reflection)) return state;
      return { ...state, stage: 'complete' };
    default:
      return state;
  }
}

export const CHALLENGE_PROMPT =
  'What evidence would make your hypothesis wrong?';

export function commitEventNote(commit: LearnerCommit, disconfirm: string, reflection: string): string {
  return JSON.stringify({
    kind: 'hypothesis_committed',
    cue: commit.cue.trim(),
    hypothesis: commit.hypothesis.trim(),
    next_test: commit.nextTest.trim(),
    rationale: commit.rationale.trim(),
    disconfirm: disconfirm.trim(),
    reflection: reflection.trim(),
  });
}
