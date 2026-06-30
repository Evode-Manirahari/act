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
  system_type?: string | null;
  customer_site_label?: string | null;
  equipment_make?: string | null;
  equipment_model?: string | null;
  jurisdiction?: string | null;
  status: string;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  safety_recommendation?: string | null;
  safety_risk?: string | null;
  safety_review_json?: Record<string, unknown> | null;
  safety_reviewed_at?: string | null;
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

export interface ReviewChecklist {
  id: string;
  knowledge_object_id: string;
  moment_id: string | null;
  reviewer_id: string | null;
  evidence_checked: boolean;
  safety_reviewed: boolean;
  novice_trap_clear: boolean;
  quiz_answer_correct: boolean;
  approved_by: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface LibraryAskCitation {
  card_id: string;
  title: string;
}

export interface LibraryAskResponse {
  answer: string;
  citations: LibraryAskCitation[];
  refusal_reason: string | null;
}

export interface PilotWeeklyReport {
  week: string;
  summary: string;
  metrics: {
    jobs_captured: number;
    recordings_ready: number;
    moments_detected: number;
    moments_approved: number;
    moments_rejected: number;
    cards_published: number;
    training_events: number;
    quiz_attempts: number;
    quiz_correct: number;
    outcomes_logged: number;
    callbacks: number;
  };
  wins: string[];
  risks: string[];
  operator_questions: string[];
  narrative_ok: boolean;
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

export async function editMomentQuestion(input: {
  questionId: string;
  question?: string;
  reason?: string | null;
  status?: 'proposed' | 'asked' | 'answered' | 'dismissed';
}): Promise<ElicitationQuestion> {
  return jsonFetch<ElicitationQuestion>(`/questions/${input.questionId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      question: input.question,
      reason: input.reason,
      status: input.status,
    }),
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

export async function submitExpertAudioAnswer(input: {
  questionId: string;
  uri: string;
  approvedByExpert?: boolean;
  expertUserId?: string | null;
  contentType?: string;
  fileName?: string;
}): Promise<ExpertAnswer> {
  const form = new FormData();
  form.append('audio', {
    uri: input.uri,
    name: input.fileName ?? 'expert-answer.m4a',
    type: input.contentType ?? 'audio/m4a',
  } as unknown as Blob);
  form.append('approved_by_expert', String(input.approvedByExpert ?? true));
  if (input.expertUserId) {
    form.append('expert_user_id', input.expertUserId);
  }

  const response = await fetch(`${API_BASE}/questions/${input.questionId}/answers/audio`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: form,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new LibraryApiError(
      `POST /questions/${input.questionId}/answers/audio -> ${response.status}: ${body.slice(0, 200)}`,
      response.status,
    );
  }
  return (await response.json()) as ExpertAnswer;
}

/** One turn of the backend turn-based debrief voice agent. */
export interface DebriefTurn {
  complete: boolean;
  turn: number;
  max_turns: number;
  question_id: string | null;
  question: string | null;
  reason: string | null;
  /** Playable URL for the spoken question when requested with speak. */
  question_audio_url: string | null;
}

/**
 * Drive the next turn of the debrief interview for a moment. With `speak`, the
 * backend synthesizes the question and returns a playable `question_audio_url`.
 * The expert answers each returned question via submitExpertAudioAnswer; call
 * again to advance until `complete`.
 */
export async function debriefNext(
  momentId: string,
  opts: { speak?: boolean } = {},
): Promise<DebriefTurn> {
  const suffix = opts.speak ? '?speak=true' : '';
  return jsonFetch<DebriefTurn>(`/moments/${momentId}/debrief/next${suffix}`, {
    method: 'POST',
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

export async function safetyCheckKnowledgeObject(
  knowledgeObjectId: string,
): Promise<KnowledgeObject> {
  return jsonFetch<KnowledgeObject>(
    `/knowledge-objects/${knowledgeObjectId}/safety-check`,
    { method: 'POST' },
  );
}

export async function upsertReviewChecklist(input: {
  knowledgeObjectId: string;
  reviewerId?: string | null;
  evidenceChecked?: boolean;
  safetyReviewed?: boolean;
  noviceTrapClear?: boolean;
  quizAnswerCorrect?: boolean;
  approvedBy?: string | null;
  notes?: string | null;
}): Promise<ReviewChecklist> {
  return jsonFetch<ReviewChecklist>(
    `/knowledge-objects/${input.knowledgeObjectId}/review-checklist`,
    {
      method: 'POST',
      body: JSON.stringify({
        reviewer_id: input.reviewerId ?? null,
        evidence_checked: input.evidenceChecked ?? true,
        safety_reviewed: input.safetyReviewed ?? true,
        novice_trap_clear: input.noviceTrapClear ?? true,
        quiz_answer_correct: input.quizAnswerCorrect ?? true,
        approved_by: input.approvedBy ?? input.reviewerId ?? null,
        notes: input.notes ?? null,
      }),
    },
  );
}

export async function askLibrary(input: {
  query: string;
  trade?: string;
  accountId?: string;
  limit?: number;
}): Promise<LibraryAskResponse> {
  return jsonFetch<LibraryAskResponse>('/library/ask', {
    method: 'POST',
    body: JSON.stringify({
      query: input.query,
      trade: input.trade ?? null,
      account_id: input.accountId ?? null,
      limit: input.limit ?? 3,
    }),
  });
}


export async function getDashboardSummary(): Promise<DashboardSummary> {
  return jsonFetch<DashboardSummary>('/dashboard/summary');
}

export async function getPilotWeeklyReport(input: {
  accountId?: string;
  week?: string;
  baselineRate?: number;
} = {}): Promise<PilotWeeklyReport> {
  const params = new URLSearchParams();
  if (input.accountId) params.set('account_id', input.accountId);
  if (input.week) params.set('week', input.week);
  if (input.baselineRate != null) params.set('baseline_rate', String(input.baselineRate));
  const suffix = params.toString() ? `?${params}` : '';
  return jsonFetch<PilotWeeklyReport>(`/dashboard/weekly-report${suffix}`);
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
