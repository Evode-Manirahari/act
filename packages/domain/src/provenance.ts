/**
 * Pilot 0 publish gate. Blueprint Appendix B (31 Aug 2026): the first five
 * cases need provenance, not a richer schema.
 *
 * Token-overlap grounding (grounding.ts) asks "did anyone say this." This
 * file asks "does each published claim name an evidence artifact or an
 * accepted expert answer." Card-field refs (`knowledge_object.*`, `draft.*`)
 * are the 2026-07-31 failure mode: the compiled object citing itself.
 *
 * Tenant, job, and source expert are server-derived. Missing them is
 * unconfirmed, never invented, and never read as "no one captured this."
 */
import type { CaseClaim, DiagnosticCase, SafetyState } from './case';
import { groundClaim, type EvidenceSource } from './grounding';

export type MvpHardReason =
  | 'no_evidence'
  | 'missing_decision_point'
  | 'missing_cue'
  | 'missing_reasoning'
  | 'missing_action'
  | 'missing_verification'
  | 'missing_outcome'
  | 'missing_novice_trap'
  | 'missing_boundary'
  | 'missing_safety_state'
  | 'no_claims'
  | `claim_unreferenced:${string}`
  | `claim_refs_card_field:${string}`
  | `claim_source_missing:${string}`;

export type MvpUnconfirmedReason = 'missing_tenant' | 'missing_source_expert' | 'missing_job_context';

export type MvpPublishReason = MvpHardReason | MvpUnconfirmedReason;

export interface MvpPublishReport {
  /** Hard reasons are empty. Lead review may proceed; identity may still be unconfirmed. */
  readyForLeadReview: boolean;
  /** Hard reasons and unconfirmed are empty. */
  publishable: boolean;
  reasons: MvpHardReason[];
  unconfirmed: MvpUnconfirmedReason[];
}

export const MVP_HARD_LABEL: Record<
  Exclude<
    MvpHardReason,
    `claim_unreferenced:${string}` | `claim_refs_card_field:${string}` | `claim_source_missing:${string}`
  >,
  string
> = {
  no_evidence: 'No transcript, frame, or accepted expert answer in the case window.',
  missing_decision_point: 'No decision point for the learner to commit against.',
  missing_cue: 'Missing the cue the expert noticed.',
  missing_reasoning: 'Missing expert reasoning.',
  missing_action: 'Missing the discriminating test or action.',
  missing_verification: 'Missing what proved the repair.',
  missing_outcome: 'Missing the job outcome.',
  missing_novice_trap: 'Missing the novice trap.',
  missing_boundary: 'Missing when this advice would be wrong or unsafe.',
  missing_safety_state: 'Safety is unset. Do not invent "not applicable."',
  no_claims: 'Nothing to ground. Empty claims are not a case.',
};

export const MVP_UNCONFIRMED_LABEL: Record<MvpUnconfirmedReason, string> = {
  missing_tenant: 'Account is not on this object yet. Unconfirmed, not absent.',
  missing_source_expert: 'Source expert is not server-derived on this object yet.',
  missing_job_context: 'Job id is not on this object yet.',
};

const CARD_FIELD_REF = /^(knowledge_object|draft)\./;

export function isCardFieldRef(ref: string): boolean {
  return CARD_FIELD_REF.test(ref);
}

export function mvpReasonLabel(reason: MvpPublishReason): string {
  if (reason.startsWith('claim_unreferenced:')) {
    return `${reason.slice('claim_unreferenced:'.length)} names no evidence.`;
  }
  if (reason.startsWith('claim_refs_card_field:')) {
    return `${reason.slice('claim_refs_card_field:'.length)} cites the compiled card, not evidence.`;
  }
  if (reason.startsWith('claim_source_missing:')) {
    return `${reason.slice('claim_source_missing:'.length)} names a source that is not in the evidence set.`;
  }
  if (reason in MVP_HARD_LABEL) {
    return MVP_HARD_LABEL[reason as keyof typeof MVP_HARD_LABEL];
  }
  return MVP_UNCONFIRMED_LABEL[reason as MvpUnconfirmedReason];
}

/**
 * Replace card-field refs with the evidence id grounding can prove.
 * Leaves a claim untouched when it already names a real source. Never
 * invents a source for an ungrounded claim — refs become empty instead.
 */
