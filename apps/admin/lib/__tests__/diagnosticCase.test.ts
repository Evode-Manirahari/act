import { describe, expect, it } from 'vitest';

import {
  attachEvidence,
  diagnosticCaseFromKnowledgeObject,
  nextDebriefQuestion,
} from '@act/domain';

describe('admin case mapping', () => {
  it('asks one more debrief question when verification is missing', () => {
    const diag = diagnosticCaseFromKnowledgeObject({
      id: 'ko-1',
      moment_id: 'm-1',
      title: 'Airflow before charge',
      trade: 'hvac',
      situation: 'No-cool call.',
      observable_cue: 'Weak return.',
      expert_reasoning: 'Restriction mimics low charge.',
      decision: 'Check static pressure.',
      novice_trap: 'Add refrigerant first.',
      safety_boundary: 'Isolate power.',
      verification: null,
      tags_json: ['callback'],
      status: 'draft',
      published_at: null,
      created_at: '2026-08-01T00:00:00.000Z',
    });
    expect(diag.episodeType).toBe('callback');
    expect(nextDebriefQuestion(diag)?.gap).toBe('verification');
    expect(diag.safetyState).toBe('lead_review_required');
    expect(diag.claims.every((claim) => claim.sourceRefs.length === 0)).toBe(true);
  });

  it('does not treat a compiled field name as evidence', () => {
    const diag = diagnosticCaseFromKnowledgeObject({
      id: 'ko-1',
      moment_id: 'm-1',
      title: 'Airflow before charge',
      trade: 'hvac',
      situation: 'No-cool call.',
      observable_cue: 'Weak return.',
      expert_reasoning: 'Restriction mimics low charge.',
      decision: 'Check static pressure.',
      novice_trap: 'Add refrigerant first.',
      safety_boundary: 'Isolate power.',
      verification: 'Split returned.',
      tags_json: ['callback'],
      status: 'draft',
      published_at: null,
      created_at: '2026-08-01T00:00:00.000Z',
    });
    const bound = attachEvidence(diag, [
      {
        id: 'tr-1',
        kind: 'transcript',
        text: 'Weak return. Restriction mimics low charge. Check static pressure. Split returned. Add refrigerant first. Isolate power.',
      },
    ]);
    expect(bound.claims.every((claim) => claim.sourceRefs[0] === 'tr-1')).toBe(true);
  });
});
