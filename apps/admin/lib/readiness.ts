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
  type ReadinessLevel,
  type ReadinessLevelRecord,
  type ReadinessMatrix,
  type Technician,
} from '@act/domain';

import { api, type KnowledgeObjectOut } from './api';
import { isActAuthConfigured } from './actAuth';
import { applyDemoOverrides, isReadinessLevel, type DemoLevelOverride } from './levels';
import { rosterFromEnv } from './roster';

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
  /** manager: read from a store. none: no store exists yet. unconfirmed: the read failed. */
  levelsSource: 'manager' | 'none' | 'unconfirmed';
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

export function demoReadiness(now: Date = new Date(), overrides: DemoLevelOverride[] = []): ReadinessData {
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
      levels: applyDemoOverrides(shop.levels, overrides, shop.managerId),
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

  // act-api has no /users yet. Names come from the admin's roster config
  // (ACT_TECH_ROSTER); anyone not in it shows as an id prefix, never a guess.
  const roster = rosterFromEnv(process.env.ACT_TECH_ROSTER);
  const techById = new Map<string, Technician>();
  for (const job of jobsOut) {
    if (!techById.has(job.user_id)) {
      const entry = roster.get(job.user_id);
      techById.set(job.user_id, {
        id: job.user_id,
        name: entry?.name ?? shortId(job.user_id),
        role: entry?.role ?? null,
      });
    }
  }
  if (me) {
    const entry = roster.get(me.user_id);
    techById.set(me.user_id, { id: me.user_id, name: entry?.name ?? me.email, role: entry?.role ?? me.role });
  }
  const techs = Array.from(techById.values());
  if (roster.size === 0 && techs.length > 0) {
    warnings.push('no ACT_TECH_ROSTER set; technicians show as id prefixes');
  }

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

  // The endpoint is specified (docs/act-api-handoff.md) but not deployed. A
  // 404 means "not there yet"; any other failure is a failed read and is
  // reported, not rendered as "no levels".
  let levels: ReadinessLevelRecord[] = [];
  let levelsSource: ReadinessData['levelsSource'] = 'none';
  try {
    levels = (await api.readinessLevels())
      .filter((row): row is typeof row & { level: ReadinessLevel } => isReadinessLevel(row.level))
      .map((row) => ({
        techId: row.tech_user_id,
        activityId: row.activity_id,
        level: row.level,
        setBy: roster.get(row.set_by_user_id)?.name ?? shortId(row.set_by_user_id),
        setAt: row.set_at,
        note: row.note,
      }));
    levelsSource = 'manager';
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown';
    if (!/ -> 404:/.test(message)) {
      warnings.push(`levels could not be read: ${message}`);
      levelsSource = 'unconfirmed';
    }
  }

  return {
    source: 'live',
    shopName: null,
    matrix: buildReadinessMatrix({ techs, cases, events, jobs, levels }),
    cases,
    cards,
    events,
    unconfirmedTechs,
    warnings,
    levelsSource,
    learnerId: me?.user_id ?? null,
  };
}

function shortId(id: string): string {
  return `tech ${id.slice(0, 8)}`;
}
