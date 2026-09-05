import { DEMO_DEBRIEF } from '../demoDebrief';
import { checkCaseGrounding } from '../grounding';
import { claimsFromDraft, currentQuestion, interviewComplete, recordAnswer, startInterview } from '../interview';

describe('demo debrief script', () => {
  it('refuses the bad answer for the reason the incident taught', () => {
    const state = startInterview(DEMO_DEBRIEF.base, DEMO_DEBRIEF.transcript);
    const q = currentQuestion(state, DEMO_DEBRIEF.episodeType)!;
    const after = recordAnswer(state, q, DEMO_DEBRIEF.badAnswer, DEMO_DEBRIEF.momentMeta);
    expect(after.turns[0].rejected).toBe('answer_is_metadata');
    expect(after.draft.cues).toBeUndefined();
  });

  it('runs to a complete, grounded, publishable draft on the scripted answers', () => {
    let state = startInterview(DEMO_DEBRIEF.base, DEMO_DEBRIEF.transcript);
    let guard = 0;
    while (!interviewComplete(state, DEMO_DEBRIEF.episodeType) && guard < 10) {
      const q = currentQuestion(state, DEMO_DEBRIEF.episodeType)!;
      state = recordAnswer(state, q, DEMO_DEBRIEF.answers[q.gap], DEMO_DEBRIEF.momentMeta);
      guard += 1;
    }
    expect(state.turns).toHaveLength(7);
    expect(state.turns.every((t) => t.rejected === null)).toBe(true);
    const report = checkCaseGrounding({ claims: claimsFromDraft(state.draft) }, state.sources);
    expect(report.reasons).toEqual([]);
    expect(report.publishable).toBe(true);
  });

  it('carries demo ids only, so nothing here can be mistaken for a field recording', () => {
    expect(DEMO_DEBRIEF.caseId.startsWith('demo-')).toBe(true);
    expect(DEMO_DEBRIEF.transcript.every((s) => s.id.startsWith('demo-'))).toBe(true);
  });
});
