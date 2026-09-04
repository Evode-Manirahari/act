import { describe, expect, it } from 'vitest';

import {
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
  });
});
