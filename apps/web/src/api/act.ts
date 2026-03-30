import type { User, Session, ChatResponse, Project, ProjectSuggestion, ExperienceLevel, JobDomain } from '@actober/shared-types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as any).error || `HTTP ${res.status}`)
  }
  return res.json()
}

// Stream POST /api/chat — calls onDelta for each token, resolves to final ChatResponse
export async function streamChat(
  sessionId: string,
  message: string,
  options: {
    imageBase64?: string
    imageMimeType?: 'image/jpeg' | 'image/png' | 'image/webp'
    onDelta: (delta: string) => void
  }
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      message,
      imageBase64: options.imageBase64,
      imageMimeType: options.imageMimeType,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as any).error || `HTTP ${res.status}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalResponse: ChatResponse | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw) continue

      let event: any
      try { event = JSON.parse(raw) } catch { continue }

      if (event.type === 'delta') {
        options.onDelta(event.content as string)
      } else if (event.type === 'done') {
        finalResponse = {
          message: event.message,
          phase: event.phase,
          suggestions: event.suggestions,
          project: event.project,
        }
      } else if (event.type === 'error') {
        throw new Error(event.message || 'Stream error')
      }
    }
  }

  if (!finalResponse) throw new Error('Stream ended without final event')
  return finalResponse
}

export const api = {
  registerUser: (deviceId: string, name?: string, experienceLevel?: ExperienceLevel, domain?: JobDomain) =>
    request<User>('/api/users/register', {
      method: 'POST',
      body: JSON.stringify({ deviceId, name, experienceLevel, domain }),
    }),

  createSession: (userId: string) =>
    request<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  getSession: (sessionId: string) =>
    request<Session>(`/api/sessions/${sessionId}`),

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
