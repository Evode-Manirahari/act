/**
 * Typed client for the act-api ACT Capture endpoints.
 *
 * Used by both server components (for SSR data fetches) and route handlers
 * (for client-driven mutations from the moment detail page).
 */
import { getActAuthHeaders } from './actAuth';
import { ACT_API_BASE } from './config';


/**
 * Multipart form forward to act-api. Used by the audio-answer flow —
 * the Next route handler can't reuse jsonFetch because it needs to
 * stream a Blob without re-encoding.
 */
export async function forwardMultipart<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`${ACT_API_BASE}${path}`, {
    method: 'POST',
    body: form,
    cache: 'no-store',
    headers: await getActAuthHeaders(),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `POST ${path} -> ${response.status}: ${body.slice(0, 300)}`,
    );
  }
  return (await response.json()) as T;
}

export interface MomentOut {
  id: string;
  recording_id: string;
  start_s: number;
  end_s: number;
  moment_type: string;
  score: number;
  do_not_interrupt: boolean;
  evidence_json: Record<string, unknown> | string;
  why_it_matters: string | null;
  status: string;
  reviewer_id: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface TranscriptSegmentOut {
  id: string;
  recording_id: string;
  start_s: number;
  end_s: number;
  speaker_label: string | null;
  text: string;
  confidence: number | null;
  created_at: string;
}

export interface ExtractedFrameOut {
  id: string;
  recording_id: string;
  timestamp_s: number;
  storage_key: string;
  thumbnail_key: string | null;
  source: string;
  created_at: string;
}

export interface ExpertAnswerOut {
  id: string;
  question_id: string;
  transcript: string | null;
  audio_key: string | null;
  approved_by_expert: boolean;
  expert_user_id: string | null;
  created_at: string;
}


export interface ElicitationQuestionOut {
  id: string;
  moment_id: string;
  question: string;
  reason: string | null;
  status: string;
  asked_at: string | null;
  created_at: string;
}

export interface KnowledgeObjectOut {
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
  quiz_json: { question: string; choices: string[]; answer: string } | null;
  tags_json: string[] | null;
  status: string;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  safety_recommendation?: string | null;
  safety_risk?: string | null;
  safety_review_json?: Record<string, unknown> | null;
  safety_reviewed_at?: string | null;
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


async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${ACT_API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
      ...(await getActAuthHeaders()),
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `${init?.method ?? 'GET'} ${path} -> ${response.status}: ${body.slice(0, 300)}`,
    );
  }
  return (await response.json()) as T;
}


export interface MeOut {
  user_id: string;
  account_id: string;
  email: string;
  role: string;
}


export const api = {
  me: () => json<MeOut>('/me'),
  reviewQueue: (status = 'proposed', limit = 50) =>
    json<MomentOut[]>(`/moments/review?status=${status}&limit=${limit}`),
  dashboardSummary: () => json<DashboardSummary>('/dashboard/summary'),
  segments: (recordingId: string) =>
    json<TranscriptSegmentOut[]>(`/recordings/${recordingId}/segments`),
  frames: (recordingId: string) =>
    json<ExtractedFrameOut[]>(`/recordings/${recordingId}/frames`),
  questions: (momentId: string) =>
    json<ElicitationQuestionOut[]>(`/moments/${momentId}/questions`),
  reviewMoment: (
    momentId: string,
    body: { status: string; reviewer_id?: string; review_note?: string },
  ) =>
    json<MomentOut>(`/moments/${momentId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  generateQuestion: (momentId: string) =>
    json<ElicitationQuestionOut>(`/moments/${momentId}/questions`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  submitAnswer: (
    questionId: string,
    body: { transcript: string; approved_by_expert?: boolean; expert_user_id?: string },
  ) =>
    json<{ id: string; transcript: string }>(
      `/questions/${questionId}/answers`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  compile: (momentId: string, trade: string = 'hvac') =>
    json<KnowledgeObjectOut>(`/moments/${momentId}/compile`, {
      method: 'POST',
      body: JSON.stringify({ trade }),
    }),
  publish: (knowledgeObjectId: string) =>
    json<KnowledgeObjectOut>(
      `/knowledge-objects/${knowledgeObjectId}/publish`,
      { method: 'POST' },
    ),
  safetyCheck: (knowledgeObjectId: string) =>
    json<KnowledgeObjectOut>(
      `/knowledge-objects/${knowledgeObjectId}/safety-check`,
      { method: 'POST' },
    ),
  reviewChecklist: (
    knowledgeObjectId: string,
    body: {
      reviewer_id?: string | null;
      evidence_checked: boolean;
      safety_reviewed: boolean;
      novice_trap_clear: boolean;
      quiz_answer_correct: boolean;
      approved_by?: string | null;
      notes?: string | null;
    },
  ) =>
    json(`/knowledge-objects/${knowledgeObjectId}/review-checklist`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  editQuestion: (
    questionId: string,
    body: { question?: string; reason?: string; status?: string },
  ) =>
    json<ElicitationQuestionOut>(`/questions/${questionId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  editAnswer: (
    answerId: string,
    body: { transcript?: string; approved_by_expert?: boolean },
  ) =>
    json<ExpertAnswerOut>(`/answers/${answerId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  editKnowledgeObject: (
    knowledgeObjectId: string,
    body: Partial<{
      title: string;
      trade: string;
      situation: string;
      observable_cue: string;
      expert_reasoning: string;
      decision: string;
      novice_trap: string;
      safety_boundary: string;
      verification: string;
      quiz_json: { question: string; choices: string[]; answer: string };
      tags_json: string[];
      status: string;
    }>,
  ) =>
    json<KnowledgeObjectOut>(`/knowledge-objects/${knowledgeObjectId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  library: (q = '', trade = '') => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (trade) params.set('trade', trade);
    return json<KnowledgeObjectOut[]>(
      `/library/search${params.toString() ? `?${params}` : ''}`,
    );
  },
};
