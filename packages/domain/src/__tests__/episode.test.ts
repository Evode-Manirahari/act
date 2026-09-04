import { inferEpisodeType, isEpisodeType } from '../episode';

describe('episode types', () => {
  it('accepts only the five high-value episode types', () => {
    expect(isEpisodeType('callback')).toBe(true);
    expect(isEpisodeType('lesson')).toBe(false);
    expect(isEpisodeType('quiz')).toBe(false);
  });

  it('lets an explicit type win', () => {
    expect(
      inferEpisodeType({ explicit: 'callback', tags: ['safety'], markType: 'teachable' }),
    ).toBe('callback');
  });

  it('reads callback from tags before the capture mark', () => {
    expect(inferEpisodeType({ tags: ['Callback'], markType: 'teachable' })).toBe('callback');
  });

  it('maps capture marks when tags are silent', () => {
    expect(inferEpisodeType({ markType: 'safety' })).toBe('near_miss');
    expect(inferEpisodeType({ markType: 'verification' })).toBe('proficiency');
    expect(inferEpisodeType({ markType: 'counterfactual' })).toBe('adaptation');
    expect(inferEpisodeType({ markType: 'teachable' })).toBe('hard_solve');
  });

  it('defaults to a hard diagnosis, not a generic lesson', () => {
    expect(inferEpisodeType({})).toBe('hard_solve');
  });
});
