import {
  listApprenticeEvents,
  listJobs,
  listReadinessLevels,
  searchLibrary,
  tryJobOutcome,
  type ReadinessLevelOut,
} from '../api/libraryApi';
import type { DemoContext } from '../api/captureApi';
import {
  assembleMyReadiness,
  jobsForUser,
  levelsSourceFromError,
  mapReadinessLevels,
  type MyReadiness,
} from './readinessModel';

/**
 * Loads the signed-in technician's readiness row from act-api. A failed read
 * is reported; it is never rendered as "no evidence" or "no level".
 */
export async function loadMyReadiness(context: DemoContext): Promise<MyReadiness> {
  const warnings: string[] = [];
  const userName = context.role?.replace(/_/g, ' ') ?? 'You';

  const [cards, jobsOut] = await Promise.all([
    searchLibrary({ limit: 200 }).catch((e: unknown) => {
      warnings.push(`cases could not be read: ${e instanceof Error ? e.message : 'unknown'}`);
      return [];
    }),
    listJobs().catch((e: unknown) => {
      warnings.push(`jobs could not be read: ${e instanceof Error ? e.message : 'unknown'}`);
      return [];
    }),
  ]);

  let eventsUnconfirmed = false;
  let events = [] as Awaited<ReturnType<typeof listApprenticeEvents>>;
  try {
    events = await listApprenticeEvents(context.user_id);
  } catch (e) {
    eventsUnconfirmed = true;
    warnings.push(`practice history could not be read: ${e instanceof Error ? e.message : 'unknown'}`);
  }

  const { jobs, warnings: jobWarnings } = await jobsForUser(context.user_id, jobsOut, tryJobOutcome);
  warnings.push(...jobWarnings);

  let levelsSource: MyReadiness['levelsSource'] = 'none';
  let levelRows: ReadinessLevelOut[] = [];
  try {
    levelRows = await listReadinessLevels();
    levelsSource = 'manager';
  } catch (e) {
    levelsSource = levelsSourceFromError(e instanceof Error ? e.message : 'unknown');
    if (levelsSource === 'unconfirmed') {
      warnings.push(`levels could not be read: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }

  const { activities, cells } = assembleMyReadiness({
    userId: context.user_id,
    userName,
    cards,
    events,
    jobs,
    levels: mapReadinessLevels(levelRows, context.user_id),
  });

  return { activities, cells, levelsSource, eventsUnconfirmed, warnings };
}
