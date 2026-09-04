import {
  CHALLENGE_PROMPT,
  commitReady,
  expertHidden,
  initialPlayerState,
  reducePlayer,
} from '../player';

describe('commit-first player', () => {
  it('starts at safety when a lockout exists', () => {
    expect(initialPlayerState({ hasSafety: true }).stage).toBe('safety');
    expect(initialPlayerState({ hasSafety: false }).stage).toBe('commit');
  });

  it('hides expert guidance until after the challenge', () => {
    expect(expertHidden('safety')).toBe(true);
    expect(expertHidden('commit')).toBe(true);
    expect(expertHidden('challenge')).toBe(true);
    expect(expertHidden('reveal')).toBe(false);
    expect(expertHidden('complete')).toBe(false);
  });

  it('does not accept an empty commit', () => {
    let state = initialPlayerState({ hasSafety: false });
    state = reducePlayer(state, { type: 'submit_commit' });
    expect(state.stage).toBe('commit');
    expect(commitReady(state.commit)).toBe(false);
  });

  it('refuses to skip from commit to reveal', () => {
    let state = initialPlayerState({ hasSafety: false });
    state = reducePlayer(state, { type: 'continue_reveal' });
    expect(state.stage).toBe('commit');
    expect(expertHidden(state.stage)).toBe(true);
  });

  it('walks safety → commit → challenge → reveal → reflect → complete', () => {
    let state = initialPlayerState({ hasSafety: true });
    state = reducePlayer(state, { type: 'acknowledge_safety' });
    expect(state.stage).toBe('commit');

    for (const field of ['cue', 'hypothesis', 'nextTest', 'rationale'] as const) {
      state = reducePlayer(state, { type: 'set_commit', field, value: `said ${field}` });
    }
    state = reducePlayer(state, { type: 'submit_commit' });
    expect(state.stage).toBe('challenge');
    expect(CHALLENGE_PROMPT).toMatch(/wrong/);

    state = reducePlayer(state, { type: 'set_disconfirm', value: 'stable voltage on the coil' });
    state = reducePlayer(state, { type: 'submit_challenge' });
    expect(state.stage).toBe('reveal');
    expect(expertHidden(state.stage)).toBe(false);

    state = reducePlayer(state, { type: 'continue_reveal' });
    state = reducePlayer(state, { type: 'set_reflection', value: 'I would check airflow first next time.' });
    state = reducePlayer(state, { type: 'submit_reflect' });
    expect(state.stage).toBe('complete');
  });

  it('freezes the commit after it is submitted', () => {
    let state = initialPlayerState({ hasSafety: false });
    state = reducePlayer(state, { type: 'set_commit', field: 'cue', value: 'frost' });
    state = reducePlayer(state, { type: 'set_commit', field: 'hypothesis', value: 'low charge' });
    state = reducePlayer(state, { type: 'set_commit', field: 'nextTest', value: 'weigh in' });
    state = reducePlayer(state, { type: 'set_commit', field: 'rationale', value: 'frost means starvation' });
    state = reducePlayer(state, { type: 'submit_commit' });
    state = reducePlayer(state, { type: 'set_commit', field: 'hypothesis', value: 'changed after seeing expert' });
    expect(state.commit.hypothesis).toBe('low charge');
  });
});
