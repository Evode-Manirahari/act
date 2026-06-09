/**
 * Typed client for the apprentice-side endpoints (PR 7 + 8 on act-api).
 * Used by the Learn tab to browse published knowledge objects and log
 * training events when an apprentice attempts a quiz.
 */
import { API_BASE } from '../lib/config';


export interface KnowledgeObjectQuiz {
  question: string;
  choices: string[];
  answer: string;
}

export interface KnowledgeObject {
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
  quiz_json: KnowledgeObjectQuiz | null;
  tags_json: string[] | null;
  status: string;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
}

export interface ElicitationQuestion {
  id: string;
  moment_id: string;
  question: string;
  reason: string | null;
  status: string;
  asked_at: string | null;
  created_at: string;
}

export interface ExpertAnswer {
  id: string;
  question_id: string;
  transcript: string | null;
  audio_key: string | null;
  approved_by_expert: boolean;
  expert_user_id: string | null;
  created_at: string;
}


export interface DashboardSummary {
  recordings_total: number;
  recordings_ready: number;
  moments_proposed: number;
  moments_approved: number;
  knowledge_objects_published: number;
  training_events_total: number;
  training_events_last_7_days: number;
  quiz_attempts: number;
  quiz_correct: number;
  callbacks: number;
  jobs_with_outcomes: number;
}


export type TrainingEventType =
  | 'viewed'
  | 'quiz_attempted'
  | 'quiz_correct'
  | 'quiz_wrong'
  | 'completed'
  | 'flagged';


async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new LibraryApiError(
      `${init?.method ?? 'GET'} ${path} -> ${response.status}: ${body.slice(0, 200)}`,
      response.status,
    );
  }
  return (await response.json()) as T;
}


export class LibraryApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'LibraryApiError';
  }
}


export async function searchLibrary(input: {
  q?: string;
  trade?: string;
  limit?: number;
}): Promise<KnowledgeObject[]> {
  const params = new URLSearchParams();
  if (input.q) params.set('q', input.q);
  if (input.trade) params.set('trade', input.trade);
  if (input.limit) params.set('limit', String(input.limit));
  const suffix = params.toString() ? `?${params}` : '';
  return jsonFetch<KnowledgeObject[]>(`/library/search${suffix}`);
}

export async function generateMomentQuestion(
  momentId: string,
): Promise<ElicitationQuestion> {
  return jsonFetch<ElicitationQuestion>(`/moments/${momentId}/questions`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function submitExpertAnswer(input: {
  questionId: string;
  transcript: string;
  approvedByExpert?: boolean;
  expertUserId?: string | null;
}): Promise<ExpertAnswer> {
  return jsonFetch<ExpertAnswer>(`/questions/${input.questionId}/answers`, {
    method: 'POST',
    body: JSON.stringify({
      transcript: input.transcript,
      approved_by_expert: input.approvedByExpert ?? true,
      expert_user_id: input.expertUserId ?? null,
    }),
  });
}

export async function compileMoment(input: {
  momentId: string;
  trade?: string;
}): Promise<KnowledgeObject> {
  return jsonFetch<KnowledgeObject>(`/moments/${input.momentId}/compile`, {
    method: 'POST',
    body: JSON.stringify({ trade: input.trade ?? 'hvac' }),
  });
}

export async function publishKnowledgeObject(
  knowledgeObjectId: string,
): Promise<KnowledgeObject> {
  return jsonFetch<KnowledgeObject>(
    `/knowledge-objects/${knowledgeObjectId}/publish`,
    { method: 'POST' },
  );
}


export async function getDashboardSummary(): Promise<DashboardSummary> {
  return jsonFetch<DashboardSummary>('/dashboard/summary');
}


export async function logTrainingEvent(input: {
  knowledgeObjectId: string;
  userId?: string;
  eventType: TrainingEventType;
  score?: number;
  note?: string;
}): Promise<{ id: string }> {
  return jsonFetch<{ id: string }>(`/training-events`, {
    method: 'POST',
    body: JSON.stringify({
      knowledge_object_id: input.knowledgeObjectId,
      user_id: input.userId ?? null,
      event_type: input.eventType,
      score: input.score ?? null,
      note: input.note ?? null,
    }),
  });
}