export function bindClaimSourceRefs(claims: CaseClaim[], sources: EvidenceSource[]): CaseClaim[] {
  return claims.map((claim) => {
    const anchored = claim.sourceRefs.filter((ref) => !isCardFieldRef(ref));
    if (anchored.length > 0) return { ...claim, sourceRefs: anchored };
    const grounded = groundClaim(claim.id, claim.text, sources);
    if (grounded.grounded && grounded.sourceId) {
      return { ...claim, sourceRefs: [grounded.sourceId] };
    }
    return { ...claim, sourceRefs: [] };
  });
}

export function attachEvidence(diag: DiagnosticCase, sources: EvidenceSource[]): DiagnosticCase {
  return {
    ...diag,
    evidenceIds: sources.map((source) => source.id),
    claims: bindClaimSourceRefs(diag.claims, sources),
  };
}

function present(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function safetyStateOf(diag: Pick<DiagnosticCase, 'safetyState' | 'safetyBoundary'>): SafetyState | null {
  if (diag.safetyState) return diag.safetyState;
  return present(diag.safetyBoundary) ? 'lead_review_required' : null;
}

/**
 * Fail-closed. Token overlap cannot approve; this cannot either.
 * Outcome may be the verification sentence in Pilot 0 — do not invent a
 * second field when the expert already said what they checked after the repair.
 */
export function checkMvpPublish(
  diag: Pick<
    DiagnosticCase,
    | 'tenantId'
    | 'sourceExpertId'
    | 'sourceEvent'
    | 'presentingProblem'
    | 'decisionPoint'
    | 'cues'
    | 'expertReasoning'
    | 'discriminatingTest'
    | 'action'
    | 'verification'
    | 'outcome'
    | 'noviceTrap'
    | 'safetyBoundary'
    | 'safetyState'
    | 'claims'
    | 'title'
  >,
  sources: EvidenceSource[],
): MvpPublishReport {
  const reasons: MvpHardReason[] = [];
  const unconfirmed: MvpUnconfirmedReason[] = [];

  if (!diag.tenantId?.trim()) unconfirmed.push('missing_tenant');
  if (!diag.sourceExpertId?.trim()) unconfirmed.push('missing_source_expert');
  if (!diag.sourceEvent?.jobId?.trim()) unconfirmed.push('missing_job_context');

  if (sources.length === 0) {
    reasons.push('no_evidence');
    return {
      reasons,
      unconfirmed,
      readyForLeadReview: false,
      publishable: false,
    };
  }

  if (!present(diag.decisionPoint) && !present(diag.presentingProblem) && !present(diag.title)) {
    reasons.push('missing_decision_point');
  }
  if (!present(diag.cues)) reasons.push('missing_cue');
  if (!present(diag.expertReasoning)) reasons.push('missing_reasoning');
  if (!present(diag.discriminatingTest) && !present(diag.action)) reasons.push('missing_action');
  if (!present(diag.verification)) reasons.push('missing_verification');
  if (!present(diag.outcome) && !present(diag.verification)) reasons.push('missing_outcome');
  if (!present(diag.noviceTrap)) reasons.push('missing_novice_trap');
  if (!present(diag.safetyBoundary)) reasons.push('missing_boundary');
  if (safetyStateOf(diag) == null) reasons.push('missing_safety_state');

  if (diag.claims.length === 0) {
    reasons.push('no_claims');
  } else {
    const sourceIds = new Set(sources.map((source) => source.id));
    for (const claim of diag.claims) {
      if (claim.sourceRefs.some(isCardFieldRef)) {
        reasons.push(`claim_refs_card_field:${claim.id}`);
        continue;
      }
      if (claim.sourceRefs.length === 0) {
        reasons.push(`claim_unreferenced:${claim.id}`);
        continue;
      }
      if (claim.sourceRefs.some((ref) => !sourceIds.has(ref))) {
        reasons.push(`claim_source_missing:${claim.id}`);
      }
    }
  }

  const readyForLeadReview = reasons.length === 0;
  return {
    reasons,
    unconfirmed,
    readyForLeadReview,
    publishable: readyForLeadReview && unconfirmed.length === 0,
  };
}

/** Situation only. Outcome, action, and expert fields stay off this sentence. */
export function learnerPrompt(
  diag: Pick<DiagnosticCase, 'presentingProblem' | 'title'>,
): string {
  const situation = diag.presentingProblem?.trim() || diag.title.trim();
  return `${situation} What cue matters, what do you think is going on, what would you test next, and why?`;
}
