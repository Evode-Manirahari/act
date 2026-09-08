/**
 * Research Pilot 0 — fifteen days, five real cases.
 *
 * Blueprint §15: the loop is tested before more automation. Empty slots are
 * empty. This ledger is a founder notebook, never a usage metric.
 */
import type { DiagnosticCase } from './case';
import { debriefComplete } from './completeness';
import type { EpisodeType } from './episode';
import type { EvidenceSource } from './grounding';
import { checkMvpPublish } from './provenance';

export const PILOT0_DURATION_DAYS = 15;

export const PILOT0_SLOT_SPECS = [
  { id: 'callback-1', episodeType: 'callback' as const, label: 'Callback 1' },
  { id: 'callback-2', episodeType: 'callback' as const, label: 'Callback 2' },
  { id: 'near_miss', episodeType: 'near_miss' as const, label: 'Near miss / verification failure' },
  { id: 'hard_solve', episodeType: 'hard_solve' as const, label: 'Difficult successful diagnosis' },
  { id: 'adaptation', episodeType: 'adaptation' as const, label: 'Successful adaptation' },
] as const;

export type Pilot0SlotId = (typeof PILOT0_SLOT_SPECS)[number]['id'];

/** Five activities the first shop can actually dispatch against. */
export const PILOT0_ACTIVITIES = [
  'no_cool_split',
  'airflow',
  'refrigerant_charge',
  'electrical_controls',
  'no_heat_furnace',
] as const;

export const PILOT0_CALENDAR = [
  {
    days: '1–2',
    title: 'Baseline and access',
    work: 'Consent, roster (manager, two seniors, 3–5 juniors), callback definition, how dispatch is decided today.',
  },
  {
    days: '3–10',
    title: 'Five episodes',
    work: 'Capture and debrief the mix below. Median debrief ≤7 minutes. Compile only with evidence.',
  },
  {
    days: '11–12',
    title: 'First practice',
    work: 'Juniors commit before they see the expert. Schedule the delayed variant 7–14 days out.',
  },
  {
    days: '13–14',
    title: 'Manager test',
    work: 'Show the five cases and evidence. Ask whether any coaching, supervision, or dispatch decision changes.',
  },
  {
    days: '15',
    title: 'Stop / change / continue',
    work: 'Score the hypotheses against the thresholds written before day 1. Do not reinterpret a miss as a reason to keep building.',
  },
] as const;

export type HypothesisVerdict = 'pending' | 'pass' | 'fail';

export interface Pilot0Hypothesis {
  id: string;
  claim: string;
  measure: string;
  passSignal: string;
  ifFails: string;
}

export const PILOT0_HYPOTHESES: readonly Pilot0Hypothesis[] = [
  {
    id: 'senior_workflow',
    claim: 'Seniors will complete a 5–7 minute debrief and agree to another case.',
    measure: 'Median debrief minutes; both experts say they will do the next case.',
    passSignal: 'Median ≤ 7 minutes; both seniors willing to repeat.',
    ifFails: 'Shorten, move timing after the job, or narrow the episode type.',
  },
  {
    id: 'hidden_judgment',
    claim: 'The debrief recovers judgment that was not on the work order.',
    measure: 'Cases whose expert reasoning is not a paraphrase of the original record.',
    passSignal: 'At least 4 of 5 cases reveal useful missing cognition.',
    ifFails: 'Improve elicitation or reject the knowledge premise.',
  },
  {
    id: 'cases_feel_real',
    claim: 'Juniors treat the cases as this shop’s work, not a quiz.',
    measure: 'Open feedback after commit-first practice.',
    passSignal: 'Most learners call the cases credible and relevant.',
    ifFails: 'Use more original evidence. Do not add gamification.',
  },
  {
    id: 'decision_first_distinguishes',
    claim: 'Commit-first practice shows different cue/test/rationale across learners.',
    measure: 'Variation in committed cue, hypothesis, next test, rationale.',
    passSignal: 'Cases distinguish reasoning, not only recall.',
    ifFails: 'Redesign the task and what is hidden until commit.',
  },
  {
    id: 'manager_action',
    claim: 'A manager will name a real coaching, supervision, or dispatch change.',
    measure: 'Named action written on day 13–14, or an explicit “no change.”',
    passSignal: 'At least one real action changes.',
    ifFails: 'Revisit the buyer or the output. Do not ship more dashboards.',
  },
  {
    id: 'continue',
    claim: 'The operator wants the next cases under a defined paid scope.',
    measure: 'Request for follow-on, or a stop.',
    passSignal: 'Clear willingness to continue under defined scope.',
    ifFails: 'Stop or pivot before more automation.',
  },
];

export interface Pilot0Slot {
  id: Pilot0SlotId;
  momentId: string;
  cardId: string;
  debriefMinutes: number | null;
  expertEdits: number | null;
  unsupportedClaims: number | null;
  friction: string;
  /** true = reasoning not in the work order; null = unconfirmed (no work order). */
  hiddenJudgment: boolean | null;
  learnerCommitted: boolean;
  variantScheduled: boolean;
  willingToRepeat: boolean | null;
}

export interface Pilot0Ledger {
  startedOn: string;
  operator: string;
  managerAction: string;
  juniorsSayCredible: boolean | null;
  commitsDistinguish: boolean | null;
  wantsFollowOn: boolean | null;
  slots: Record<Pilot0SlotId, Pilot0Slot>;
}

