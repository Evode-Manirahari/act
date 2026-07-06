/**
 * Pure logic for DebriefScreen, extracted for testability
 * (same pattern as loginScreenModel.ts / learnScreenModel.ts).
 */

/** An answer can be submitted with typed text OR a finished recording. */
export function canSubmitDebriefAnswer(inputs: {
  transcript: string;
  audioUri: string | null;
  submitting: boolean;
}): boolean {
  if (inputs.submitting) return false;
  return inputs.transcript.trim().length > 0 || inputs.audioUri !== null;
}

/** Badge label for PilotHome: null hides the badge entirely. */
export function debriefBadge(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? '1 waiting' : `${count} waiting`;
}

export function debriefSubmissionNotice(question: string): {
  title: string;
  body: string;
  detail: string | null;
} {
  const trimmedQuestion = question.trim();
  return {
    title: 'Answer saved',
    body: 'ACT is compiling a draft card for lead review.',
    detail: trimmedQuestion.length > 0 ? trimmedQuestion : null,
  };
}
