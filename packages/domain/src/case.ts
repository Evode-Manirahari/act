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
  sourceRefs: string[];
  reviewStatus: 'pending_expert' | 'approved' | 'rejected';
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
  noviceTrap: string | null;
  safetyBoundary: string | null;
  expertReasoning: string | null;
  claims: CaseClaim[];
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
}

function asStatus(status: string): CaseStatus {
  if (status === 'published') return 'published';
  if (status === 'archived') return 'archived';
  return 'draft';
}

function claim(
  id: string,
  type: ClaimType,
  text: string | null,
  sourceRefs: string[],
): CaseClaim | null {
  if (!text?.trim()) return null;
  return {
    id,
    type,
    text: text.trim(),
    sourceRefs,
    reviewStatus: 'approved',
  };
}

export function diagnosticCaseFromKnowledgeObject(card: KnowledgeCardSource): DiagnosticCase {
  const tags = card.tags_json ?? [];
  const claims = [
    claim('cue', 'observed_fact', card.observable_cue, ['knowledge_object.observable_cue']),
    claim('decision', 'technician_statement', card.decision, ['knowledge_object.decision']),
    claim('reasoning', 'inference', card.expert_reasoning, ['knowledge_object.expert_reasoning']),
    claim('verification', 'observed_fact', card.verification, ['knowledge_object.verification']),
    claim('trap', 'local_heuristic', card.novice_trap, ['knowledge_object.novice_trap']),
    claim('safety', 'safety_constraint', card.safety_boundary, ['knowledge_object.safety_boundary']),
  ].filter((item): item is CaseClaim => item != null);

  const hypotheses: CaseHypothesis[] = card.expert_reasoning?.trim()
    ? [{ label: card.expert_reasoning.trim(), support: card.observable_cue ? ['cue'] : [], refute: [] }]
    : [];

  return {
    id: card.id,
    momentId: card.moment_id,
    version: 1,
    status: asStatus(card.status),
    episodeType: inferEpisodeType({ tags }),
    title: card.title,
    trade: card.trade,
    presentingProblem: card.situation,
    decisionPoint: card.situation ?? card.title,
    cues: card.observable_cue,
    hypotheses,
    discriminatingTest: card.decision,
    action: card.decision,
    verification: card.verification,
    noviceTrap: card.novice_trap,
    safetyBoundary: card.safety_boundary,
    expertReasoning: card.expert_reasoning,
    claims,
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