export function emptySlot(id: Pilot0SlotId): Pilot0Slot {
  return {
    id,
    momentId: '',
    cardId: '',
    debriefMinutes: null,
    expertEdits: null,
    unsupportedClaims: null,
    friction: '',
    hiddenJudgment: null,
    learnerCommitted: false,
    variantScheduled: false,
    willingToRepeat: null,
  };
}

export function emptyLedger(startedOn = ''): Pilot0Ledger {
  const slots = {} as Record<Pilot0SlotId, Pilot0Slot>;
  for (const spec of PILOT0_SLOT_SPECS) {
    slots[spec.id] = emptySlot(spec.id);
  }
  return {
    startedOn,
    operator: '',
    managerAction: '',
    juniorsSayCredible: null,
    commitsDistinguish: null,
    wantsFollowOn: null,
    slots,
  };
}

export function isPilot0SlotId(value: string): value is Pilot0SlotId {
  return PILOT0_SLOT_SPECS.some((spec) => spec.id === value);
}

export function filledSlots(ledger: Pilot0Ledger): Pilot0Slot[] {
  return PILOT0_SLOT_SPECS.map((spec) => ledger.slots[spec.id]).filter(
    (slot) => slot.momentId.trim() || slot.cardId.trim(),
  );
}

/** The mix is the five episode types, not five of the same callback. */
export function mixReady(ledger: Pilot0Ledger): boolean {
  return PILOT0_SLOT_SPECS.every((spec) => {
    const slot = ledger.slots[spec.id];
    return Boolean(slot.momentId.trim() || slot.cardId.trim());
  });
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function medianDebriefMinutes(ledger: Pilot0Ledger): number | null {
  return median(
    filledSlots(ledger)
      .map((slot) => slot.debriefMinutes)
      .filter((value): value is number => value != null && value >= 0),
  );
}

export function scoreHypothesis(ledger: Pilot0Ledger, id: string): HypothesisVerdict {
  const filled = filledSlots(ledger);
  switch (id) {
    case 'senior_workflow': {
      const minutes = medianDebriefMinutes(ledger);
      const repeats = filled.map((slot) => slot.willingToRepeat);
      if (minutes == null || repeats.some((value) => value == null) || filled.length < 5) {
        return 'pending';
      }
      return minutes <= 7 && repeats.every(Boolean) ? 'pass' : 'fail';
    }
    case 'hidden_judgment': {
      const judged = filled.map((slot) => slot.hiddenJudgment);
      if (judged.some((value) => value == null) || filled.length < 5) return 'pending';
      return judged.filter(Boolean).length >= 4 ? 'pass' : 'fail';
    }
    case 'cases_feel_real':
      if (ledger.juniorsSayCredible == null) return 'pending';
      return ledger.juniorsSayCredible ? 'pass' : 'fail';
    case 'decision_first_distinguishes':
      if (ledger.commitsDistinguish == null) return 'pending';
      return ledger.commitsDistinguish ? 'pass' : 'fail';
    case 'manager_action':
      if (!ledger.managerAction.trim()) return 'pending';
      return /no change|none|n\/a/i.test(ledger.managerAction) ? 'fail' : 'pass';
    case 'continue':
      if (ledger.wantsFollowOn == null) return 'pending';
      return ledger.wantsFollowOn ? 'pass' : 'fail';
    default:
      return 'pending';
  }
}

/**
 * Reasoning that only repeats the work order is not hidden judgment.
 * No work order → unconfirmed, not “absent.”
 */
export function hiddenJudgment(expertReasoning: string | null, workOrder: string | null): boolean | null {
  const reasoning = expertReasoning?.trim() ?? '';
  if (!reasoning) return false;
  const record = workOrder?.trim() ?? '';
  if (!record) return null;
  const reasonTokens = new Set(
    reasoning
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 3),
  );
  const recordTokens = new Set(
    record
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 3),
  );
  if (reasonTokens.size === 0) return false;
  const novel = [...reasonTokens].filter((token) => !recordTokens.has(token));
  return novel.length / reasonTokens.size >= 0.4;
}

export interface CaseQualityReport {
  ready: boolean;
  debriefComplete: boolean;
  provenanceReady: boolean;
  hiddenJudgment: boolean | null;
  reasons: string[];
}

export function scoreCaseQuality(
  diag: DiagnosticCase,
  sources: EvidenceSource[],
  workOrder: string | null = null,
): CaseQualityReport {
  const provenance = checkMvpPublish(diag, sources);
  const complete = debriefComplete(diag);
  const hidden = hiddenJudgment(diag.expertReasoning, workOrder);
  const reasons: string[] = [];
  if (!complete) reasons.push('debrief_incomplete');
  if (!provenance.readyForLeadReview) reasons.push(...provenance.reasons);
  if (hidden === false) reasons.push('no_hidden_judgment');
  return {
    ready: complete && provenance.readyForLeadReview,
    debriefComplete: complete,
    provenanceReady: provenance.readyForLeadReview,
    hiddenJudgment: hidden,
    reasons,
  };
}

export function requiredEpisodeType(slotId: Pilot0SlotId): EpisodeType {
  return PILOT0_SLOT_SPECS.find((spec) => spec.id === slotId)!.episodeType;
}
