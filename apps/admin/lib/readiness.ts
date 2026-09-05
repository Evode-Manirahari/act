/**
 * Assembles readiness inputs from either the fictional demo shop or act-api.
 *
 * Live mode composes evidence from endpoints that already exist: published
 * cases, jobs + outcomes, and per-user training events. Manager-set levels
 * have no endpoint yet, so live mode carries none and says so. A read that
 * fails is reported as unconfirmed; it is never rendered as "no evidence".
 */
import {
  buildReadinessMatrix,
  demoShop,
  diagnosticCaseFromKnowledgeObject,
  fieldJobFromJob,
  practiceEventFromTrainingEvent,
  type DiagnosticCase,
  type FieldJob,
  type PracticeEvent,
  type ReadinessMatrix,
  type Technician,
} from '@act/domain';

import { api, type KnowledgeObjectOut } from './api';
import { isActAuthConfigured } from './actAuth';

export interface ReadinessData {
  source: 'demo' | 'live';
  shopName: string | null;
  matrix: ReadinessMatrix;
  cases: DiagnosticCase[];
  cards: KnowledgeObjectOut[];
  events: PracticeEvent[];
  /** Tech ids whose event read failed. Their cells are unconfirmed, not empty. */
  unconfirmedTechs: string[];
  warnings: string[];
  /** Whether the level column reflects a manager's decision or is absent. */
  levelsSource: 'manager' | 'none';
  /** Who the practice surface should treat as the learner. */
  learnerId: string | null;
}

export function demoCardsAsKnowledgeObjects(now: Date): KnowledgeObjectOut[] {
  return demoShop(now).cards.map((card) => ({
    ...card,
    quiz_json: null,
    created_by: 'demo-tech-ray',
  }));
}

export function demoReadiness(now: Date = new Date()): ReadinessData {
  const shop = demoShop(now);
  const cards = demoCardsAsKnowledgeObjects(now);
  const cases = cards.map(diagnosticCaseFromKnowledgeObject);
  return {
    source: 'demo',
    shopName: shop.shopName,
    matrix: buildReadinessMatrix({
      techs: shop.techs,
      cases,
      events: shop.events,
      jobs: shop.jobs,
      levels: shop.levels,
    }),
    cases,
    cards,
    events: shop.events,
    unconfirmedTechs: [],
    warnings: [],
    levelsSource: 'manager',
    learnerId: shop.learnerId,
  };
}

const MAX_OUTCOME_READS = 100;

export async function liveReadiness(): Promise<ReadinessData> {
  const warnings: string[] = [];

  const [cards, jobsOut, me] = await Promise.all([
    api.library('', 'hvac'),
    api.jobs(),
    isActAuthConfigured
      ? api.me().catch((e: unknown) => {
          warnings.push(`/me failed: ${e instanceof Error ? e.message : 'unknown'}`);
          return null;
        })
      : Promise.resolve(null),
  ]);
  const cases = cards.map(diagnosticCaseFromKnowledgeObject);

  const techById = new Map<string, Technician>();
  for (const job of jobsOut) {
    if (!techById.has(job.user_id)) {
      techById.set(job.user_id, { id: job.user_id, name: shortId(job.user_id), role: null });
    }
  }
  if (me) {
    techById.set(me.user_id, { id: me.user_id, name: me.email, role: me.role });
  }
  const techs = Array.from(techById.values());

  const unconfirmedTechs: string[] = [];
  const eventLists = await Promise.all(
    techs.map(async (tech) => {
      try {
        const rows = await api.apprenticeEvents(tech.id);
        return rows.map(practiceEventFromTrainingEvent);
      } catch (e) {
        unconfirmedTechs.push(tech.id);
        warnings.push(
          `events for ${tech.name} could not be read: ${e instanceof Error ? e.message : 'unknown'}`,
        );
        return [] as PracticeEvent[];
      }
    }),
  );
  const events = eventLists.flat();

  const recentJobs = [...jobsOut]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, MAX_OUTCOME_READS);
  if (jobsOut.length > recentJobs.length) {
    warnings.push(
      `outcomes read for the newest ${recentJobs.length} of ${jobsOut.length} jobs; older jobs count without outcomes`,
    );
  }
  let outcomeReadFailures = 0;
  const jobs: FieldJob[] = await Promise.all(
    recentJobs.map(async (job) => {
      try {
        return fieldJobFromJob(job, await api.jobOutcome(job.id));
      } catch {
        outcomeReadFailures += 1;
        return fieldJobFromJob(job, null);
      }
    }),
  );
  if (outcomeReadFailures > 0) {
    warnings.push(`${outcomeReadFailures} job outcome reads failed; those jobs show without an outcome`);
  }
  for (const job of jobsOut.slice(recentJobs.length)) jobs.push(fieldJobFromJob(job, null));

  return {
    source: 'live',
    shopName: null,
    matrix: buildReadinessMatrix({ techs, cases, events, jobs, levels: [] }),
    cases,
    cards,
    events,
    unconfirmedTechs,
    warnings,
    levelsSource: 'none',
    learnerId: me?.user_id ?? null,
  };
}

function shortId(id: string): string {
  return `tech ${id.slice(0, 8)}`;
}
