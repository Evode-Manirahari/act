import { inferEpisodeType, type EpisodeType } from './episode';

export type CaseStatus =
  | 'draft'
  | 'expert_review'
  | 'lead_review'
  | 'published'
  | 'revised'
  | 'superseded'
  | 'archived';

export type ClaimType =
  | 'observed_fact'
  | 'measurement'
  | 'technician_statement'
  | 'inference'
  | 'local_heuristic'
  | 'official_procedure'
  | 'safety_constraint'
  | 'disagreement';

export interface CaseClaim {
  id: string;
  type: ClaimType;
  text: string;
  /** Evidence artifact ids or accepted-answer ids. Card-field paths are not evidence. */
  sourceRefs: string[];
  reviewStatus: 'pending_expert' | 'approved' | 'rejected';
}

export type SafetyState = 'not_applicable' | 'reviewed_constraint' | 'lead_review_required';

export interface SourceEvent {
  type: EpisodeType;
  jobId: string | null;
  occurredAt: string | null;
}

export interface CaseHypothesis {
  label: string;
  support: string[];
  refute: string[];
}

/**
 * The product object. A lesson card can be rendered from this; this cannot be
 * reconstructed from a quiz-bearing card. Fields the current API does not yet
 * store are derived so practice can ship against published knowledge_objects.
 */
export interface DiagnosticCase {
  id: string;
  momentId: string;
  version: number;
  status: CaseStatus;
  episodeType: EpisodeType;
  title: string;
  trade: string;
  presentingProblem: string | null;
  decisionPoint: string | null;
  cues: string | null;
  hypotheses: CaseHypothesis[];
  discriminatingTest: string | null;
  action: string | null;
  verification: string | null;
  outcome: string | null;
  noviceTrap: string | null;
  safetyBoundary: string | null;
  safetyState: SafetyState | null;
  expertReasoning: string | null;
  claims: CaseClaim[];
  /** Server-derived. Null means unconfirmed, not "no tenant." */
  tenantId: string | null;
  /** Server-derived from a verified token. Never a client-supplied user id. */
  sourceExpertId: string | null;
  sourceEvent: SourceEvent;
  scope: string | null;
  evidenceIds: string[];
  publishedAt: string | null;
  createdAt: string;
  tags: string[];
  equipment: {
    systemType: string | null;
    make: string | null;
    model: string | null;
    siteLabel: string | null;
    jurisdiction: string | null;
  };
}

/** The subset of a knowledge object this mapping needs. Avoids a circular import. */
export interface KnowledgeCardSource {
  id: string;
  moment_id: string;
  title: string;
  trade: string;
  situation: string | null;
  observable_cue: string | null;
  expert_reasoning: string | null;
  decision: string | null;
  novice_trap: string | null;
  safety_boundary: string | null;
  verification: string | null;
  tags_json: string[] | null;
  status: string;
  published_at: string | null;
  created_at: string;
  system_type?: string | null;
  customer_site_label?: string | null;
  equipment_make?: string | null;
  equipment_model?: string | null;
  jurisdiction?: string | null;
  /** Server-derived account. Absent means unconfirmed. */
  account_id?: string | null;
  job_id?: string | null;
  occurred_at?: string | null;
  /** Server-derived expert id. Do not send this from the client. */
  source_expert_id?: string | null;
  outcome?: string | null;
  scope?: string | null;
}

function asStatus(status: string): CaseStatus {
  if (status === 'published') return 'published';
  if (status === 'archived') return 'archived';
  return 'draft';
}

function claim(id: string, type: ClaimType, text: string | null): CaseClaim | null {
  if (!text?.trim()) return null;
  return {
    id,
    type,
    text: text.trim(),
    sourceRefs: [],
    reviewStatus: 'approved',
  };
}

function safetyStateFrom(card: KnowledgeCardSource): SafetyState | null {
  if (!card.safety_boundary?.trim()) return null;
  if (card.status === 'published') return 'reviewed_constraint';
  return 'lead_review_required';
}

export function diagnosticCaseFromKnowledgeObject(card: KnowledgeCardSource): DiagnosticCase {
  const tags = card.tags_json ?? [];
  const episodeType = inferEpisodeType({ tags, explicit: null });
  const claims = [
    claim('cue', 'observed_fact', card.observable_cue),
    claim('decision', 'technician_statement', card.decision),
    claim('reasoning', 'inference', card.expert_reasoning),
    claim('verification', 'observed_fact', card.verification),
    claim('trap', 'local_heuristic', card.novice_trap),
    claim('safety', 'safety_constraint', card.safety_boundary),
  ].filter((item): item is CaseClaim => item != null);

  const hypotheses: CaseHypothesis[] = card.expert_reasoning?.trim()
    ? [{ label: card.expert_reasoning.trim(), support: card.observable_cue ? ['cue'] : [], refute: [] }]
    : [];

  return {
    id: card.id,
    momentId: card.moment_id,
    version: 1,
    status: asStatus(card.status),
    episodeType,
    title: card.title,
    trade: card.trade,
    presentingProblem: card.situation,
    decisionPoint: card.situation ?? card.title,
    cues: card.observable_cue,
    hypotheses,
    discriminatingTest: card.decision,
    action: card.decision,
    verification: card.verification,
    outcome: card.outcome ?? null,
    noviceTrap: card.novice_trap,
    safetyBoundary: card.safety_boundary,
    safetyState: safetyStateFrom(card),
    expertReasoning: card.expert_reasoning,
    claims,
    tenantId: card.account_id ?? null,
    sourceExpertId: card.source_expert_id ?? null,
    sourceEvent: {
      type: episodeType,
      jobId: card.job_id ?? null,
      occurredAt: card.occurred_at ?? null,
    },
    scope: card.scope ?? null,
    evidenceIds: [],
    publishedAt: card.published_at,
    createdAt: card.created_at,
    tags,
    equipment: {
      systemType: card.system_type ?? null,
      make: card.equipment_make ?? null,
      model: card.equipment_model ?? null,
      siteLabel: card.customer_site_label ?? null,
      jurisdiction: card.jurisdiction ?? null,
    },
  };
}

export function canPractice(diag: DiagnosticCase): boolean {
  return Boolean(
    diag.presentingProblem?.trim() &&
      (diag.cues?.trim() || diag.expertReasoning?.trim() || diag.discriminatingTest?.trim()),
  );
}
