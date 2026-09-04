import { inferActivityId, sortActivityIds } from '../activity';
import { diagnosticCaseFromKnowledgeObject, type KnowledgeCardSource } from '../case';
import type { FieldJob, PracticeEvent } from '../evidence';
import {
  buildReadinessMatrix,
  cellFor,
  evidenceSummary,
  reviewQueue,
  type ReadinessLevelRecord,
  type Technician,
} from '../readiness';

const techs: Technician[] = [
  { id: 'maya', name: 'Maya', role: 'technician' },
  { id: 'jordan', name: 'Jordan', role: 'apprentice' },
];

const cardSource: KnowledgeCardSource = {
  id: 'case-airflow',
  moment_id: 'm1',
  title: 'Airflow before charge',
  trade: 'hvac',
  situation: 'No-cool.',
  observable_cue: 'Frost.',
  expert_reasoning: 'Restriction.',
  decision: 'Static.',
  novice_trap: 'Add gas.',
  safety_boundary: 'Power off.',
  verification: 'Split in spec.',
  tags_json: ['callback', 'airflow'],
  status: 'published',
  published_at: '2026-08-01T00:00:00.000Z',
  created_at: '2026-08-01T00:00:00.000Z',
  system_type: 'residential_split',
};

const cases = [diagnosticCaseFromKnowledgeObject(cardSource)];

const commit = (userId: string, createdAt: string, caseId = 'case-airflow'): PracticeEvent => ({
  id: `${userId}-${createdAt}-c`,
  caseId,
  userId,
  eventType: 'quiz_attempted',
  note: JSON.stringify({ kind: 'hypothesis_committed', hypothesis: 'x' }),
  createdAt,
});

const complete = (userId: string, createdAt: string, caseId = 'case-airflow'): PracticeEvent => ({
  id: `${userId}-${createdAt}-d`,
  caseId,
  userId,
  eventType: 'completed',
  note: JSON.stringify({ kind: 'hypothesis_committed', hypothesis: 'x' }),
  createdAt,
});

const variant = (userId: string, createdAt: string, caseId = 'case-airflow'): PracticeEvent => ({
  id: `${userId}-${createdAt}-v`,
  caseId,
  userId,
  eventType: 'completed',
  note: JSON.stringify({ kind: 'variant_completed' }),
  createdAt,
});

const job = (userId: string, createdAt: string, callback: boolean | null): FieldJob => ({
  id: `${userId}-${createdAt}-j`,
  userId,
  systemType: 'residential_split',
  equipmentLabel: null,
  createdAt,
  outcome: callback == null ? null : { callback, finalDiagnosis: null },
});

describe('work activity inference', () => {
  it('buckets tags, system types, and free text into the same activity', () => {
    expect(inferActivityId({ tags: ['callback', 'airflow'] })).toBe('airflow');
    expect(inferActivityId({ systemType: 'residential_split' })).toBe('no_cool_split');
    expect(inferActivityId({ equipmentLabel: 'Carrier 3-ton split, low charge' })).toBe('no_cool_split');
    expect(inferActivityId({ tags: ['rtu'] })).toBe('rtu_commercial');
  });

  it('falls back to general instead of inventing an activity', () => {
    expect(inferActivityId({ tags: ['friday'] })).toBe('general');
    expect(inferActivityId({})).toBe('general');
  });

  it('orders known activities by taxonomy and unknown ones after', () => {
    expect(sortActivityIds(['zzz', 'airflow', 'no_cool_split', 'aaa'])).toEqual([
      'no_cool_split',
      'airflow',
      'aaa',
      'zzz',
    ]);
  });
});

