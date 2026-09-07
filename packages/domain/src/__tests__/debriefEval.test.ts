import { nextDebriefQuestion } from '../completeness';
import { ANSWER_CASES, GROUNDING_CASES, NEXT_GAP_CASES } from '../evals/debriefEvalSet';
import { answerRejectReason, checkCaseGrounding, contentTokens, groundClaim } from '../grounding';
import {
  claimsFromDraft,
  currentQuestion,
  interviewComplete,
  recordAnswer,
  startInterview,
} from '../interview';

describe('eval: next debrief question', () => {
  for (const c of NEXT_GAP_CASES) {
    it(c.name, () => {
      const next = nextDebriefQuestion(c.draft, c.episodeType);
      expect(next?.gap ?? null).toBe(c.expectGap);
      if (c.expectQuestionMatches) expect(next?.question).toMatch(c.expectQuestionMatches);
    });
  }
});

describe('eval: answer acceptance', () => {
  for (const c of ANSWER_CASES) {
    it(c.name, () => {
      expect(answerRejectReason(c.answer, c.question, c.momentMeta)).toBe(c.expectReject);
    });
  }
});

describe('eval: claim grounding', () => {
  for (const c of GROUNDING_CASES) {
    it(c.name, () => {
      expect(groundClaim(c.claimId, c.claim, c.sources).grounded).toBe(c.expectGrounded);
    });
  }

  it('fails closed with reason codes, never a plausible guess', () => {
    const noEvidence = checkCaseGrounding({ claims: claimsFromDraft({ cues: 'Frost.' }) }, []);
    expect(noEvidence.publishable).toBe(false);
    expect(noEvidence.reasons).toEqual(['no_evidence']);

    const noClaims = checkCaseGrounding({ claims: [] }, GROUNDING_CASES[0].sources);
    expect(noClaims.publishable).toBe(false);
    expect(noClaims.reasons).toEqual(['no_claims']);

    const mixed = checkCaseGrounding(
      {
        claims: claimsFromDraft({
          cues: GROUNDING_CASES[0].claim,
          discriminatingTest: GROUNDING_CASES[2].claim,
        }),
      },
      GROUNDING_CASES[0].sources,
    );
    expect(mixed.publishable).toBe(false);
    expect(mixed.reasons).toEqual(['claim_ungrounded:decision']);
  });
});

describe('interview state machine', () => {
  const meta = ['measurement_threshold', '04:12', 'score 0.82'];

  it('asks one gap at a time and fills only that field', () => {
    let state = startInterview({ presentingProblem: 'No-cool, second visit.' });
    const q1 = currentQuestion(state, 'callback');
    expect(q1?.gap).toBe('cue');
    state = recordAnswer(state, q1!, 'Suction line frosted back to the compressor, return grille barely moving.', meta);
    expect(state.draft.cues).toMatch(/frosted/);
    expect(state.draft.expertReasoning).toBeUndefined();
    expect(state.turns[0].rejected).toBeNull();
    expect(state.sources).toHaveLength(1);
    expect(currentQuestion(state)?.gap).toBe('hypothesis');
  });

  it('keeps a refused answer in the record and out of the draft', () => {
    let state = startInterview({});
    const q = currentQuestion(state)!;
    state = recordAnswer(state, q, 'measurement_threshold 04:12 score 0.82', meta);
    expect(state.turns[0].rejected).toBe('answer_is_metadata');
    expect(state.draft.cues).toBeUndefined();
    expect(state.sources).toHaveLength(0);
    expect(currentQuestion(state)?.gap).toBe('cue');
  });

  it('runs to completion and the resulting claims are grounded in its own answers', () => {
    let state = startInterview({ presentingProblem: 'Frosted suction line, second visit in nine days.' });
    const answers: Record<string, string> = {
      cue: 'Suction line frosted back to the compressor and the return grille barely moved a tissue.',
      hypothesis: 'The evaporator is starving for air, not refrigerant. A return restriction gives the same low suction picture as low charge.',
      discriminating_test: 'Measure total external static across the air handler before the gauges go on.',
      causal_link: 'Frost plus a weak return means the coil is starving for air. Adding charge on visit one masked it until the coil iced again.',
      boundary: 'Kill power at the disconnect and verify with a meter before opening the blower compartment.',
      verification: 'Static back to 0.6 in. WC and an 18 to 20 degree split held through a full 15 minute cycle.',
      novice_trap: 'Reading a cold frosted suction line as proof of low charge. Frost says the coil is below freezing, not why.',
    };
    let guard = 0;
    while (!interviewComplete(state, 'callback') && guard < 10) {
      const q = currentQuestion(state, 'callback')!;
      state = recordAnswer(state, q, answers[q.gap], meta);
      guard += 1;
    }
    expect(interviewComplete(state)).toBe(true);
    expect(state.turns.map((t) => t.gap)).toEqual([
      'cue',
      'hypothesis',
      'discriminating_test',
      'causal_link',
      'boundary',
      'verification',
      'novice_trap',
    ]);
    const report = checkCaseGrounding({ claims: claimsFromDraft(state.draft, state.turns) }, state.sources);
    expect(report.publishable).toBe(true);
    expect(report.claims.every((c) => c.grounded)).toBe(true);
    expect(claimsFromDraft(state.draft, state.turns).every((c) => c.sourceRefs[0]?.startsWith('answer-'))).toBe(
      true,
    );
  });
});

describe('content tokens', () => {
  it('keeps measurements and drops function words', () => {
    expect(contentTokens('The static read 1.1 in. WC against a 0.5 rated blower.')).toEqual(
      expect.arrayContaining(['static', 'read', '1.1', '0.5', 'blower']),
    );
    expect(contentTokens('the and that with')).toEqual([]);
  });
});
