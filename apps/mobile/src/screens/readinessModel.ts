import {
  buildReadinessMatrix,
  cellsForTech,
  diagnosticCaseFromKnowledgeObject,
  fieldJobFromJob,
  hasEvidence,
  isReadinessLevel,
  practiceEventFromTrainingEvent,
  type ReadinessCell,
  type ReadinessLevelRecord,
  type WorkActivity,
} from '@act/domain';

import type { JobOut, KnowledgeObject, TrainingEvent } from '../api/libraryApi';
import type { JobOutcomeOut } from '../api/captureApi';

export type LevelsSource = 'manager' | 'none' | 'unconfirmed';

export interface MyReadiness {
  activities: WorkActivity[];
  /** Cells with evidence or a manager-set level. Empty activities are omitted. */
  cells: ReadinessCell[];
  levelsSource: LevelsSource;
  eventsUnconfirmed: boolean;
  warnings: string[];
}

const MAX_OUTCOME_READS = 100;

export function assembleMyReadiness(input: {
  userId: string;
  userName: string;
  cards: KnowledgeObject[];
  events: TrainingEvent[];
  jobs: FieldJobInput[];
  levels: ReadinessLevelRecord[];
}): Pick<MyReadiness, 'activities' | 'cells'> {
  const cases = input.cards.map(diagnosticCaseFromKnowledgeObject);
  const matrix = buildReadinessMatrix({
    techs: [{ id: input.userId, name: input.userName, role: null }],
    cases,
    events: input.events.map(practiceEventFromTrainingEvent),
    jobs: input.jobs.map((job) => fieldJobFromJob(job.job, job.outcome)),
    levels: input.levels,
  });
  const cells = cellsForTech(matrix, input.userId).filter(
    (cell) => hasEvidence(cell.evidence) || cell.level != null,
  );
  const activityIds = new Set(cells.map((cell) => cell.activityId));
  const activities = matrix.activities.filter((activity) => activityIds.has(activity.id));
  return { activities, cells };
}

export interface FieldJobInput {
  job: JobOut;
  outcome: JobOutcomeOut | null;
}

export function mapReadinessLevels(
  rows: Array<{ tech_user_id: string; activity_id: string; level: string; set_by_user_id: string; set_at: string; note: string | null }>,
  userId: string,
): ReadinessLevelRecord[] {
  return rows
    .filter((row) => row.tech_user_id === userId && isReadinessLevel(row.level))
    .map((row) => ({
      techId: row.tech_user_id,
      activityId: row.activity_id,
      level: row.level as ReadinessLevelRecord['level'],
      setBy: row.set_by_user_id,
      setAt: row.set_at,
      note: row.note,
    }));
}

export function levelsSourceFromError(message: string): LevelsSource {
  return / -> 404:/.test(message) ? 'none' : 'unconfirmed';
}

export async function jobsForUser(
  userId: string,
  jobsOut: JobOut[],
  readOutcome: (jobId: string) => Promise<JobOutcomeOut | null>,
): Promise<{ jobs: FieldJobInput[]; warnings: string[] }> {
  const mine = jobsOut.filter((job) => job.user_id === userId);
  const recent = [...mine].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, MAX_OUTCOME_READS);
  const warnings: string[] = [];
  if (mine.length > recent.length) {
    warnings.push(
      `Outcomes read for the newest ${recent.length} of ${mine.length} jobs; older jobs count without outcomes`,
    );
  }
  let failures = 0;
  const jobs = await Promise.all(
    recent.map(async (job) => {
      try {
        return { job, outcome: await readOutcome(job.id) };
      } catch {
        failures += 1;
        return { job, outcome: null };
      }
    }),
  );
  if (failures > 0) {
    warnings.push(`${failures} job outcome reads failed; those jobs show without an outcome`);
  }
  for (const job of mine.slice(recent.length)) {
    jobs.push({ job, outcome: null });
  }
  return { jobs, warnings };
}
