import type { KnowledgeObject, TrainingEvent } from '../api/libraryApi';
import {
  practiceEventFromTrainingEvent,
  variantSchedule,
  type VariantSchedule,
  type VariantStatus,
} from '@act/domain';

export type TrainingCard = KnowledgeObject;

export function getVisibleTrainingCards(results: KnowledgeObject[]): TrainingCard[] {
  return results;
}

export function shouldShowEmptyState(input: {
  loading: boolean;
  error: string | null;
  resultsCount: number;
}): boolean {
  return !input.loading && !input.error && input.resultsCount === 0;
}

/**
 * Practice history for this learner, or `null` when it could not be read.
 * Null is not "no history": with null, no variant pills are shown and no
 * case opens in variant mode, because we do not know.
 */
export type LearnerHistory = TrainingEvent[] | null;

export function scheduleCards(
  cards: TrainingCard[],
  history: LearnerHistory,
  learnerId: string | undefined,
  now: Date,
): Map<string, VariantSchedule> {
  const schedules = new Map<string, VariantSchedule>();
  if (!history || !learnerId) return schedules;
  const events = history.map(practiceEventFromTrainingEvent);
  for (const card of cards) {
    schedules.set(card.id, variantSchedule(events, card.id, learnerId, now));
  }
  return schedules;
}

export function isVariantDue(schedule: VariantSchedule | undefined): boolean {
  return schedule?.status === 'due' || schedule?.status === 'overdue';
}

const RANK: Record<VariantStatus, number> = {
  overdue: 0,
  due: 1,
  not_started: 2,
  waiting: 3,
  done: 4,
};

/** Due variants first, then untouched cases, then waiting, then done. Stable otherwise. */
export function orderCards(
  cards: TrainingCard[],
  schedules: Map<string, VariantSchedule>,
): TrainingCard[] {
  return [...cards].sort((a, b) => {
    const ra = RANK[schedules.get(a.id)?.status ?? 'not_started'];
    const rb = RANK[schedules.get(b.id)?.status ?? 'not_started'];
    return ra - rb;
  });
}

export function countDue(schedules: Map<string, VariantSchedule>): number {
  let count = 0;
  for (const schedule of schedules.values()) if (isVariantDue(schedule)) count += 1;
  return count;
}
