import type { DiagnosticCase } from './case';
import type { EpisodeType } from './episode';

export type CaseGap =
  | 'cue'
  | 'hypothesis'
  | 'discriminating_test'
  | 'causal_link'
  | 'boundary'
  | 'verification'
  | 'novice_trap';

export interface NextDebriefQuestion {
  gap: CaseGap;
  question: string;
}

const QUESTIONS: Record<CaseGap, string> = {
  cue: 'What did you notice that made you stop following the obvious path?',
  hypothesis: 'What else did you think could explain the same symptoms?',
  discriminating_test: 'Which test would most quickly separate those possibilities?',
  causal_link: 'Why did that reading make this explanation more likely?',
  boundary: 'What condition would make this advice wrong or unsafe?',
  verification: 'What did you check after the repair to prove the fault was gone?',
  novice_trap: 'What would a developing technician most likely miss or assume?',
};

const GAP_ORDER: CaseGap[] = [
  'cue',
  'hypothesis',
  'discriminating_test',
  'causal_link',
  'boundary',
  'verification',
  'novice_trap',
];

export function missingGaps(diag: Partial<Pick<
  DiagnosticCase,
  'cues' | 'hypotheses' | 'discriminatingTest' | 'expertReasoning' | 'safetyBoundary' | 'verification' | 'noviceTrap'
>>): CaseGap[] {
  const gaps: CaseGap[] = [];
  if (!diag.cues?.trim()) gaps.push('cue');
  if (!diag.hypotheses?.length && !diag.expertReasoning?.trim()) gaps.push('hypothesis');
  if (!diag.discriminatingTest?.trim()) gaps.push('discriminating_test');
  if (!diag.expertReasoning?.trim()) gaps.push('causal_link');
  if (!diag.safetyBoundary?.trim()) gaps.push('boundary');
  if (!diag.verification?.trim()) gaps.push('verification');
  if (!diag.noviceTrap?.trim()) gaps.push('novice_trap');
  return gaps;
}

/** One question at a time. Empty gaps → the debrief is complete. */
export function nextDebriefQuestion(
  diag: Partial<DiagnosticCase>,
  episodeType?: EpisodeType,
): NextDebriefQuestion | null {
  const gaps = missingGaps(diag);
  const first = GAP_ORDER.find((gap) => gaps.includes(gap));
  if (!first) return null;
  if (first === 'cue' && episodeType === 'callback') {
    return {
      gap: first,
      question: 'What cue or test was missed on the first visit that would have prevented this callback?',
    };
  }
  if (first === 'boundary' && episodeType === 'near_miss') {
    return {
      gap: first,
      question: 'What cue should trigger an immediate stop or escalation next time?',
    };
  }
  return { gap: first, question: QUESTIONS[first] };
}

export function debriefComplete(diag: Partial<DiagnosticCase>): boolean {
  return nextDebriefQuestion(diag) == null;
}
