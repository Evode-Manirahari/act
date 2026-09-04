import { compareCommitToExpert, overlap } from '../feedback';
import { diagnosticCaseFromKnowledgeObject } from '../case';
import type { KnowledgeCardSource } from '../case';

const card: KnowledgeCardSource = {
  id: 'ko-1',
  moment_id: 'm-1',
  title: 'Airflow before charge',
  trade: 'hvac',
  situation: 'No-cool call.',
  observable_cue: 'Weak return airflow at the grille.',
  expert_reasoning: 'Restriction can mimic low charge.',
  decision: 'Verify airflow first.',
  novice_trap: 'Adding refrigerant first.',
  safety_boundary: 'Do not run a freezing coil.',
  verification: 'Recheck split.',
  tags_json: [],
  status: 'published',
  published_at: '2026-08-01T00:00:00.000Z',
  created_at: '2026-08-01T00:00:00.000Z',
};

describe('expert comparison', () => {
  it('does not score a commit as correct or incorrect', () => {
    const lines = compareCommitToExpert(diagnosticCaseFromKnowledgeObject(card), {
      cue: 'I thought the filter was dirty',
      hypothesis: 'low charge',
      nextTest: 'add refrigerant',
      rationale: 'frost on the line',
    });
    expect(lines.map((line) => line.dimension)).toEqual([
      'cue',
      'hypothesis',
      'test',
      'safety',
      'trap',
    ]);
    expect(lines.every((line) => typeof line.expert === 'string')).toBe(true);
  });

  it('treats token overlap as a hint, not a grade', () => {
    expect(overlap('weak return airflow', 'weak airflow at return')).toBeGreaterThan(0.3);
    expect(overlap('weak return airflow', 'add refrigerant')).toBe(0);
  });
});
