import type {
  User,
  Session,
  ChatResponse,
  Project,
  ProjectSuggestion,
  ExperienceLevel,
  JobDomain,
} from '@actober/shared-types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3002';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Stream POST /api/chat — yields delta strings, resolves to final ChatResponse
export async function streamChat(
  sessionId: string,
  message: string,
  options: {
    imageBase64?: string;
    imageMimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
    onDelta: (delta: string) => void;
  }
): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      message,
      imageBase64: options.imageBase64,
      imageMimeType: options.imageMimeType,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResponse: ChatResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;

      let event: any;
      try { event = JSON.parse(raw); } catch { continue; }

      if (event.type === 'delta') {
        options.onDelta(event.content as string);
      } else if (event.type === 'done') {
        finalResponse = {
          message: event.message,
          phase: event.phase,
          suggestions: event.suggestions,
          project: event.project,
        };
      } else if (event.type === 'error') {
        throw new Error(event.message || 'Stream error');
      }
    }
  }

  if (!finalResponse) throw new Error('Stream ended without final event');
  return finalResponse;
}

export const api = {
  registerUser: (deviceId: string, name?: string, experienceLevel?: ExperienceLevel, domain?: JobDomain): Promise<User> =>
    request('/api/users/register', {
      method: 'POST',
      body: JSON.stringify({ deviceId, name, experienceLevel, domain }),
    }),

  getUser: (deviceId: string): Promise<User> =>
    request(`/api/users/${deviceId}`),

  createSession: (userId: string): Promise<Session> =>
    request('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  getSession: (sessionId: string): Promise<Session> =>
    request(`/api/sessions/${sessionId}`),

  commitToProject: (params: {
    userId: string;
    sessionId: string;
    suggestion: ProjectSuggestion;
    contextSnapshot: string;
  }): Promise<Project> =>
    request('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        userId: params.userId,
        sessionId: params.sessionId,
        title: params.suggestion.title,
        description: params.suggestion.description,
        category: params.suggestion.category,
        materials: params.suggestion.materials,
        timeRequired: params.suggestion.timeRequired,
        contextSnapshot: params.contextSnapshot,
        steps: params.suggestion.steps,
      }),
    }),

  updateProject: (projectId: string, update: {
    status?: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
    currentStepIndex?: number;
    stepCompleted?: number;
  }): Promise<Project> =>
    request(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    }),

  getUserProjects: (userId: string): Promise<Project[]> =>
    request(`/api/projects/user/${userId}`),
};
