/**
 * Typed client for the ACT Capture endpoints (act-api PR 1).
 *
 * The server returns a presigned PUT URL when an S3 endpoint is configured;
 * otherwise the client falls back to multipart upload against /upload. The
 * offline queue layer above this module decides which path to take.
 */
// expo-file-system v19 (Expo SDK 54) moved the functional API to /legacy. The
// new class-based `File`/`Directory` API doesn't yet expose upload helpers
// for presigned PUT + multipart in one call, so we use the legacy module.
import * as FileSystem from 'expo-file-system/legacy';

import { getAuthHeaders, hasAuthSession } from '../lib/authToken';
import { API_BASE } from '../lib/config';


/**
 * Pilot session bootstrap: returns the seeded demo account/user/job the
 * capture flow records against until real auth lands.
 */
export interface DemoSession {
  job_id: string;
  user_id: string;
  account_id: string;
  role?: string;
}

export interface DemoContext {
  user_id: string;
  account_id: string;
  role?: string;
}

export async function getDemoContext(): Promise<DemoContext> {
  const response = await fetch(`${API_BASE}/demo/context`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Demo context ${response.status}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

export async function createDemoSession(): Promise<DemoSession> {
  const response = await fetch(`${API_BASE}/demo/session`, { method: 'POST' });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Session ${response.status}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

/** The verified identity (act-api GET /me) — only meaningful with a session. */
export async function getMe(): Promise<DemoContext> {
  return jsonFetch<DemoContext>('/me', { method: 'GET' });
}

/**
 * Identity for the pilot surfaces: the verified /me identity when logged in,
 * the seeded demo context otherwise. Same shape either way, so screens don't
 * care which world they're in.
 */
export async function getPilotContext(): Promise<DemoContext> {
  return (await hasAuthSession()) ? getMe() : getDemoContext();
}

/**
 * Start a capture session: a fresh job to record against, plus who's
 * recording. Logged in, the job is created under the verified identity
 * (the backend overrides the payload actor anyway); logged out, the
 * pre-auth demo-session flow is unchanged.
 */
export async function createCaptureSession(): Promise<DemoSession> {
  if (!(await hasAuthSession())) return createDemoSession();
  const me = await getMe();
  const job = await jsonFetch<{ id: string }>('/jobs', {
    method: 'POST',
    body: JSON.stringify({ user_id: me.user_id }),
  });
  return { job_id: job.id, user_id: me.user_id, account_id: me.account_id, role: me.role };
}


export type RecordingStatus =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'processing'
  | 'ready'
  | 'failed';

export type ConsentState =
  | 'internal_training'
  | 'company_only'
  | 'public_with_review'
  | 'do_not_share';

export interface RecordingOut {
  id: string;
  job_id: string;
  user_id: string;
  storage_key: string;
  content_type: string | null;
  trade: string;
  status: RecordingStatus;
  consent_state: ConsentState;
  redaction_state: string;
  redaction_reason: string | null;
  redaction_requested_by: string | null;
  redaction_requested_at: string | null;
  duration_s: number | null;
  bytes_uploaded: number | null;
  started_at: string | null;
  ended_at: string | null;
  device_meta: string | null;
  created_at: string;
}

export interface CreateRecordingInput {
  jobId: string;
  userId: string;
  contentType?: string;
  trade?: string;
  consentState?: ConsentState;
  deviceMeta?: Record<string, unknown>;
}

export interface CreateRecordingResponse {
  recording: RecordingOut;
  upload_url: string | null;
  upload_method: 'PUT' | 'POST';
  storage_key: string;
}

export interface MarkOut {
  id: string;
  recording_id: string;
  timestamp_s: number;
  mark_type: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ExtractedFrameOut {
  id: string;
  recording_id: string;
  timestamp_s: number;
  storage_key: string;
  thumbnail_key: string | null;
  url: string | null;
  thumbnail_url: string | null;
  source: string;
  created_at: string;
}

export interface CreateMarkInput {
  recordingId: string;
  timestampSeconds: number;
  markType?: string;
  note?: string;
  createdBy?: string;
}

export interface CompleteRecordingInput {
  recordingId: string;
  durationSeconds?: number;
  bytesUploaded?: number;
  endedAt?: string;
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
  status: 'proposed' | 'approved' | 'rejected' | 'needs_more_info' | string;
  reviewer_id: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  evidence_frames?: ExtractedFrameOut[];
}

export interface ReviewQueueItem extends MomentOut {
  job_id: string | null;
  trade: string | null;
  recording_status: string | null;
  system_type: string | null;
  equipment_make: string | null;
  equipment_model: string | null;
  customer_site_label: string | null;
  jurisdiction: string | null;
}

export interface JobOutcomeOut {
  id: string;
  job_id: string;
  final_diagnosis: string | null;
  fix: string | null;
  callback: boolean;
  callback_at: string | null;
  manager_notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface JobEventOut {
  id: string;
  account_id: string | null;
  actor_id: string | null;
  job_id: string | null;
  recording_id: string | null;
  event_type: string;
  source: string;
  payload_json: Record<string, unknown> | null;
  occurred_at: string;
  created_at: string;
}

export interface UpsertJobOutcomeInput {
  jobId: string;
  finalDiagnosis?: string | null;
  fix?: string | null;
  callback?: boolean;
  callbackAt?: string | null;
  managerNotes?: string | null;
  recordedBy?: string | null;
}


async function jsonFetch<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers ?? {}),
      ...(await getAuthHeaders()),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new CaptureApiError(
      `${init.method ?? 'GET'} ${path} -> ${response.status}: ${body.slice(0, 200)}`,
      response.status,
    );
  }
  return (await response.json()) as T;
}


export class CaptureApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'CaptureApiError';
  }
}