describe('readiness matrix', () => {
  it('aggregates practice and field evidence per tech per activity without setting a level', () => {
    const matrix = buildReadinessMatrix({
      techs,
      cases,
      events: [
        commit('maya', '2026-08-10T00:00:00.000Z'),
        complete('maya', '2026-08-10T00:10:00.000Z'),
        variant('maya', '2026-08-20T00:00:00.000Z'),
        commit('jordan', '2026-08-11T00:00:00.000Z'),
      ],
      jobs: [
        job('maya', '2026-08-12T00:00:00.000Z', true),
        job('maya', '2026-08-13T00:00:00.000Z', false),
        job('maya', '2026-08-14T00:00:00.000Z', null),
      ],
      levels: [],
    });

    const practice = cellFor(matrix, 'maya', 'airflow');
    expect(practice?.evidence).toMatchObject({
      practiceCommits: 1,
      practiceCompletions: 1,
      distinctCases: 1,
      variantsCompleted: 1,
    });
    expect(practice?.level).toBeNull();

    const field = cellFor(matrix, 'maya', 'no_cool_split');
    expect(field?.evidence).toMatchObject({ fieldJobs: 3, jobsWithOutcome: 2, callbacks: 1 });

    const jordan = cellFor(matrix, 'jordan', 'airflow');
    expect(jordan?.evidence.practiceCommits).toBe(1);
    expect(jordan?.evidence.practiceCompletions).toBe(0);
  });

  it('drops events for cases outside the published set rather than guessing', () => {
    const matrix = buildReadinessMatrix({
      techs,
      cases,
      events: [commit('maya', '2026-08-10T00:00:00.000Z', 'unknown-case')],
      jobs: [],
      levels: [],
    });
    expect(matrix.activities).toEqual([]);
    expect(matrix.cells).toEqual([]);
  });

  it('ignores events from users who are not in the roster', () => {
    const matrix = buildReadinessMatrix({
      techs,
      cases,
      events: [commit('stranger', '2026-08-10T00:00:00.000Z')],
      jobs: [],
      levels: [],
    });
    expect(matrix.cells.every((cell) => cell.evidence.practiceCommits === 0)).toBe(true);
  });

  it('suggests review when evidence exists with no level, or moved after the level was set', () => {
    const levels: ReadinessLevelRecord[] = [
      {
        techId: 'maya',
        activityId: 'no_cool_split',
        level: 'independent',
        setBy: 'lena',
        setAt: '2026-08-15T00:00:00.000Z',
        note: null,
      },
      {
        techId: 'jordan',
        activityId: 'no_cool_split',
        level: 'assist',
        setBy: 'lena',
        setAt: '2026-08-01T00:00:00.000Z',
        note: null,
      },
    ];
    const matrix = buildReadinessMatrix({
      techs,
      cases,
      events: [commit('maya', '2026-08-10T00:00:00.000Z')],
      jobs: [job('maya', '2026-08-12T00:00:00.000Z', false), job('jordan', '2026-08-12T00:00:00.000Z', false)],
      levels,
    });

    expect(cellFor(matrix, 'maya', 'airflow')?.reviewSuggested).toBe(true);
    expect(cellFor(matrix, 'maya', 'no_cool_split')?.reviewSuggested).toBe(false);
    expect(cellFor(matrix, 'jordan', 'no_cool_split')?.reviewSuggested).toBe(true);
    expect(cellFor(matrix, 'jordan', 'airflow')?.reviewSuggested).toBe(false);

    const queue = reviewQueue(matrix);
    expect(queue.map((cell) => `${cell.techId}:${cell.activityId}`)).toEqual([
      'jordan:no_cool_split',
      'maya:airflow',
    ]);
  });

  it('keeps the newest level when two exist for a cell', () => {
    const matrix = buildReadinessMatrix({
      techs,
      cases,
      events: [],
      jobs: [],
      levels: [
        { techId: 'maya', activityId: 'airflow', level: 'assist', setBy: 'lena', setAt: '2026-08-01T00:00:00.000Z', note: null },
        { techId: 'maya', activityId: 'airflow', level: 'supervised', setBy: 'lena', setAt: '2026-08-09T00:00:00.000Z', note: null },
      ],
    });
    expect(cellFor(matrix, 'maya', 'airflow')?.level?.level).toBe('supervised');
    expect(cellFor(matrix, 'maya', 'airflow')?.reviewSuggested).toBe(false);
  });

  it('summarises counts only', () => {
    expect(
      evidenceSummary({
        practiceCommits: 3,
        practiceCompletions: 2,
        distinctCases: 2,
        variantsCompleted: 1,
        fieldJobs: 4,
        jobsWithOutcome: 3,
        callbacks: 1,
        lastActivityAt: null,
      }),
    ).toBe('2 cases practiced · 1 variant · 4 jobs · 1 callback');
    expect(
      evidenceSummary({
        practiceCommits: 0,
        practiceCompletions: 0,
        distinctCases: 0,
        variantsCompleted: 0,
        fieldJobs: 0,
        jobsWithOutcome: 0,
        callbacks: 0,
        lastActivityAt: null,
      }),
    ).toBe('');
  });
});
