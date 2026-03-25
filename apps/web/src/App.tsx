import { useEffect, useRef, useState } from 'react'
import { useAct } from './hooks/useAct'
import type { ProjectSuggestion, Project } from '@actober/shared-types'

const CATEGORY_COLOR: Record<string, string> = {
  MAKE: '#3B82F6', IMPROVE: '#8B5CF6', GROW: '#10B981', CREATE: '#F97316',
}
const CATEGORY_EMOJI: Record<string, string> = {
  MAKE: '🔧', IMPROVE: '✨', GROW: '🌱', CREATE: '🎨',
}
const CHIPS = [
  '30 minutes free', 'I have cardboard', "I'm outdoors",
  'No tools, no materials', '1 hour + some tools', 'I have scrap wood',
  'Rainy afternoon indoors', 'I want to improve a room',
]

export default function App() {
  const act = useAct()

  if (act.screen === 'boot') return <Boot />
  if (act.screen === 'onboarding') return <Onboarding onDone={act.finishOnboarding} />
  if (act.screen === 'project' && act.activeProject) {
    return (
      <ProjectView
        project={act.activeProject}
        messages={act.messages}
        isTyping={act.isTyping}
        onSend={act.sendMessage}
        onStepDone={act.markStepDone}
        onComplete={act.completeProject}
        onAbandon={act.abandonProject}
        onBack={() => act.setScreen('chat')}
        onNew={act.newSession}
      />
    )
  }
  return (
    <ChatView
      user={act.user}
      messages={act.messages}
      phase={act.phase}
      suggestions={act.suggestions}
      activeProject={act.activeProject}
      isTyping={act.isTyping}
      onKickoff={act.kickoff}
      onSend={act.sendMessage}
      onPickSuggestion={act.pickSuggestion}
      onResumeProject={() => act.setScreen('project')}
      onNew={act.newSession}
    />
  )
}

// ─── Boot ───────────────────────────────────────────────────────────────────

function Boot() {
  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center gap-3">
      <h1 className="text-4xl font-black text-white tracking-[6px]">ACTOBER</h1>
      <p className="text-white/70 text-sm italic">because free time should build something.</p>
      <div className="mt-6 w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
    </div>
  )
}

// ─── Onboarding ─────────────────────────────────────────────────────────────

const LEVELS = [
  { value: 'BEGINNER' as const, emoji: '🌱', label: 'New to this', desc: "I rarely build or make things" },
  { value: 'INTERMEDIATE' as const, emoji: '🔧', label: 'Some experience', desc: "I've done a few projects before" },
  { value: 'EXPERIENCED' as const, emoji: '⚡', label: 'Pretty handy', desc: "I build or make things regularly" },
]

