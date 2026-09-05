import { demoShop } from '@act/domain';

import type { JobOut, KnowledgeObject, TrainingEvent } from '../../api/libraryApi';
import {
  assembleMyReadiness,
  jobsForUser,
  levelsSourceFromError,
  mapReadinessLevels,
} from '../readinessModel';

function trainingEventFromPractice(event: {
  id: string;
  caseId: string;
  userId: string | null;
  eventType: string;
  note: string | null;
  createdAt: string;
}): TrainingEvent {
  return {
    id: event.id,
    knowledge_object_id: event.caseId,
    user_id: event.userId,
    event_type: event.eventType,
    score: null,
    note: event.note,
    created_at: event.createdAt,
  };
}

describe('readiness model', () => {
  const now = new Date('2026-09-05T12:00:00.000Z');
  const shop = demoShop(now);
  const maya = shop.techs.find((t) => t.name.startsWith('Maya'))!;

  const card = (id: string): KnowledgeObject => ({
    id,
    moment_id: 'm-1',
    title: 'Case',
    trade: 'hvac',
    situation: 'No-cool.',
    observable_cue: 'Weak return.',
    expert_reasoning: 'Airflow first.',
    decision: 'Measure static.',
    novice_trap: 'Charge first.',
    safety_boundary: 'Power off.',
    verification: 'Split in spec.',
    quiz_json: null,
    tags_json: ['airflow'],
    status: 'published',
    created_by: 'u-1',
    published_at: now.toISOString(),
    created_at: now.toISOString(),
  });

  it('omits activities with no evidence and no level', () => {
    const { cells } = assembleMyReadiness({
      userId: maya.id,
      userName: maya.name,
      cards: [],
      events: [],
      jobs: [],
      levels: [],
    });
    expect(cells).toHaveLength(0);
  });

  it('includes cells with practice evidence or a manager-set level', () => {
    const { cells } = assembleMyReadiness({
      userId: maya.id,
      userName: maya.name,
      cards: shop.cards.map((c) => ({ ...c, quiz_json: null, created_by: 'demo' })) as KnowledgeObject[],
      events: shop.events.filter((e) => e.userId === maya.id).map(trainingEventFromPractice),
      jobs: shop.jobs.filter((j) => j.userId === maya.id).map((job) => ({ job: jobAsOut(job), outcome: job.outcome ? { callback: job.outcome.callback, final_diagnosis: job.outcome.finalDiagnosis, fix: null, callback_at: null, manager_notes: null, recorded_by: null, created_at: job.createdAt, id: 'o-1', job_id: job.id } : null })),
      levels: shop.levels.filter((l) => l.techId === maya.id),
    });
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every((c) => c.techId === maya.id)).toBe(true);
  });

  it('maps readiness level rows for this user only', () => {
    const rows = mapReadinessLevels(
      [
        {
          tech_user_id: maya.id,
          activity_id: 'airflow',
          level: 'supervised',
          set_by_user_id: 'mgr-1',
          set_at: now.toISOString(),
          note: 'Ray checks your static reads.',
        },
        {
          tech_user_id: 'other',
          activity_id: 'airflow',
          level: 'independent',
          set_by_user_id: 'mgr-1',
          set_at: now.toISOString(),
          note: null,
        },
      ],
      maya.id,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].activityId).toBe('airflow');
    expect(rows[0].note).toMatch(/static/);
  });

  it('treats 404 as no endpoint and anything else as unconfirmed', () => {
    expect(levelsSourceFromError('GET /readiness/levels -> 404: Not Found')).toBe('none');
    expect(levelsSourceFromError('GET /readiness/levels -> 502: bad gateway')).toBe('unconfirmed');
  });

  it('filters jobs to the signed-in user when building field evidence', async () => {
    const jobsOut: JobOut[] = [
      { id: 'j1', user_id: maya.id, equipment_label: null, system_type: 'split', equipment_make: null, equipment_model: null, customer_site_label: null, jurisdiction: null, status: 'done', summary: null, created_at: now.toISOString(), ended_at: null },
      { id: 'j2', user_id: 'other', equipment_label: null, system_type: 'split', equipment_make: null, equipment_model: null, customer_site_label: null, jurisdiction: null, status: 'done', summary: null, created_at: now.toISOString(), ended_at: null },
    ];
    const { jobs } = await jobsForUser(maya.id, jobsOut, async () => null);
    expect(jobs.map((j) => j.job.id)).toEqual(['j1']);
  });
});

function jobAsOut(job: { id: string; userId: string; systemType: string | null; equipmentLabel: string | null; createdAt: string }): JobOut {
  return {
    id: job.id,
    user_id: job.userId,
    equipment_label: job.equipmentLabel,
    system_type: job.systemType,
    equipment_make: null,
    equipment_model: null,
    customer_site_label: null,
    jurisdiction: null,
    status: 'done',
    summary: null,
    created_at: job.createdAt,
    ended_at: null,
  };
}
