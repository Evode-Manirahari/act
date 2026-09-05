import {
  countDue,
  getVisibleTrainingCards,
  isVariantDue,
  orderCards,
  scheduleCards,
  shouldShowEmptyState,
} from '../learnScreenModel';
import type { KnowledgeObject, TrainingEvent } from '../../api/libraryApi';

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

describe('delayed variants on Learn', () => {
  const now = new Date('2026-09-05T12:00:00.000Z');
  const DAY = 24 * 60 * 60 * 1000;
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY).toISOString();
  const completed = (cardId: string, daysAgo: number, userId = 'me'): TrainingEvent => ({
    id: `${cardId}-${daysAgo}`,
    knowledge_object_id: cardId,
    user_id: userId,
    event_type: 'completed',
    score: null,
    note: JSON.stringify({ kind: 'hypothesis_committed' }),
    created_at: at(daysAgo),
  });
  const cards = [trainingCard({ id: 'fresh' }), trainingCard({ id: 'due' }), trainingCard({ id: 'waiting' })];

  it('shows nothing and opens nothing in variant mode when history could not be read', () => {
    const schedules = scheduleCards(cards, null, 'me', now);
    expect(schedules.size).toBe(0);
    expect(countDue(schedules)).toBe(0);
    expect(orderCards(cards, schedules).map((c) => c.id)).toEqual(['fresh', 'due', 'waiting']);
  });

  it('puts due variants first, untouched next, waiting after', () => {
    const history = [completed('due', 9), completed('waiting', 2)];
    const schedules = scheduleCards(cards, history, 'me', now);
    expect(isVariantDue(schedules.get('due'))).toBe(true);
    expect(isVariantDue(schedules.get('waiting'))).toBe(false);
    expect(countDue(schedules)).toBe(1);
    expect(orderCards(cards, schedules).map((c) => c.id)).toEqual(['due', 'fresh', 'waiting']);
  });

  it('ignores another learner\'s history', () => {
    const schedules = scheduleCards(cards, [completed('due', 9, 'someone-else')], 'me', now);
    expect(schedules.get('due')?.status).toBe('not_started');
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
