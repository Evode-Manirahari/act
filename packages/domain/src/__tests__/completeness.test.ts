import { debriefComplete, missingGaps, nextDebriefQuestion } from '../completeness';

describe('debrief completeness', () => {
  it('asks for the decisive cue first', () => {
    expect(nextDebriefQuestion({})).toEqual({
      gap: 'cue',
      question: 'What did you notice that made you stop following the obvious path?',
    });
  });

  it('uses a callback-specific cue question', () => {
    expect(nextDebriefQuestion({}, 'callback')?.question).toMatch(/prevented this callback/);
  });

  it('asks one missing field at a time', () => {
    const afterCue = nextDebriefQuestion({ cues: 'Frost on the suction line.' });
    expect(afterCue?.gap).toBe('hypothesis');
    expect(missingGaps({ cues: 'Frost on the suction line.' })).not.toContain('cue');
  });

  it('is complete only when cue, reasoning, test, boundary, verification, and trap exist', () => {
    const full = {
      cues: 'Weak return.',
      expertReasoning: 'Restriction mimics low charge.',
      hypotheses: [{ label: 'restriction', support: ['cue'], refute: [] }],
      discriminatingTest: 'Measure static pressure.',
      safetyBoundary: 'Isolate power first.',
      verification: 'Split returned to spec.',
      noviceTrap: 'Add refrigerant first.',
    };
    expect(debriefComplete(full)).toBe(true);
    expect(nextDebriefQuestion(full)).toBeNull();
  });
});
