import { canSubmitDebriefAnswer, debriefBadge } from '../debriefModel';

describe('debrief answer submit predicate', () => {
  it('allows typed text', () => {
    expect(
      canSubmitDebriefAnswer({ transcript: 'warm return plus frost', audioUri: null, submitting: false }),
    ).toBe(true);
  });

  it('allows a finished recording with no text', () => {
    expect(
      canSubmitDebriefAnswer({ transcript: '', audioUri: 'file:///a.m4a', submitting: false }),
    ).toBe(true);
  });

  it('blocks empty and whitespace-only answers', () => {
    expect(canSubmitDebriefAnswer({ transcript: '', audioUri: null, submitting: false })).toBe(false);
    expect(canSubmitDebriefAnswer({ transcript: '   ', audioUri: null, submitting: false })).toBe(false);
  });

  it('blocks double-submit while sending', () => {
    expect(
      canSubmitDebriefAnswer({ transcript: 'x', audioUri: null, submitting: true }),
    ).toBe(false);
  });
});

describe('debrief badge', () => {
  it('hides at zero, counts above', () => {
    expect(debriefBadge(0)).toBeNull();
    expect(debriefBadge(-1)).toBeNull();
    expect(debriefBadge(1)).toBe('1 waiting');
    expect(debriefBadge(3)).toBe('3 waiting');
  });
});
