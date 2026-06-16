import type { KnowledgeObject } from '../api/libraryApi';

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
