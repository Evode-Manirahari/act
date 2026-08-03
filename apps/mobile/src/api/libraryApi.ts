/**
 * Typed client for the apprentice-side endpoints (PR 7 + 8 on act-api).
 * Used by the Learn tab to browse published knowledge objects and log
 * training events when an apprentice attempts a quiz.
 */
import { getAuthHeaders, requireAuthHeaders } from '../lib/authToken';
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


/** Pull FastAPI's `{"detail": ...}` out of an error body, if it is there. */
export function parseApiDetail(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { detail?: unknown };
    const detail = parsed?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail.trim();
    // 422s from FastAPI's own validation arrive as a list of error objects.
    if (Array.isArray(detail)) {
      const messages = detail
        .map((entry) =>
          entry && typeof entry === 'object' && typeof (entry as { msg?: unknown }).msg === 'string'
            ? (entry as { msg: string }).msg
            : null,
        )
        .filter((msg): msg is string => Boolean(msg));
      if (messages.length) return messages.join('; ');
    }
  } catch {
    // Not JSON — the raw body is the best detail we have.
  }
  const trimmed = body.trim();
  return trimmed ? trimmed : null;
}

/**
 * The machine-readable reason act-api attaches when it refuses an answer, e.g.
 * `answer rejected (expert_answer_echoes_prompt): …`. Lets the UI branch on the
 * cause instead of pattern-matching prose.
 */
export function parseRejectionReason(detail: string | null): string | null {
  if (!detail) return null;
  const match = /answer rejected \(([a-z_]+)\)/i.exec(detail);
  return match ? match[1] : null;
}

async function jsonFetch<T>(
  path: string,
  init?: RequestInit,
  opts: { requireAuth?: boolean } = {},
): Promise<T> {
  const authHeaders = opts.requireAuth
    ? await requireAuthHeaders()
    : await getAuthHeaders();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
      ...authHeaders,
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw LibraryApiError.fromResponse(
      `${init?.method ?? 'GET'} ${path}`,
      response.status,
      body,
    );
  }
  return (await response.json()) as T;
}


export class LibraryApiError extends Error {
  /** The backend's own explanation, unwrapped from `{"detail": …}`. */
  readonly detail: string | null;
  /** Reason code when the backend refused the text as non-human-authored. */
  readonly reason: string | null;

  constructor(
    message: string,
    readonly status: number,
    detail: string | null = null,
    reason: string | null = null,
  ) {
    super(message);
    this.name = 'LibraryApiError';
    this.detail = detail;
    this.reason = reason;
  }

