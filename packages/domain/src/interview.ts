/**
 * The debrief as a state machine: one question for the first missing field,
 * one answer, one field filled. The model may phrase the question. It does
 * not write the answer, and it does not fill a field the expert did not speak
 * to. Refused answers stay in the record with their reason; they never become
 * case content.
 */
import type { CaseClaim, ClaimType, DiagnosticCase } from './case';
import { nextDebriefQuestion, type CaseGap, type NextDebriefQuestion } from './completeness';
import type { EpisodeType } from './episode';
import { answerRejectReason, type AnswerRejectReason, type EvidenceSource } from './grounding';

const CLAIM_GAP: Record<string, CaseGap> = {
  cue: 'cue',
  hypothesis: 'hypothesis',
  decision: 'discriminating_test',
  reasoning: 'causal_link',
  verification: 'verification',
  trap: 'novice_trap',
  safety: 'boundary',
};

export type CaseDraft = Partial<
  Pick<
    DiagnosticCase,
    | 'title'
    | 'presentingProblem'
    | 'cues'
    | 'hypotheses'
    | 'discriminatingTest'
    | 'expertReasoning'
    | 'safetyBoundary'
    | 'verification'
    | 'noviceTrap'
  >
>;

export interface InterviewTurn {
  gap: CaseGap;
  question: string;
  answer: string;
  rejected: AnswerRejectReason | null;
  /** Source id the accepted answer was recorded under, for grounding later. */
  sourceId: string | null;
}

export interface InterviewState {
  draft: CaseDraft;
  turns: InterviewTurn[];
  sources: EvidenceSource[];
}

export function startInterview(base: CaseDraft, sources: EvidenceSource[] = []): InterviewState {
  return { draft: { ...base }, turns: [], sources: [...sources] };
}

export function currentQuestion(
  state: InterviewState,
  episodeType?: EpisodeType,
): NextDebriefQuestion | null {
  return nextDebriefQuestion(state.draft, episodeType);
}

/** Only the field the question asked about. Nothing else moves. */
export function applyAnswer(draft: CaseDraft, gap: CaseGap, answer: string): CaseDraft {
  const text = answer.trim();
  switch (gap) {
    case 'cue':
      return { ...draft, cues: text };
    case 'hypothesis':
      return {
        ...draft,
        hypotheses: [...(draft.hypotheses ?? []), { label: text, support: [], refute: [] }],
      };
    case 'discriminating_test':
      return { ...draft, discriminatingTest: text };
    case 'causal_link':
      return { ...draft, expertReasoning: text };
    case 'boundary':
      return { ...draft, safetyBoundary: text };
    case 'verification':
      return { ...draft, verification: text };
    case 'novice_trap':
      return { ...draft, noviceTrap: text };
  }
}

export function recordAnswer(
  state: InterviewState,
  question: NextDebriefQuestion,
  answer: string,
  momentMeta: string[] = [],
): InterviewState {
  const rejected = answerRejectReason(answer, question.question, momentMeta);
  if (rejected) {
    return {
      ...state,
      turns: [...state.turns, { ...question, answer, rejected, sourceId: null }],
    };
  }
  const sourceId = `answer-${state.turns.filter((turn) => !turn.rejected).length + 1}`;
  return {
    draft: applyAnswer(state.draft, question.gap, answer),
    turns: [...state.turns, { ...question, answer, rejected: null, sourceId }],
    sources: [...state.sources, { id: sourceId, kind: 'expert_answer', text: answer.trim() }],
  };
}

export function interviewComplete(state: InterviewState, episodeType?: EpisodeType): boolean {
  return currentQuestion(state, episodeType) == null;
}

/** Claims a draft would carry into review. Same ids as a compiled case. */
export function claimsFromDraft(draft: CaseDraft, turns: InterviewTurn[] = []): CaseClaim[] {
  const sourceByGap = new Map<CaseGap, string>();
  for (const turn of turns) {
    if (!turn.rejected && turn.sourceId) sourceByGap.set(turn.gap, turn.sourceId);
  }
  const entries: Array<[string, ClaimType, string | null | undefined]> = [
    ['cue', 'observed_fact', draft.cues],
    ['hypothesis', 'inference', draft.hypotheses?.map((h) => h.label).join(' ')],
    ['decision', 'technician_statement', draft.discriminatingTest],
    ['reasoning', 'inference', draft.expertReasoning],
    ['verification', 'observed_fact', draft.verification],
    ['trap', 'local_heuristic', draft.noviceTrap],
    ['safety', 'safety_constraint', draft.safetyBoundary],
  ];
  return entries
    .filter((entry): entry is [string, ClaimType, string] => Boolean(entry[2]?.trim()))
    .map(([id, type, text]) => {
      const sourceId = sourceByGap.get(CLAIM_GAP[id]);
      return {
        id,
        type,
        text: text.trim(),
        sourceRefs: sourceId ? [sourceId] : [],
        reviewStatus: 'pending_expert' as const,
      };
    });
}
