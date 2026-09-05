/**
 * Readiness matrix: technician × work activity.
 *
 * Each cell carries the evidence (practice, delayed variants, field jobs,
 * callbacks) and the level a manager set. Nothing in this file computes a
 * level. The most it does is flag a cell where the evidence has moved since
 * the manager last looked, so the manager knows where to spend attention.
 */
import { activityById, inferActivityId, sortActivityIds, type WorkActivity } from './activity';
import type { DiagnosticCase } from './case';
import {
  isCommitEvent,
  isCompletionEvent,
  isVariantEvent,
  type FieldJob,
  type PracticeEvent,
} from './evidence';

export const READINESS_LEVELS = [
  'observe',
  'assist',
  'supervised',
  'independent',
  'mentor',
] as const;

export type ReadinessLevel = (typeof READINESS_LEVELS)[number];

export const READINESS_LABEL: Record<ReadinessLevel, string> = {
  observe: 'Observe only',
  assist: 'Assist a senior',
  supervised: 'Lead, senior checks before close',
  independent: 'Independent',
  mentor: 'Can supervise others',
};

export const READINESS_SHORT: Record<ReadinessLevel, string> = {
  observe: 'Observe',
  assist: 'Assist',
  supervised: 'Supervised',
  independent: 'Independent',
  mentor: 'Mentor',
};

export function isReadinessLevel(value: unknown): value is ReadinessLevel {
  return typeof value === 'string' && (READINESS_LEVELS as readonly string[]).includes(value);
}

export interface Technician {
  id: string;
  name: string;
  role: string | null;
}

/** A level a manager set. Only the server may create one of these in production. */
export interface ReadinessLevelRecord {
  techId: string;
  activityId: string;
  level: ReadinessLevel;
  setBy: string;
  setAt: string;
  note: string | null;
}

export interface ReadinessEvidence {
  practiceCommits: number;
  practiceCompletions: number;
  distinctCases: number;
  variantsCompleted: number;
  fieldJobs: number;
  jobsWithOutcome: number;
  callbacks: number;
  lastActivityAt: string | null;
  lastCallbackAt: string | null;
}

export interface ReadinessCell {
  techId: string;
  activityId: string;
  evidence: ReadinessEvidence;
  level: ReadinessLevelRecord | null;
  /** Evidence exists that the manager has not looked at since the level was set. */
  reviewSuggested: boolean;
}

/**
 * When new evidence should pull the manager back to a cell.
 *
 * No level yet: any evidence. Observe / assist / supervised: any evidence,
 * because the next step up is the question. Independent: only a callback,
 * since routine jobs are what the level predicts. Mentor: never; it is the
 * top of the scale and a mentor's own jobs are not a readiness question.
 */
export function shouldSuggestReview(
  evidence: ReadinessEvidence,
  level: ReadinessLevelRecord | null,
): boolean {
  if (!hasEvidence(evidence)) return false;
  if (level == null) return true;
  switch (level.level) {
    case 'mentor':
      return false;
    case 'independent':
      return evidence.lastCallbackAt != null && evidence.lastCallbackAt > level.setAt;
    default:
      return evidence.lastActivityAt != null && evidence.lastActivityAt > level.setAt;
  }
}

export interface ReadinessMatrix {
  techs: Technician[];
  activities: WorkActivity[];
  cells: ReadinessCell[];
}

export interface ReadinessInput {
  techs: Technician[];
  cases: DiagnosticCase[];
  events: PracticeEvent[];
  jobs: FieldJob[];
  levels: ReadinessLevelRecord[];
}

export function activityForCase(diag: DiagnosticCase): string {
  return inferActivityId({ tags: diag.tags, systemType: diag.equipment.systemType });
}

export function activityForJob(job: FieldJob): string {
  return inferActivityId({ systemType: job.systemType, equipmentLabel: job.equipmentLabel });
}

const NO_EVIDENCE: ReadinessEvidence = {
  practiceCommits: 0,
  practiceCompletions: 0,
  distinctCases: 0,
  variantsCompleted: 0,
  fieldJobs: 0,
  jobsWithOutcome: 0,
  callbacks: 0,
  lastActivityAt: null,
  lastCallbackAt: null,
};

export function hasEvidence(evidence: ReadinessEvidence): boolean {
  return (
    evidence.practiceCommits +
      evidence.practiceCompletions +
      evidence.variantsCompleted +
      evidence.fieldJobs >
    0
  );
}

function later(a: string | null, b: string): string {
  return a == null || b > a ? b : a;
}

export function cellKey(techId: string, activityId: string): string {
  return `${techId}:${activityId}`;
}