  static fromResponse(where: string, status: number, body: string): LibraryApiError {
    const detail = parseApiDetail(body);
    return new LibraryApiError(
      `${where} -> ${status}: ${body.slice(0, 200)}`,
      status,
      detail,
      parseRejectionReason(detail),
    );
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

export interface PendingDebriefItem {
  question_id: string;
  question: string;
  reason: string | null;
  moment_id: string;
  recording_id: string;
  job_id: string;
  recorded_by: string;
  created_at: string | null;
}

export interface PendingDebrief {
  count: number;
  items: PendingDebriefItem[];
}

/** Questions the auto-chain drafted that still need an expert's answer —
 * drives the "debrief waiting" badge on PilotHome. */
export async function getPendingDebrief(): Promise<PendingDebrief> {
  return jsonFetch<PendingDebrief>('/debrief/pending');
}

/**
 * Questions already drafted for this moment, newest first.
 *
 * Auth is required, not optional. This read decides whether a moment counts as
 * debriefed, and an anonymous call against an account-scoped route returns 401 —
 * which, if it reached the hydration layer as an ordinary failure, would be one
 * step away from being read as "no questions exist". Failing at the session
 * boundary keeps that ambiguity out of the state machine entirely.
 */
export async function listMomentQuestions(
  momentId: string,
): Promise<ElicitationQuestion[]> {
  return jsonFetch<ElicitationQuestion[]>(
    `/moments/${momentId}/questions`,
    undefined,
    { requireAuth: true },
  );
}

export async function generateMomentQuestion(
  momentId: string,
): Promise<ElicitationQuestion> {
  return jsonFetch<ElicitationQuestion>(
    `/moments/${momentId}/questions`,
    { method: 'POST', body: JSON.stringify({}) },
    { requireAuth: true },
  );
}

/** A question that is still waiting for the technician. */
const OPEN_QUESTION_STATUSES = ['proposed', 'asked'];

/**
 * Pick the question that authoritatively represents this moment's debrief.
 *
 * `listMomentQuestions` returns newest-first. An *answered* question outranks an
 * open one: if the expert already answered, that is the debrief, and showing an
 * empty answer box next to it would invite a second answer for a moment that is
 * already done. `dismissed` questions are explicitly never authoritative — they
 * were retired on purpose and must not resurrect a finished moment.
 */
export function selectAuthoritativeQuestion(
  questions: ElicitationQuestion[],
): { question: ElicitationQuestion; answered: boolean } | null {
  const answered = questions.find((question) => question.status === 'answered');
  if (answered) return { question: answered, answered: true };
  const open = questions.find((question) =>
    OPEN_QUESTION_STATUSES.includes(question.status),
  );
  if (open) return { question: open, answered: false };
  return null;
}

/** Read-only resolution: what does the server say about this moment's debrief? */
export async function resolveMomentQuestion(
  momentId: string,
): Promise<{ question: ElicitationQuestion; answered: boolean } | null> {
  return selectAuthoritativeQuestion(await listMomentQuestions(momentId));
}

/**
 * Load this moment's debrief question, drafting one only if nothing relevant
 * exists yet.
 *
 * POST is not idempotent — it drafts a fresh question (and burns a model call)
 * on every tap. Two failure modes are avoided here: a duplicate tap creating a
 * second competing question, and a reload after an answer creating a brand-new
 * question as though the debrief never happened.
 */
export async function loadOrCreateMomentQuestion(
  momentId: string,
): Promise<{ question: ElicitationQuestion; answered: boolean }> {
  const existing = await resolveMomentQuestion(momentId);
  if (existing) return existing;
  return { question: await generateMomentQuestion(momentId), answered: false };
}

export async function editMomentQuestion(input: {
  questionId: string;
  question?: string;
  reason?: string | null;
  status?: 'proposed' | 'asked' | 'answered' | 'dismissed';
}): Promise<ElicitationQuestion> {
  return jsonFetch<ElicitationQuestion>(
    `/questions/${input.questionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        question: input.question,
        reason: input.reason,
        status: input.status,
      }),
    },
    { requireAuth: true },
  );
}

/**
 * Record the technician's typed answer.
 *
 * No author id is sent. act-api derives the answer's author from the bearer
 * token and rejects a client-supplied `expert_user_id` that names anyone else
 * (403) — an id the client asserts is not proof of authorship. The session is
 * required rather than optional for the same reason.
 */
export async function submitExpertAnswer(input: {
  questionId: string;
  transcript: string;
  approvedByExpert?: boolean;
}): Promise<ExpertAnswer> {
  return jsonFetch<ExpertAnswer>(
    `/questions/${input.questionId}/answers`,
    {
      method: 'POST',
      body: JSON.stringify({
        transcript: input.transcript,
        approved_by_expert: input.approvedByExpert ?? true,
      }),
    },
    { requireAuth: true },
  );
}

/** Same authorship rule as the typed route — the token names the author. */
export async function submitExpertAudioAnswer(input: {
  questionId: string;
  uri: string;
  approvedByExpert?: boolean;
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

  const response = await fetch(`${API_BASE}/questions/${input.questionId}/answers/audio`, {
    method: 'POST',
    headers: { Accept: 'application/json', ...(await requireAuthHeaders()) },
    body: form,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw LibraryApiError.fromResponse(
      `POST /questions/${input.questionId}/answers/audio`,
      response.status,
      body,
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
  return jsonFetch<KnowledgeObject>(
    `/moments/${input.momentId}/compile`,
    { method: 'POST', body: JSON.stringify({ trade: input.trade ?? 'hvac' }) },
    { requireAuth: true },
  );
}

export async function publishKnowledgeObject(
  knowledgeObjectId: string,
): Promise<KnowledgeObject> {
  return jsonFetch<KnowledgeObject>(
    `/knowledge-objects/${knowledgeObjectId}/publish`,
    { method: 'POST' },
    { requireAuth: true },
  );
}

/**
 * The account's knowledge objects, drafts included.
 *
 * act-api has no `moment_id` filter on this route, so hydration pulls the
 * account's cards once per refresh and indexes them locally rather than issuing
 * a request per moment.
 *
 * Auth is required for the same reason as `listMomentQuestions`: this read
 * decides whether a moment is already compiled or published, and an anonymous
 * 401 must never be mistakable for "this account has no cards".
 */
export async function listKnowledgeObjects(input: {
  status?: string;
  trade?: string;
  limit?: number;
} = {}): Promise<KnowledgeObject[]> {
  const params = new URLSearchParams();
  if (input.status) params.set('status', input.status);
  if (input.trade) params.set('trade', input.trade);
  params.set('limit', String(input.limit ?? 200));
  return jsonFetch<KnowledgeObject[]>(
    `/knowledge-objects?${params}`,
    undefined,
    { requireAuth: true },
  );
}

/**
 * Index cards by the moment they were compiled from.
 *
 * Compile is not idempotent server-side, so one moment can own more than one
 * card (a double tap before this PR, or a lost response). A published card wins
 * over a draft, and the newest wins among equals — that is the card the
 * reviewer is actually looking at.
 */
export function indexCardsByMoment(
  cards: KnowledgeObject[],
): Record<string, KnowledgeObject> {
  const byMoment: Record<string, KnowledgeObject> = {};
  for (const card of cards) {
    if (!card.moment_id) continue;
    const existing = byMoment[card.moment_id];
    if (!existing) {
      byMoment[card.moment_id] = card;
      continue;
    }
    const existingPublished = existing.status === 'published';
    const candidatePublished = card.status === 'published';
    if (candidatePublished && !existingPublished) {
      byMoment[card.moment_id] = card;
    } else if (candidatePublished === existingPublished && card.created_at > existing.created_at) {
      byMoment[card.moment_id] = card;
    }
  }
  return byMoment;
}

export async function safetyCheckKnowledgeObject(
  knowledgeObjectId: string,
): Promise<KnowledgeObject> {
  return jsonFetch<KnowledgeObject>(
    `/knowledge-objects/${knowledgeObjectId}/safety-check`,
    { method: 'POST' },
    { requireAuth: true },
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
    { requireAuth: true },
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
