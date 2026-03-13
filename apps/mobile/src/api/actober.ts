import { User, Session, Message, ChatResponse, Trade } from '@actober/shared-types';

declare const process: { env: Record<string, string | undefined> };
const BASE_URL = (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL) || 'http://localhost:3001';
const TIMEOUT_MS = 10_000;

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  retries = 1
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err: any) {
    clearTimeout(timer);
    if (retries > 0 && err.name === 'AbortError') {
      return fetchWithTimeout(url, options, retries - 1);
    }
    throw err;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function registerUser(deviceId: string, trade: Trade = 'ELECTRICAL'): Promise<User> {
  return request<User>('/api/users/register', {
    method: 'POST',
    body: JSON.stringify({ deviceId, trade }),
  });
}

export async function getUser(deviceId: string): Promise<User> {
  return request<User>(`/api/users/${deviceId}`);
}

export async function createSession(
  userId: string,
  trade: Trade,
  jobAddress?: string
): Promise<Session> {
  return request<Session>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ userId, trade, jobAddress }),
  });
}

export async function getSession(sessionId: string): Promise<Session> {
  return request<Session>(`/api/sessions/${sessionId}`);
}

export async function getUserSessions(userId: string): Promise<Session[]> {
  return request<Session[]>(`/api/sessions/user/${userId}`);
}

export async function patchSession(
  sessionId: string,
  data: { endedAt?: string; jobNotes?: string }
): Promise<Session> {
  return request<Session>(`/api/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function sendMessage(
  sessionId: string,
  message: string,
  imageBase64?: string
): Promise<ChatResponse> {
  return request<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ sessionId, message, imageBase64 }),
  });
}

export async function getSessionSummary(sessionId: string): Promise<{ summary: string }> {
  return request<{ summary: string }>(`/api/sessions/${sessionId}/summary`);
}

export async function exportSessionPdf(sessionId: string): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000); // PDF gen can be slow

  try {
    const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}/export`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new ApiError(res.status, `Export failed: HTTP ${res.status}`);
    return res.arrayBuffer();
  } catch (err: any) {
    clearTimeout(timer);
    throw err;
  }
}

export { ApiError };
