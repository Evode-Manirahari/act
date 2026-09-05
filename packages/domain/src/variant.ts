/**
 * Delayed variant: the same principle, asked again 7–14 days after the first
 * practice, ideally on a different surface (web after mobile, or the reverse).
 * The first pass shows whether the learner can reason; the delayed pass shows
 * whether it stuck. Only the second one is evidence of transfer.
 */
import { isCompletionEvent, isVariantEvent, type PracticeEvent } from './evidence';
import type { LearnerCommit } from './player';

export const VARIANT_WINDOW_DAYS = { min: 7, max: 14 } as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export type VariantStatus = 'not_started' | 'waiting' | 'due' | 'overdue' | 'done';

export interface VariantSchedule {
  caseId: string;
  status: VariantStatus;
  /** First practice completion this schedule hangs off. */
  firstCompletedAt: string | null;
  dueAt: string | null;
  lateAt: string | null;
  variantCompletedAt: string | null;
}

export function variantSchedule(
  events: PracticeEvent[],
  caseId: string,
  userId: string,
  now: Date,
): VariantSchedule {
  const mine = events.filter((event) => event.caseId === caseId && event.userId === userId);
  const completions = mine
    .filter(isCompletionEvent)
    .map((event) => event.createdAt)
    .sort();
  const first = completions[0] ?? null;
  if (!first) {
    return {
      caseId,
      status: 'not_started',
      firstCompletedAt: null,
      dueAt: null,
      lateAt: null,
      variantCompletedAt: null,
    };
  }
  const firstMs = new Date(first).getTime();
  const dueAt = new Date(firstMs + VARIANT_WINDOW_DAYS.min * DAY_MS).toISOString();
  const lateAt = new Date(firstMs + VARIANT_WINDOW_DAYS.max * DAY_MS).toISOString();
  const variant = mine
    .filter((event) => isVariantEvent(event) && event.createdAt > first)
    .map((event) => event.createdAt)
    .sort()[0];
  if (variant) {
    return { caseId, status: 'done', firstCompletedAt: first, dueAt, lateAt, variantCompletedAt: variant };
  }
  const nowIso = now.toISOString();
  const status: VariantStatus = nowIso < dueAt ? 'waiting' : nowIso <= lateAt ? 'due' : 'overdue';
  return { caseId, status, firstCompletedAt: first, dueAt, lateAt, variantCompletedAt: null };
}

export function variantsDue(
  events: PracticeEvent[],
  caseIds: string[],
  userId: string,
  now: Date,
): VariantSchedule[] {
  return caseIds
    .map((caseId) => variantSchedule(events, caseId, userId, now))
    .filter((schedule) => schedule.status === 'due' || schedule.status === 'overdue');
}

export const VARIANT_STATUS_LABEL: Record<VariantStatus, string> = {
  not_started: 'Not practiced yet',
  waiting: 'Variant scheduled',
  due: 'Variant due',
  overdue: 'Variant overdue',
  done: 'Variant done',
};

/**
 * The variant hides the title and the original cue. The learner gets the call
 * and has to name the principle before anything else.
 */
export const VARIANT_PROMPT =
  'You saw a case like this a week or two ago. Before you re-read it: what principle should carry over, and what would tell you it does not apply here?';

export function variantEventNote(commit: LearnerCommit, disconfirm: string, reflection: string): string {
  return JSON.stringify({
    kind: 'variant_completed',
    cue: commit.cue.trim(),
    hypothesis: commit.hypothesis.trim(),
    next_test: commit.nextTest.trim(),
    rationale: commit.rationale.trim(),
    disconfirm: disconfirm.trim(),
    reflection: reflection.trim(),
  });
}
