import type {
  User,
  Session,
  ChatResponse,
  Project,
  ProjectSuggestion,
  ExperienceLevel,
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

export const api = {
  registerUser: (deviceId: string, name?: string, experienceLevel?: ExperienceLevel): Promise<User> =>
    request('/api/users/register', {
      method: 'POST',
      body: JSON.stringify({ deviceId, name, experienceLevel }),
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

  sendMessage: (sessionId: string, message: string): Promise<ChatResponse> =>
    request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message }),
    }),

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
