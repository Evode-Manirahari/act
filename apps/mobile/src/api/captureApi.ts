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

import { API_BASE } from '../lib/config';


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


async function jsonFetch<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers ?? {}),
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


export async function getRecording(recordingId: string): Promise<{
  recording: RecordingOut;
  marks: MarkOut[];
}> {
  return jsonFetch(`/recordings/${recordingId}`, { method: 'GET' });
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

  // Dev fallback — backend stores the bytes locally.
  const result = await FileSystem.uploadAsync(
    `${API_BASE}/recordings/${recordingId}/upload`,
    fileUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: contentType,
    },
  );
  if (result.status >= 300) {
    throw new Error(
      `direct upload failed ${result.status}: ${result.body.slice(0, 200)}`,
    );
  }
  return size;
}
