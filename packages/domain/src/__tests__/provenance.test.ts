import { diagnosticCaseFromKnowledgeObject } from '../case';
import type { KnowledgeCardSource } from '../case';
import { claimsFromDraft, currentQuestion, interviewComplete, recordAnswer, startInterview } from '../interview';
import {
  attachEvidence,
  checkMvpPublish,
  isCardFieldRef,
  learnerPrompt,
} from '../provenance';
import type { EvidenceSource } from '../grounding';

function card(overrides: Partial<KnowledgeCardSource> = {}): KnowledgeCardSource {
  return {
    id: 'ko-1',
    moment_id: 'm-1',
    title: 'Airflow before charge',
    trade: 'hvac',
    situation: 'No-cool call on a split system.',
    observable_cue: 'Weak return airflow.',
    expert_reasoning: 'Restriction can mimic low charge.',
    decision: 'Verify airflow first.',
    novice_trap: 'Adding refrigerant first.',
    safety_boundary: 'Do not run a freezing coil.',
    verification: 'Recheck split after restoring airflow.',
    tags_json: ['callback', 'airflow'],
    status: 'published',
    published_at: '2026-08-01T00:00:00.000Z',
    created_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

const transcript: EvidenceSource = {
  id: 'tr-1',
  kind: 'transcript',
  text: 'Weak return airflow. Restriction can mimic low charge. Verify airflow first. Recheck split after restoring airflow. Adding refrigerant first. Do not run a freezing coil.',
};

describe('Pilot 0 provenance', () => {
  it('does not invent tenant, expert, or job, and does not treat card fields as evidence', () => {
    const diag = diagnosticCaseFromKnowledgeObject(card());
    expect(diag.tenantId).toBeNull();
    expect(diag.sourceExpertId).toBeNull();
    expect(diag.sourceEvent.jobId).toBeNull();
    expect(diag.claims.every((claim) => claim.sourceRefs.length === 0)).toBe(true);
    expect(diag.claims.every((claim) => !claim.sourceRefs.some(isCardFieldRef))).toBe(true);

    const report = checkMvpPublish(diag, []);
    expect(report.readyForLeadReview).toBe(false);
    expect(report.reasons).toEqual(['no_evidence']);
    expect(report.unconfirmed).toEqual([
      'missing_tenant',
      'missing_source_expert',
      'missing_job_context',
    ]);
  });

  it('refuses a claim that cites the compiled card as if it were evidence', () => {
    const diag = diagnosticCaseFromKnowledgeObject(card());
    const forged = {
      ...diag,
      claims: diag.claims.map((claim) => ({
        ...claim,
        sourceRefs: [`knowledge_object.${claim.id}`],
      })),
    };
    const report = checkMvpPublish(forged, [transcript]);
    expect(report.readyForLeadReview).toBe(false);
    expect(report.reasons.some((reason) => reason.startsWith('claim_refs_card_field:'))).toBe(true);
  });

  it('binds claims to transcript spans and then is ready for lead review', () => {
    const bound = attachEvidence(
      diagnosticCaseFromKnowledgeObject(
        card({
          account_id: 'acct-1',
          job_id: 'job-1',
          source_expert_id: 'expert-1',
        }),
      ),
      [transcript],
    );
    expect(bound.evidenceIds).toEqual(['tr-1']);
    expect(bound.claims.every((claim) => claim.sourceRefs[0] === 'tr-1')).toBe(true);

    const report = checkMvpPublish(bound, [transcript]);
    expect(report.reasons).toEqual([]);
    expect(report.unconfirmed).toEqual([]);
    expect(report.readyForLeadReview).toBe(true);
    expect(report.publishable).toBe(true);
  });

  it('keeps unconfirmed identity separate from a failed read of evidence', () => {
    const bound = attachEvidence(diagnosticCaseFromKnowledgeObject(card()), [transcript]);
    const report = checkMvpPublish(bound, [transcript]);
    expect(report.reasons).toEqual([]);
    expect(report.readyForLeadReview).toBe(true);
    expect(report.publishable).toBe(false);
    expect(report.unconfirmed).toContain('missing_tenant');
  });

  it('hides the outcome from the learner prompt', () => {
    const diag = diagnosticCaseFromKnowledgeObject(card());
    const prompt = learnerPrompt(diag);
    expect(prompt).toMatch(/No-cool call/);
    expect(prompt).not.toMatch(/Recheck split/);
    expect(prompt).not.toMatch(/Verify airflow first/);
  });

  it('anchors interview claims to accepted answers, not draft field names', () => {
    const meta = ['measurement_threshold', '04:12', 'score 0.82'];
    let state = startInterview({ presentingProblem: 'Frosted suction line, second visit in nine days.' });
    const answers: Record<string, string> = {
      cue: 'Suction line frosted back to the compressor and the return grille barely moved a tissue.',
      hypothesis:
        'The evaporator is starving for air, not refrigerant. A return restriction gives the same low suction picture as low charge.',
      discriminating_test: 'Measure total external static across the air handler before the gauges go on.',
      causal_link:
        'Frost plus a weak return means the coil is starving for air. Adding charge on visit one masked it until the coil iced again.',
      boundary: 'Kill power at the disconnect and verify with a meter before opening the blower compartment.',
      verification: 'Static back to 0.6 in. WC and an 18 to 20 degree split held through a full 15 minute cycle.',
      novice_trap:
        'Reading a cold frosted suction line as proof of low charge. Frost says the coil is below freezing, not why.',
    };
    let guard = 0;
    while (!interviewComplete(state, 'callback') && guard < 10) {
      const q = currentQuestion(state, 'callback')!;
      state = recordAnswer(state, q, answers[q.gap], meta);
      guard += 1;
    }
    const claims = claimsFromDraft(state.draft, state.turns);
    expect(claims.every((claim) => claim.sourceRefs[0]?.startsWith('answer-'))).toBe(true);
    expect(claims.every((claim) => !claim.sourceRefs.some(isCardFieldRef))).toBe(true);

    const report = checkMvpPublish(
      {
        tenantId: 'acct-1',
        sourceExpertId: 'expert-1',
        sourceEvent: { type: 'callback', jobId: 'job-1', occurredAt: '2026-09-01T00:00:00.000Z' },
        presentingProblem: state.draft.presentingProblem ?? null,
        decisionPoint: state.draft.presentingProblem ?? null,
        title: 'Callback',
        cues: state.draft.cues ?? null,
        expertReasoning: state.draft.expertReasoning ?? null,
        discriminatingTest: state.draft.discriminatingTest ?? null,
        action: state.draft.discriminatingTest ?? null,
        verification: state.draft.verification ?? null,
        outcome: null,
        noviceTrap: state.draft.noviceTrap ?? null,
        safetyBoundary: state.draft.safetyBoundary ?? null,
        safetyState: 'lead_review_required',
        claims,
      },
      state.sources,
    );
    expect(report.reasons).toEqual([]);
    expect(report.publishable).toBe(true);
  });
});