export async function createRecording(
  input: CreateRecordingInput,
): Promise<CreateRecordingResponse> {
  return jsonFetch<CreateRecordingResponse>(
    `/jobs/${input.jobId}/recordings`,
    {
      method: 'POST',
      body: JSON.stringify({
        user_id: input.userId,
        content_type: input.contentType ?? 'video/mp4',
        trade: input.trade ?? 'hvac',
        consent_state: input.consentState ?? 'internal_training',
        device_meta: input.deviceMeta ? JSON.stringify(input.deviceMeta) : null,
      }),
    },
  );
}


export async function postMark(input: CreateMarkInput): Promise<MarkOut> {
  return jsonFetch<MarkOut>(`/recordings/${input.recordingId}/marks`, {
    method: 'POST',
    body: JSON.stringify({
      timestamp_s: input.timestampSeconds,
      mark_type: input.markType ?? 'teachable',
      note: input.note ?? null,
      created_by: input.createdBy ?? null,
    }),
  });
}


export async function completeRecording(
  input: CompleteRecordingInput,
): Promise<RecordingOut> {
  return jsonFetch<RecordingOut>(`/recordings/${input.recordingId}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      duration_s: input.durationSeconds ?? null,
      bytes_uploaded: input.bytesUploaded ?? null,
      ended_at: input.endedAt ?? null,
    }),
  });
}

export async function requestRecordingRedaction(input: {
  recordingId: string;
  reason?: string | null;
  requestedBy?: string | null;
}): Promise<RecordingOut> {
  return jsonFetch<RecordingOut>(`/recordings/${input.recordingId}/redaction`, {
    method: 'POST',
    body: JSON.stringify({
      reason: input.reason ?? null,
      requested_by: input.requestedBy ?? null,
    }),
  });
}


export async function getRecording(recordingId: string): Promise<{
  recording: RecordingOut;
  marks: MarkOut[];
}> {
  return jsonFetch(`/recordings/${recordingId}`, { method: 'GET' });
}

export async function listRecordingMoments(input: {
  recordingId: string;
  status?: string;
}): Promise<MomentOut[]> {
  const params = new URLSearchParams();
  if (input.status) params.set('status', input.status);
  const suffix = params.toString() ? `?${params}` : '';
  return jsonFetch<MomentOut[]>(
    `/recordings/${input.recordingId}/moments${suffix}`,
    { method: 'GET' },
  );
}

export async function listReviewQueue(input: {
  status?: string;
  trade?: string;
  includeUnready?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<ReviewQueueItem[]> {
  const params = new URLSearchParams();
  if (input.status) params.set('status', input.status);
  if (input.trade) params.set('trade', input.trade);
  if (input.includeUnready) params.set('include_unready', 'true');
  if (input.limit) params.set('limit', String(input.limit));
  if (input.offset) params.set('offset', String(input.offset));
  const suffix = params.toString() ? `?${params}` : '';
  return jsonFetch<ReviewQueueItem[]>(`/moments/review${suffix}`, { method: 'GET' });
}

export async function reviewMoment(input: {
  momentId: string;
  status: 'approved' | 'rejected' | 'needs_more_info' | 'proposed';
  reviewerId?: string;
  reviewNote?: string;
}): Promise<MomentOut> {
  return jsonFetch<MomentOut>(`/moments/${input.momentId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: input.status,
      reviewer_id: input.reviewerId ?? null,
      review_note: input.reviewNote ?? null,
    }),
  });
}

