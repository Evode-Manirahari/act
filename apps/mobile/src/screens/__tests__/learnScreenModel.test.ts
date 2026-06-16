import {
  getVisibleTrainingCards,
  shouldShowEmptyState,
} from '../learnScreenModel';
import type { KnowledgeObject } from '../../api/libraryApi';

describe('learn screen model', () => {
  it('does not replace empty live library results with seeded demo content', () => {
    expect(getVisibleTrainingCards([])).toEqual([]);
    expect(
      shouldShowEmptyState({ loading: false, error: null, resultsCount: 0 }),
    ).toBe(true);
  });

  it('renders only cards returned by the live library endpoint', () => {
    const card = trainingCard({ id: 'ko-live-1' });

    expect(getVisibleTrainingCards([card])).toEqual([card]);
    expect(
      shouldShowEmptyState({ loading: false, error: null, resultsCount: 1 }),
    ).toBe(false);
  });

  it('does not show an empty state while loading or after an API error', () => {
    expect(
      shouldShowEmptyState({ loading: true, error: null, resultsCount: 0 }),
    ).toBe(false);
    expect(
      shouldShowEmptyState({ loading: false, error: 'search failed', resultsCount: 0 }),
    ).toBe(false);
  });
});

function trainingCard(overrides: Partial<KnowledgeObject> = {}): KnowledgeObject {
  return {
    id: overrides.id ?? 'ko-1',
    moment_id: 'm-1',
    title: 'Check airflow before charge',
    trade: 'hvac',
    situation: 'No-cool call.',
    observable_cue: 'Weak return airflow.',
    expert_reasoning: 'Restriction can mimic low charge.',
    decision: 'Verify airflow first.',
    novice_trap: 'Adding refrigerant first.',
    safety_boundary: 'Avoid running a freezing coil.',
    verification: 'Recheck split, superheat, and subcooling.',
    quiz_json: {
      question: 'What comes first?',
      choices: ['Airflow', 'Charge'],
      answer: 'Airflow',
    },
    tags_json: ['airflow'],
    status: 'published',
    created_by: 'u-1',
    published_at: '2026-05-28T00:00:00.000Z',
    created_at: '2026-05-28T00:00:00.000Z',
    ...overrides,
  };
}
