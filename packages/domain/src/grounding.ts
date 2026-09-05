/**
 * Deterministic guards against a compiled case saying something nobody said.
 *
 * On 2026-07-31 five cards were published whose "expert answers" were the
 * moment's own metadata echoed back. Nothing in that chain was a lie the model
 * told; the chain simply had no step that asked "where did this come from?"
 * These functions are that step. They are token overlap, not judgment. They
 * can refuse; they cannot approve content a human has not reviewed.
 */
import type { DiagnosticCase } from './case';

export interface EvidenceSource {
  id: string;
  kind: 'transcript' | 'expert_answer' | 'frame_note' | 'mark_note';
  text: string;
}

const STOPWORDS = new Set([
  'the', 'and', 'that', 'this', 'with', 'for', 'was', 'were', 'you', 'your', 'what', 'when',
  'then', 'than', 'there', 'their', 'they', 'them', 'from', 'into', 'onto', 'have', 'has',
  'had', 'not', 'but', 'are', 'its', 'our', 'out', 'off', 'all', 'any', 'can', 'did', 'does',
  'would', 'could', 'should', 'made', 'make', 'most', 'more', 'some', 'one', 'first', 'after',
  'before', 'about', 'because', 'while', 'where', 'which', 'who', 'how', 'why', 'get', 'got',
  'just', 'like', 'also', 'still', 'very', 'here', 'until', 'over', 'under', 'again', 'each',
  'else', 'same', 'those', 'these', 'think', 'thought', 'something', 'anything', 'thing',
]);

function stem(word: string): string {
  if (word.length <= 4) return word;
  return word.replace(/(ing|ed|es|s)$/, '');
}

/** Lowercase alphanumerics, stopwords out, light stemming. Numbers stay: "410a", "0.5". */
export function contentTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .map((word) => word.replace(/^\.+|\.+$/g, ''))
    .filter((word) => word.length > 2 || /\d/.test(word))
    .filter((word) => !STOPWORDS.has(word))
    .map(stem);
}

export type AnswerRejectReason = 'empty_answer' | 'answer_echoes_prompt' | 'answer_is_metadata';

const MIN_ANSWER_TOKENS = 3;
const MIN_NOVEL_FRACTION = 0.4;

/**
 * Why an expert answer must not be accepted as evidence, or null if it may.
 *
 * `momentMeta` is whatever the system already knew before asking: moment type,
 * window, score, mark label. An answer made of those words is the system
 * hearing itself.
 */
export function answerRejectReason(
  answer: string,
  prompt: string,
  momentMeta: string[] = [],
): AnswerRejectReason | null {
  const answerTokens = contentTokens(answer);
  if (answerTokens.length < MIN_ANSWER_TOKENS) return 'empty_answer';

  const metaTokens = new Set(momentMeta.flatMap(contentTokens));
  if (metaTokens.size > 0 && answerTokens.every((token) => metaTokens.has(token))) {
    return 'answer_is_metadata';
  }

  const promptTokens = new Set(contentTokens(prompt));
  const novel = answerTokens.filter((token) => !promptTokens.has(token) && !metaTokens.has(token));
  if (novel.length / answerTokens.length < MIN_NOVEL_FRACTION) return 'answer_echoes_prompt';

  return null;
}

export interface ClaimGrounding {
  claimId: string;
  grounded: boolean;
  /** Fraction of the claim's content tokens found in the best source. */
  score: number;
  sourceId: string | null;
}

const MIN_GROUNDING_SCORE = 0.4;
const MIN_MATCHED_TOKENS = 3;

export function groundClaim(claimId: string, claim: string, sources: EvidenceSource[]): ClaimGrounding {
  const claimTokens = Array.from(new Set(contentTokens(claim)));
  if (claimTokens.length === 0 || sources.length === 0) {
    return { claimId, grounded: false, score: 0, sourceId: null };
  }
  let best: ClaimGrounding = { claimId, grounded: false, score: 0, sourceId: null };
  for (const source of sources) {
    const sourceTokens = new Set(contentTokens(source.text));
    const matched = claimTokens.filter((token) => sourceTokens.has(token)).length;
    const score = matched / claimTokens.length;
    if (score > best.score) {
      best = {
        claimId,
        score,
        sourceId: source.id,
        grounded:
          score >= MIN_GROUNDING_SCORE &&
          matched >= Math.min(MIN_MATCHED_TOKENS, claimTokens.length),
      };
    }
  }
  return best;
}

export type GroundingReason = 'no_evidence' | 'no_claims' | `claim_ungrounded:${string}`;

export interface CaseGroundingReport {
  publishable: boolean;
  reasons: GroundingReason[];
  claims: ClaimGrounding[];
}

/**
 * Fail-closed. Any claim that cannot be traced to a source blocks publication
 * with a reason a reviewer can act on. An empty source set blocks everything:
 * a case with no evidence behind it is the incident, not an edge case.
 */
export function checkCaseGrounding(
  diag: Pick<DiagnosticCase, 'claims'>,
  sources: EvidenceSource[],
): CaseGroundingReport {
  if (sources.length === 0) {
    return { publishable: false, reasons: ['no_evidence'], claims: [] };
  }
  if (diag.claims.length === 0) {
    return { publishable: false, reasons: ['no_claims'], claims: [] };
  }
  const claims = diag.claims.map((claim) => groundClaim(claim.id, claim.text, sources));
  const reasons = claims
    .filter((claim) => !claim.grounded)
    .map((claim): GroundingReason => `claim_ungrounded:${claim.claimId}`);
  return { publishable: reasons.length === 0, reasons, claims };
}

export const REJECT_LABEL: Record<AnswerRejectReason, string> = {
  empty_answer: 'Too short to be an answer.',
  answer_echoes_prompt: 'Repeats the question instead of answering it.',
  answer_is_metadata: "Made of the moment's own labels. Nobody said this.",
};
