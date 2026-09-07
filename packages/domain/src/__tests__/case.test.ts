import { canPractice, diagnosticCaseFromKnowledgeObject } from '../case';
import type { KnowledgeCardSource } from '../case';

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

describe('diagnosticCaseFromKnowledgeObject', () => {
  it('maps a published card onto a versioned case without dropping the cue', () => {
    const diag = diagnosticCaseFromKnowledgeObject(card());
    expect(diag.episodeType).toBe('callback');
    expect(diag.status).toBe('published');
    expect(diag.cues).toBe('Weak return airflow.');
    expect(diag.discriminatingTest).toBe('Verify airflow first.');
    expect(diag.hypotheses).toHaveLength(1);
    expect(diag.claims.some((c) => c.type === 'safety_constraint')).toBe(true);
    expect(diag.safetyState).toBe('reviewed_constraint');
    expect(diag.tenantId).toBeNull();
    expect(diag.sourceExpertId).toBeNull();
  });

  it('does not treat an empty card as practiceable', () => {
    expect(
      canPractice(
        diagnosticCaseFromKnowledgeObject(
          card({ situation: null, observable_cue: null, expert_reasoning: null, decision: null }),
        ),
      ),
    ).toBe(false);
  });

  it('lets a learner practice when situation and a cue exist', () => {
    expect(canPractice(diagnosticCaseFromKnowledgeObject(card()))).toBe(true);
  });
});
