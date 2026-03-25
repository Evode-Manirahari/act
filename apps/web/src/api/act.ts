import type { User, Session, ChatResponse, Project, ProjectSuggestion, ExperienceLevel } from '@actober/shared-types'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as any).error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  registerUser: (deviceId: string, name?: string, experienceLevel?: ExperienceLevel) =>
    request<User>('/api/users/register', {
      method: 'POST',
      body: JSON.stringify({ deviceId, name, experienceLevel }),
    }),

  createSession: (userId: string) =>
    request<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  getSession: (sessionId: string) =>
    request<Session>(`/api/sessions/${sessionId}`),

  sendMessage: (sessionId: string, message: string) =>
    request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message }),
    }),

  commitToProject: (params: {
    userId: string
    sessionId: string
    suggestion: ProjectSuggestion
    contextSnapshot: string
  }) =>
    request<Project>('/api/projects', {
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
    status?: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
    currentStepIndex?: number
    stepCompleted?: number
  }) =>
    request<Project>(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    }),

  getUserProjects: (userId: string) =>
    request<Project[]>(`/api/projects/user/${userId}`),
}