export function buildReadinessMatrix(input: ReadinessInput): ReadinessMatrix {
  const caseActivity = new Map<string, string>();
  for (const diag of input.cases) caseActivity.set(diag.id, activityForCase(diag));

  const techIds = new Set(input.techs.map((tech) => tech.id));
  const evidence = new Map<string, ReadinessEvidence>();
  const casesSeen = new Map<string, Set<string>>();

  const bump = (
    techId: string,
    activityId: string,
    update: (current: ReadinessEvidence) => ReadinessEvidence,
  ) => {
    const key = cellKey(techId, activityId);
    evidence.set(key, update(evidence.get(key) ?? { ...NO_EVIDENCE }));
  };

  for (const event of input.events) {
    if (!event.userId || !techIds.has(event.userId)) continue;
    const activityId = caseActivity.get(event.caseId);
    // An event for a case not in the published set is not evidence of anything
    // we can name. It is dropped, not guessed into "general".
    if (!activityId) continue;
    const key = cellKey(event.userId, activityId);
    if (isCommitEvent(event)) {
      bump(event.userId, activityId, (current) => ({
        ...current,
        practiceCommits: current.practiceCommits + 1,
        lastActivityAt: later(current.lastActivityAt, event.createdAt),
      }));
      const seen = casesSeen.get(key) ?? new Set<string>();
      seen.add(event.caseId);
      casesSeen.set(key, seen);
    } else if (isVariantEvent(event)) {
      bump(event.userId, activityId, (current) => ({
        ...current,
        variantsCompleted: current.variantsCompleted + 1,
        lastActivityAt: later(current.lastActivityAt, event.createdAt),
      }));
    } else if (isCompletionEvent(event)) {
      bump(event.userId, activityId, (current) => ({
        ...current,
        practiceCompletions: current.practiceCompletions + 1,
        lastActivityAt: later(current.lastActivityAt, event.createdAt),
      }));
    }
  }

  for (const job of input.jobs) {
    if (!techIds.has(job.userId)) continue;
    const activityId = activityForJob(job);
    bump(job.userId, activityId, (current) => ({
      ...current,
      fieldJobs: current.fieldJobs + 1,
      jobsWithOutcome: current.jobsWithOutcome + (job.outcome ? 1 : 0),
      callbacks: current.callbacks + (job.outcome?.callback ? 1 : 0),
      lastActivityAt: later(current.lastActivityAt, job.createdAt),
      lastCallbackAt: job.outcome?.callback
        ? later(current.lastCallbackAt, job.createdAt)
        : current.lastCallbackAt,
    }));
  }

  for (const [key, seen] of casesSeen) {
    const current = evidence.get(key);
    if (current) evidence.set(key, { ...current, distinctCases: seen.size });
  }

  const levelByKey = new Map<string, ReadinessLevelRecord>();
  for (const record of input.levels) {
    if (!techIds.has(record.techId)) continue;
    const key = cellKey(record.techId, record.activityId);
    const existing = levelByKey.get(key);
    if (!existing || record.setAt > existing.setAt) levelByKey.set(key, record);
  }

  const activityIds = sortActivityIds([
    ...Array.from(evidence.keys()).map((key) => key.slice(key.indexOf(':') + 1)),
    ...Array.from(levelByKey.values()).map((record) => record.activityId),
  ]);

  const cells: ReadinessCell[] = [];
  for (const tech of input.techs) {
    for (const activityId of activityIds) {
      const key = cellKey(tech.id, activityId);
      const cellEvidence = evidence.get(key) ?? { ...NO_EVIDENCE };
      const level = levelByKey.get(key) ?? null;
      cells.push({
        techId: tech.id,
        activityId,
        evidence: cellEvidence,
        level,
        reviewSuggested: shouldSuggestReview(cellEvidence, level),
      });
    }
  }

  return {
    techs: input.techs,
    activities: activityIds.map(activityById),
    cells,
  };
}

export function cellFor(
  matrix: ReadinessMatrix,
  techId: string,
  activityId: string,
): ReadinessCell | undefined {
  return matrix.cells.find((cell) => cell.techId === techId && cell.activityId === activityId);
}

export function cellsForTech(matrix: ReadinessMatrix, techId: string): ReadinessCell[] {
  return matrix.cells.filter((cell) => cell.techId === techId);
}

export function reviewQueue(matrix: ReadinessMatrix): ReadinessCell[] {
  return matrix.cells
    .filter((cell) => cell.reviewSuggested)
    .sort((a, b) => (b.evidence.lastActivityAt ?? '').localeCompare(a.evidence.lastActivityAt ?? ''));
}

/** One line a manager can read on a phone. Counts only; no verdict. */
export function evidenceSummary(evidence: ReadinessEvidence): string {
  const parts: string[] = [];
  if (evidence.practiceCompletions > 0) {
    parts.push(
      `${evidence.practiceCompletions} case${evidence.practiceCompletions === 1 ? '' : 's'} practiced`,
    );
  } else if (evidence.practiceCommits > 0) {
    parts.push(`${evidence.practiceCommits} commit${evidence.practiceCommits === 1 ? '' : 's'}`);
  }
  if (evidence.variantsCompleted > 0) {
    parts.push(`${evidence.variantsCompleted} variant${evidence.variantsCompleted === 1 ? '' : 's'}`);
  }
  if (evidence.fieldJobs > 0) {
    parts.push(`${evidence.fieldJobs} job${evidence.fieldJobs === 1 ? '' : 's'}`);
  }
  if (evidence.callbacks > 0) {
    parts.push(`${evidence.callbacks} callback${evidence.callbacks === 1 ? '' : 's'}`);
  }
  return parts.join(' · ');
}