export async function upsertJobOutcome(
  input: UpsertJobOutcomeInput,
): Promise<JobOutcomeOut> {
  return jsonFetch<JobOutcomeOut>(`/jobs/${input.jobId}/outcomes`, {
    method: 'POST',
    body: JSON.stringify({
      final_diagnosis: input.finalDiagnosis ?? null,
      fix: input.fix ?? null,
      callback: input.callback ?? false,
      callback_at: input.callbackAt ?? null,
      manager_notes: input.managerNotes ?? null,
      recorded_by: input.recordedBy ?? null,
    }),
  });
}

export async function logJobEvent(input: {
  eventType: string;
  actorId?: string | null;
  jobId?: string | null;
  recordingId?: string | null;
  payload?: Record<string, unknown> | null;
  source?: string;
}): Promise<JobEventOut> {
  return jsonFetch<JobEventOut>('/job-events', {
    method: 'POST',
    body: JSON.stringify({
      event_type: input.eventType,
      actor_id: input.actorId ?? null,
      job_id: input.jobId ?? null,
      recording_id: input.recordingId ?? null,
      source: input.source ?? 'mobile',
      payload_json: input.payload ?? null,
    }),
  });
}

export async function getJobOutcome(jobId: string): Promise<JobOutcomeOut> {
  return jsonFetch<JobOutcomeOut>(`/jobs/${jobId}/outcomes`, {
    method: 'GET',
  });
}


export interface ProcessResponse {
  recording_id: string;
  status: string;
}

/**
 * Kick the act-api pipeline (ffmpeg + Deepgram + frame sample + moment
 * detect). Returns 202 + a status sentinel; the actual work runs in a
 * server-side background task. Poll getRecording for the final state.
 */
export async function startProcessing(recordingId: string): Promise<ProcessResponse> {
  return jsonFetch<ProcessResponse>(`/recordings/${recordingId}/process`, {
    method: 'POST',
  });
}


/**
 * Upload a local file to the storage backend. Uses a presigned PUT when the
 * server returned one (production path against R2/S3); falls back to a
 * multipart POST against the dev /upload route otherwise.
 *
 * Returns the number of bytes uploaded so the caller can stamp /complete.
 */
export async function uploadRecordingFile(
  recordingId: string,
  fileUri: string,
  presignedUrl: string | null,
  contentType: string = 'video/mp4',
): Promise<number> {
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) {
    throw new Error(`recording file missing on disk: ${fileUri}`);
  }
  const size = (info as { size?: number }).size ?? 0;

  if (presignedUrl) {
    const result = await FileSystem.uploadAsync(presignedUrl, fileUri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': contentType },
    });
    if (result.status >= 300) {
      throw new Error(
        `presigned PUT failed ${result.status}: ${result.body.slice(0, 200)}`,
      );
    }
    return size;
  }

  // Dev fallback — backend stores the bytes locally. Unlike the presigned PUT
  // (whose signature an Authorization header must not touch), this hits an
  // auth-enforced act-api route, so the session token rides along.
  const result = await FileSystem.uploadAsync(
    `${API_BASE}/recordings/${recordingId}/upload`,
    fileUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: contentType,
      headers: await getAuthHeaders(),
    },
  );
  if (result.status >= 300) {
    throw new Error(
      `direct upload failed ${result.status}: ${result.body.slice(0, 200)}`,
    );
  }
  return size;
}
