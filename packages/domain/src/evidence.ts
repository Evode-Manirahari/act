/**
 * Evidence inputs for readiness. Both shapes are thin projections of act-api
 * rows (`training_events`, `jobs` + `job_outcomes`). Nothing here is asserted
 * by the client; the ids and timestamps come from the server.
 */

export interface PracticeEvent {
  id: string;
  caseId: string;
  userId: string | null;
  /** act-api event_type: viewed | quiz_attempted | quiz_correct | quiz_wrong | completed | flagged */
  eventType: string;
  note: string | null;
  createdAt: string;
}

export interface FieldJob {
  id: string;
  userId: string;
  systemType: string | null;
  equipmentLabel: string | null;
  createdAt: string;
  outcome: {
    callback: boolean;
    finalDiagnosis: string | null;
  } | null;
}

export type PracticeNoteKind = 'hypothesis_committed' | 'variant_completed';

export interface ParsedPracticeNote {
  kind: PracticeNoteKind;
  [key: string]: unknown;
}

/** Notes are JSON written by the player; anything else is a plain-text note. */
export function parsePracticeNote(note: string | null): ParsedPracticeNote | null {
  if (!note) return null;
  try {
    const parsed = JSON.parse(note) as { kind?: unknown };
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed.kind === 'hypothesis_committed' || parsed.kind === 'variant_completed')
    ) {
      return parsed as ParsedPracticeNote;
    }
  } catch {
    // free text
  }
  return null;
}

export function isCommitEvent(event: PracticeEvent): boolean {
  return (
    event.eventType === 'quiz_attempted' &&
    parsePracticeNote(event.note)?.kind === 'hypothesis_committed'
  );
}

export function isCompletionEvent(event: PracticeEvent): boolean {
  return event.eventType === 'completed' && !isVariantEvent(event);
}

export function isVariantEvent(event: PracticeEvent): boolean {
  return parsePracticeNote(event.note)?.kind === 'variant_completed';
}

export interface TrainingEventSource {
  id: string;
  knowledge_object_id: string;
  user_id: string | null;
  event_type: string;
  note: string | null;
  created_at: string;
}

export function practiceEventFromTrainingEvent(row: TrainingEventSource): PracticeEvent {
  return {
    id: row.id,
    caseId: row.knowledge_object_id,
    userId: row.user_id,
    eventType: row.event_type,
    note: row.note,
    createdAt: row.created_at,
  };
}

export interface JobSource {
  id: string;
  user_id: string;
  system_type: string | null;
  equipment_label: string | null;
  created_at: string;
}

export interface JobOutcomeSource {
  callback: boolean;
  final_diagnosis: string | null;
}

export function fieldJobFromJob(job: JobSource, outcome: JobOutcomeSource | null): FieldJob {
  return {
    id: job.id,
    userId: job.user_id,
    systemType: job.system_type,
    equipmentLabel: job.equipment_label,
    createdAt: job.created_at,
    outcome: outcome
      ? { callback: outcome.callback, finalDiagnosis: outcome.final_diagnosis }
      : null,
  };
}
