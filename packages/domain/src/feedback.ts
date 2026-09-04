import type { DiagnosticCase } from './case';
import type { LearnerCommit } from './player';

export interface ComparisonLine {
  dimension: 'cue' | 'hypothesis' | 'test' | 'safety' | 'trap';
  expert: string;
  learner: string;
}

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2),
  );
}

/** Crude overlap — enough to tell the learner they missed a named cue, not a grade. */
export function overlap(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  if (left.size === 0 || right.size === 0) return 0;
  let hit = 0;
  for (const word of left) {
    if (right.has(word)) hit += 1;
  }
  return hit / Math.max(left.size, right.size);
}

export function compareCommitToExpert(diag: DiagnosticCase, commit: LearnerCommit): ComparisonLine[] {
  const lines: ComparisonLine[] = [];
  if (diag.cues) {
    lines.push({ dimension: 'cue', expert: diag.cues, learner: commit.cue });
  }
  if (diag.expertReasoning) {
    lines.push({
      dimension: 'hypothesis',
      expert: diag.expertReasoning,
      learner: commit.hypothesis,
    });
  }
  if (diag.discriminatingTest) {
    lines.push({
      dimension: 'test',
      expert: diag.discriminatingTest,
      learner: commit.nextTest,
    });
  }
  if (diag.safetyBoundary) {
    lines.push({ dimension: 'safety', expert: diag.safetyBoundary, learner: '' });
  }
  if (diag.noviceTrap) {
    lines.push({ dimension: 'trap', expert: diag.noviceTrap, learner: '' });
  }
  return lines;
}

export const COMPARISON_LABEL: Record<ComparisonLine['dimension'], string> = {
  cue: 'Cue',
  hypothesis: 'Reasoning',
  test: 'Next test',
  safety: 'Safety',
  trap: 'Novice trap',
};