function Onboarding({ onDone }: { onDone: (name: string, level: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERIENCED') => void }) {
  const [step, setStep] = useState<'name' | 'level'>('name')
  const [name, setName] = useState('')
  const [level, setLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'EXPERIENCED'>('BEGINNER')

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <p className="text-xs font-black text-primary tracking-[3px] mb-8">ACTOBER</p>

        {step === 'name' ? (
          <>
            <h2 className="text-2xl font-black mb-2">What should ACT call you?</h2>
            <p className="text-gray-500 mb-6">Optional — skip if you want.</p>
            <input
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg bg-white mb-4 outline-none focus:border-primary"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setStep('level')}
              maxLength={40}
            />
            <button
              className="w-full bg-primary text-white font-bold py-4 rounded-xl"
              onClick={() => setStep('level')}
            >
              {name.trim() ? `Nice to meet you, ${name.trim()}` : 'Skip'}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-black mb-2">
              {name.trim() ? `${name.trim()}, how much do you make things?` : 'How much do you make things?'}
            </h2>
            <p className="text-gray-500 mb-6">ACT will suggest the right kind of project.</p>
            <div className="flex flex-col gap-3 mb-6">
              {LEVELS.map(l => (
                <button
                  key={l.value}
                  onClick={() => setLevel(l.value)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors ${
                    level === l.value ? 'border-primary bg-orange-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-2xl">{l.emoji}</span>
                  <div className="flex-1">
                    <p className={`font-bold ${level === l.value ? 'text-primary' : 'text-gray-900'}`}>{l.label}</p>
                    <p className="text-sm text-gray-500">{l.desc}</p>
                  </div>
                  {level === l.value && <span className="text-primary font-bold">✓</span>}
                </button>
              ))}
            </div>
            <button
              className="w-full bg-primary text-white font-bold py-4 rounded-xl"
              onClick={() => onDone(name.trim(), level)}
            >
              Let's build something →
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Chat View ───────────────────────────────────────────────────────────────

function ChatView({
  user, messages, phase, suggestions, activeProject, isTyping,
  onKickoff, onSend, onPickSuggestion, onResumeProject, onNew,
}: {
  user: ReturnType<typeof useAct>['user']
  messages: ReturnType<typeof useAct>['messages']
  phase: ReturnType<typeof useAct>['phase']
  suggestions: ReturnType<typeof useAct>['suggestions']
  activeProject: ReturnType<typeof useAct>['activeProject']
  isTyping: boolean
  onKickoff: () => void
  onSend: (text: string) => void
  onPickSuggestion: (s: ProjectSuggestion) => void
  onResumeProject: () => void
  onNew: () => void
}) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!started.current && messages.length === 0) {
      started.current = true
      onKickoff()
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function handleSend() {
    const t = input.trim()
    if (!t || isTyping) return
    setInput('')
    onSend(t)
  }

  const visible = messages.filter(m => !(m.role === 'USER' && m.content === 'Hello'))

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <span className="font-black text-lg tracking-wide">ACTOBER</span>
          <span className="text-primary font-black text-lg"> AI</span>
          {user?.name && <p className="text-xs text-gray-400 leading-none mt-0.5">Hey {user.name}</p>}
        </div>
        <button onClick={onNew} className="text-xs font-bold text-gray-400 border border-gray-200 rounded-full px-3 py-1.5 hover:border-gray-300 transition-colors">
          New
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {/* Resume banner */}
        {activeProject?.status === 'IN_PROGRESS' && visible.length <= 1 && (
          <button
            onClick={onResumeProject}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-primary/40 transition-colors"
          >
            <span style={{ color: CATEGORY_COLOR[activeProject.category] }} className="text-xl">
              {CATEGORY_EMOJI[activeProject.category]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Continue</p>
              <p className="font-bold text-gray-900 truncate">{activeProject.title}</p>
              <p className="text-xs text-gray-400">
                {activeProject.steps.filter(s => s.completed).length}/{activeProject.steps.length} steps
              </p>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        )}

        {visible.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'USER'
                ? 'bg-primary text-white rounded-br-sm'
                : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
            }`}>
              {msg.role === 'ASSISTANT' && (
                <p className="text-[10px] font-black text-primary tracking-widest mb-1.5">ACT</p>
              )}
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
              <p className="text-[10px] font-black text-primary tracking-widest mb-1.5">ACT</p>
              <div className="flex gap-1 items-center h-5">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Suggestion cards */}
        {suggestions && suggestions.length > 0 && (
          <div className="flex flex-col gap-3 mt-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Pick a project</p>
            {suggestions.map((s, i) => (
              <SuggestionCard key={i} suggestion={s} onPick={() => onPickSuggestion(s)} />
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Chips */}
      {phase === 'DISCOVERY' && visible.length <= 2 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide border-t border-gray-100">
          {CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => setInput(chip)}
              className="shrink-0 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-primary/40 hover:text-primary transition-colors whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-3 py-3 flex gap-2 items-end">
        <textarea
          className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2.5 text-[15px] outline-none focus:border-primary/60 bg-gray-50 max-h-28 min-h-[44px]"
          placeholder="Tell ACT what's around you..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="w-11 h-11 rounded-full bg-primary text-white text-xl font-bold flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
        >
          →
        </button>
      </div>
    </div>
  )
}

// ─── Suggestion Card ─────────────────────────────────────────────────────────

function SuggestionCard({ suggestion, onPick }: { suggestion: ProjectSuggestion; onPick: () => void }) {
  const color = CATEGORY_COLOR[suggestion.category] ?? '#F97316'
  return (
    <button
      onClick={onPick}
      className="flex gap-0 bg-white border border-gray-200 rounded-xl overflow-hidden text-left hover:border-gray-300 hover:shadow-sm transition-all w-full"
    >
      <div className="w-1 shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{CATEGORY_EMOJI[suggestion.category]}</span>
          <span className="font-bold text-gray-900">{suggestion.title}</span>
        </div>
        <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
        <p className="text-xs text-gray-400 italic mb-3">{suggestion.whyItFits}</p>
        <div className="flex gap-2 flex-wrap">
          {[`${suggestion.timeRequired} min`, suggestion.difficulty, suggestion.category].map(tag => (
            <span key={tag} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: color + '20', color }}>
              {tag}
            </span>
          ))}
        </div>
        <p className="text-xs font-bold text-gray-400 mt-3">Tap to start →</p>
      </div>
    </button>
  )
}

// ─── Project View ─────────────────────────────────────────────────────────────

function ProjectView({
  project, messages, isTyping,
  onSend, onStepDone, onComplete, onAbandon, onBack, onNew,
}: {
  project: Project
  messages: ReturnType<typeof useAct>['messages']
  isTyping: boolean
  onSend: (text: string) => void
  onStepDone: (i: number) => void
  onComplete: () => void
  onAbandon: () => void
  onBack: () => void
  onNew: () => void
}) {
  const [input, setInput] = useState('')
  const [showAbandon, setShowAbandon] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const color = CATEGORY_COLOR[project.category] ?? '#F97316'
  const completed = project.steps.filter(s => s.completed).length
  const progress = project.steps.length > 0 ? completed / project.steps.length : 0
  const allDone = completed === project.steps.length && project.steps.length > 0
  const coachingMessages = messages.filter(m => m.role === 'ASSISTANT').slice(-6)

  useEffect(() => {
    if (project.status === 'COMPLETED') setShowComplete(true)
  }, [project.status])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function handleSend() {
    const t = input.trim()
    if (!t || isTyping) return
    setInput('')
    onSend(t)
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="text-primary text-sm font-bold">← Back</button>
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <p className="font-bold text-gray-900 truncate flex-1">{project.title}</p>
        {project.status === 'IN_PROGRESS' && (
          <button onClick={() => setShowAbandon(true)} className="text-xs text-gray-400 font-semibold">Quit</button>
        )}
      </header>

      {/* Abandon confirm */}
      {showAbandon && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 flex items-center gap-3">
          <p className="flex-1 text-sm text-gray-700">Give up on this one?</p>
          <button onClick={onAbandon} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-full">Yes, quit</button>
          <button onClick={() => setShowAbandon(false)} className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">Keep going</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{completed} of {project.steps.length} steps</span>
            <span className="font-bold text-gray-900">{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress * 100}%`, backgroundColor: color }} />
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {project.steps.map((step, i) => (
            <div key={step.id} className={`flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0 ${step.completed ? 'opacity-50' : ''}`}>
              <button
                onClick={() => !step.completed && onStepDone(i)}
                disabled={step.completed}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                  step.completed ? 'border-green-500 bg-green-500' : i === project.currentStepIndex ? 'border-gray-400' : 'border-gray-200'
                }`}
                style={!step.completed && i === project.currentStepIndex ? { borderColor: color } : {}}
              >
                {step.completed && <span className="text-white text-[10px] font-black">✓</span>}
                {!step.completed && i === project.currentStepIndex && (
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                )}
              </button>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${step.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {i + 1}. {step.title}
                </p>
                {!step.completed && i === project.currentStepIndex && (
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{step.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Complete button */}
        {allDone && project.status === 'IN_PROGRESS' && (
          <button
            onClick={onComplete}
            className="w-full bg-green-500 text-white font-bold py-4 rounded-xl hover:bg-green-600 transition-colors"
          >
            Mark Complete ✓
          </button>
        )}

        {/* ACT coaching messages */}
        {coachingMessages.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ACT</p>
            {coachingMessages.map(msg => (
              <div key={msg.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                <p className="text-sm text-gray-700 leading-relaxed">{msg.content}</p>
              </div>
            ))}
          </div>
        )}

        {isTyping && (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="flex gap-1 items-center h-5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-3 py-3 flex gap-2 items-end">
        <textarea
          className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2.5 text-[15px] outline-none focus:border-primary/60 bg-gray-50 max-h-28 min-h-[44px]"
          placeholder="Ask ACT anything..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="w-11 h-11 rounded-full text-white text-xl font-bold flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
          style={{ backgroundColor: color }}
        >
          →
        </button>
      </div>

      {/* Completion modal */}
      {showComplete && project.status === 'COMPLETED' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4" style={{ backgroundColor: color + '20' }}>
              {CATEGORY_EMOJI[project.category]}
            </div>
            <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-2">Done.</p>
            <h2 className="text-xl font-black text-gray-900 mb-2">{project.title}</h2>
            <p className="text-gray-500 mb-6">You made something real today.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowComplete(false)}
                className="flex-1 border border-gray-200 rounded-xl py-3 font-bold text-gray-700 hover:border-gray-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={onNew}
                className="flex-2 flex-1 text-white rounded-xl py-3 font-bold transition-colors"
                style={{ backgroundColor: color }}
              >
                Build Another →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
