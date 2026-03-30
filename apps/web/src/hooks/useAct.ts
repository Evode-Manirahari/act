import { useState, useEffect, useCallback, useRef } from 'react'
import { api, streamChat } from '../api/act'
import type { User, Session, Message, Project, ProjectSuggestion, ConversationPhase, JobDomain } from '@actober/shared-types'

const DEVICE_ID_KEY = 'act_device_id'
const SESSION_KEY = 'act_session_id'

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = 'device_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export type Screen = 'boot' | 'onboarding' | 'chat' | 'project'

export function useAct() {
  const [screen, setScreen] = useState<Screen>('boot')
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [phase, setPhase] = useState<ConversationPhase>('DISCOVERY')
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[] | null>(null)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)
  const sessionRef = useRef<Session | null>(null)

  useEffect(() => { sessionRef.current = session }, [session])

  useEffect(() => { boot() }, [])

  async function boot() {
    try {
      const deviceId = getOrCreateDeviceId()
      const u = await api.registerUser(deviceId)
      setUser(u)

      const savedId = localStorage.getItem(SESSION_KEY)
      if (savedId) {
        try {
          const s = await api.getSession(savedId)
          if (s.phase !== 'COMPLETE') {
            setSession(s)
            setMessages(s.messages ?? [])
            setPhase(s.phase)
            if (s.project?.status === 'IN_PROGRESS') setActiveProject(s.project)
            setScreen(u.name ? 'chat' : 'onboarding')
            return
          }
        } catch { /* session gone */ }
      }

      setScreen(u.name ? 'chat' : 'onboarding')
    } catch (err) {
      console.error('Boot error:', err)
      setScreen('chat')
    }
  }

  async function finishOnboarding(name: string, experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERIENCED', domain?: JobDomain) {
    if (!user) return
    try {
      const updated = await api.registerUser(user.deviceId, name || undefined, experienceLevel, domain)
      setUser(updated)
    } catch (err) {
      console.error('Finish onboarding error:', err)
    }
    setScreen('chat')
  }

  async function startSession() {
    if (!user) return null
    const s = await api.createSession(user.id)
    setSession(s)
    setMessages([])
    setPhase('DISCOVERY')
    setSuggestions(null)
    setActiveProject(null)
    localStorage.setItem(SESSION_KEY, s.id)
    return s
  }

  // Stream-aware sendMessage — shows tokens as they arrive
  const sendMessage = useCallback(async (text: string, silent = false, imageBase64?: string, imageMimeType?: 'image/jpeg' | 'image/png' | 'image/webp') => {
    let s = sessionRef.current
    if (!s) {
      s = await startSession()
      if (!s) return
    }

    if (!silent) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sessionId: s!.id,
        role: 'USER',
        content: imageBase64 ? `📷 ${text || 'What do you see?'}` : text,
        createdAt: new Date().toISOString(),
      }])
    }

    // Add streaming placeholder
    const streamId = `stream_${Date.now()}`
    const stub: Message = { id: streamId, sessionId: s.id, role: 'ASSISTANT', content: '', createdAt: new Date().toISOString() }
    setMessages(prev => [...prev, stub])
    setIsTyping(true)

    try {
      const res = await streamChat(s.id, text, {
        imageBase64,
        imageMimeType,
        onDelta: (delta) => {
          setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: m.content + delta } : m))
        },
      })
      // Replace stub with persisted server message
      setMessages(prev => prev.map(m => m.id === streamId ? res.message : m))
      setPhase(res.phase)
      if (res.suggestions?.length) setSuggestions(res.suggestions)
      if (res.project) setActiveProject(res.project)
    } catch {
      setMessages(prev => prev.map(m => m.id === streamId ? {
        ...m,
        content: "I'm having trouble connecting. Try again in a moment.",
      } : m))
    } finally {
      setIsTyping(false)
    }
  }, [user])

  async function kickoff() {
    const s = await startSession()
    if (!s || !user) return
    await sendMessage('Hello', true)
  }

  async function pickSuggestion(suggestion: ProjectSuggestion) {
    if (!user || !sessionRef.current) return
    setSuggestions(null)
    try {
      const project = await api.commitToProject({
        userId: user.id,
        sessionId: sessionRef.current.id,
        suggestion,
        contextSnapshot: messages.filter(m => m.role === 'USER').slice(0, 3).map(m => m.content).join(' / '),
      })
      setActiveProject(project)
      setPhase('COACHING')
      setProjects(prev => [project, ...prev])
      await sendMessage(`Let's do this: ${suggestion.title}`)
      setScreen('project')
    } catch (err) {
      console.error('Pick suggestion error:', err)
    }
  }

  async function markStepDone(stepIndex: number) {
    if (!activeProject) return
    try {
      const updated = await api.updateProject(activeProject.id, {
        stepCompleted: stepIndex,
        currentStepIndex: Math.min(stepIndex + 1, activeProject.steps.length - 1),
      })
      setActiveProject(updated)
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    } catch (err) {
      console.error('Mark step done error:', err)
    }
  }

  async function completeProject() {
    if (!activeProject) return
    try {
      const updated = await api.updateProject(activeProject.id, { status: 'COMPLETED' })
      setActiveProject(updated)
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
      setPhase('COMPLETE')
    } catch (err) {
      console.error('Complete project error:', err)
    }
  }

  async function abandonProject() {
    if (!activeProject) return
    try {
      const updated = await api.updateProject(activeProject.id, { status: 'ABANDONED' })
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    } catch (err) {
      console.error('Abandon project error:', err)
    }
    setActiveProject(null)
    setSuggestions(null)
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    setMessages([])
    setPhase('DISCOVERY')
    setScreen('chat')
  }

  async function newSession() {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    setMessages([])
    setPhase('DISCOVERY')
    setSuggestions(null)
    setActiveProject(null)
    setSessionKey(k => k + 1)
    setScreen('chat')
  }

  async function loadProjects() {
    if (!user) return
    try {
      const data = await api.getUserProjects(user.id)
      setProjects(data)
    } catch {}
  }

  return {
    screen, setScreen,
    user, session, messages, phase, suggestions, activeProject, projects,
    isTyping, sessionKey,
    finishOnboarding, kickoff, sendMessage, pickSuggestion,
    markStepDone, completeProject, abandonProject, newSession, loadProjects,
  }
}
