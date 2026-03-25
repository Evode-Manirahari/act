import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api/act'
import type { User, Session, Message, Project, ProjectSuggestion, ConversationPhase } from '@actober/shared-types'

const DEVICE_ID_KEY = 'actober_device_id'
const SESSION_KEY = 'actober_session_id'

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
  const sessionRef = useRef<Session | null>(null)

  // Keep ref in sync for use inside async callbacks
  useEffect(() => { sessionRef.current = session }, [session])

  // Boot: register user, resume or create session
  useEffect(() => {
    boot()
  }, [])

  async function boot() {
    try {
      const deviceId = getOrCreateDeviceId()
      const u = await api.registerUser(deviceId)
      setUser(u)

      // Try resuming last session
      const savedId = localStorage.getItem(SESSION_KEY)
      if (savedId) {
        try {
          const s = await api.getSession(savedId)
          if (s.phase !== 'COMPLETE') {
            setSession(s)
            setMessages(s.messages ?? [])
            setPhase(s.phase)
            if (s.project?.status === 'IN_PROGRESS') {
              setActiveProject(s.project)
            }
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

  async function finishOnboarding(name: string, experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERIENCED') {
    if (!user) return
    try {
      const updated = await api.registerUser(user.deviceId, name || undefined, experienceLevel)
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

  const sendMessage = useCallback(async (text: string, silent = false) => {
    let s = sessionRef.current
    if (!s) {
      s = await startSession()
      if (!s) return
    }

    if (!silent) {
      const optimistic: Message = {
        id: Date.now().toString(),
        sessionId: s.id,
        role: 'USER',
        content: text,
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, optimistic])
    }

    setIsTyping(true)
    try {
      const res = await api.sendMessage(s.id, text)
      setMessages(prev => [...prev.filter(m => m.id !== 'typing'), res.message])
      setPhase(res.phase)
      if (res.suggestions?.length) setSuggestions(res.suggestions)
      if (res.project) setActiveProject(res.project)
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sessionId: s!.id,
        role: 'ASSISTANT',
        content: "I'm having trouble connecting. Try again in a moment.",
        createdAt: new Date().toISOString(),
      }])
    } finally {
      setIsTyping(false)
    }
  }, [user])

  async function kickoff() {
    const s = await startSession()
    if (!s || !user) return
    setIsTyping(true)
    try {
      const res = await api.sendMessage(s.id, 'Hello')
      setMessages([res.message])
      setPhase(res.phase)
    } catch (err) {
      console.error('Kickoff error:', err)
    } finally {
      setIsTyping(false)
    }
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
      await sendMessage(`Let's do: ${suggestion.title}`)
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
    isTyping,
    finishOnboarding, kickoff, sendMessage, pickSuggestion,
    markStepDone, completeProject, abandonProject, newSession, loadProjects,
  }
}
