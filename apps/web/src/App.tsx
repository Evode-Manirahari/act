import { useEffect, useRef, useState } from 'react'
import { useAct } from './hooks/useAct'
import type { ProjectSuggestion, Project, JobDomain } from '@actober/shared-types'

const SESSION_KEY = 'act_session_id'

// ─── Root: Landing → App ────────────────────────────────────────────────────

export default function App() {
  const hasSession = Boolean(localStorage.getItem(SESSION_KEY) || localStorage.getItem('actober_session_id'))
  const [showApp, setShowApp] = useState(hasSession || window.location.hash === '#app')

  useEffect(() => {
    const handler = () => setShowApp(window.location.hash === '#app')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  if (!showApp) {
    return <LandingPage onTry={() => {
      window.location.hash = '#app'
      setShowApp(true)
    }} />
  }
  return <ActApp />
}

// ─── Landing Page ────────────────────────────────────────────────────────────

function LandingPage({ onTry }: { onTry: () => void }) {
  const FEATURES = [
    { icon: '📷', title: 'Show it the job', body: 'Point your camera at the problem. ACT sees what you see and tells you exactly what\'s wrong.' },
    { icon: '⚡', title: 'Instant answers', body: 'No search results. No forum threads. A direct answer, calibrated to your experience level.' },
    { icon: '🔊', title: 'Hands-free guidance', body: 'Works through your earpiece while your hands are on the job. Ask questions, get answers.' },
    { icon: '🔧', title: 'Every trade', body: 'Plumbing, electrical, carpentry, HVAC, painting, tiling — ACT knows the vocabulary and the safety rules.' },
  ]

  const DEMO = [
    { role: 'user', text: '📷 [photo of pipe under sink]' },
    { role: 'act', text: 'I can see the issue — the P-trap elbow has a hairline crack, that\'s where your leak is coming from.\n\nBefore anything: turn off the shutoff valve under the sink. Clockwise until it stops.\n\nYou\'ll need a replacement P-trap (standard 1.5" should fit) and a bucket for the water still in the trap.' },
    { role: 'user', text: 'Water\'s off. Do I need thread tape?' },
    { role: 'act', text: 'For plastic P-trap fittings — no. They use compression washers, not tape. Just hand-tighten the slip joints, then a quarter turn with channel-lock pliers. Don\'t overtighten or the plastic will crack.' },
  ]

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-2xl font-black text-[#F97316] tracking-[6px]">ACT</span>
          <button
            onClick={onTry}
            className="bg-[#F97316] text-white font-bold px-5 py-2.5 rounded-xl hover:bg-orange-500 transition-colors text-sm"
          >
            Try it now →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block bg-[#F97316]/10 text-[#F97316] text-xs font-black tracking-widest px-4 py-2 rounded-full mb-6">
          AI GUIDANCE FOR PHYSICAL WORK
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-[1.1] mb-6">
          Your AI expert<br />
          <span className="text-[#F97316]">on the job.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          As multimodal AI, affordable wearables, and a shrinking skilled labor pool converge —
          a small camera and earpiece become your expert. Seeing what you see. Reasoning about the task.
          Talking you through every step.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onTry}
            className="bg-[#F97316] text-white font-bold px-8 py-4 rounded-xl hover:bg-orange-500 transition-colors text-base"
          >
            Try it in browser →
          </button>
          <a
            href="#"
            className="border-2 border-gray-200 text-gray-700 font-bold px-8 py-4 rounded-xl hover:border-gray-300 transition-colors text-base"
          >
            Download for iOS
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-4">Free to start. No signup required.</p>
      </section>

      {/* Demo conversation */}
      <section className="bg-white border-y border-gray-100 py-16">
        <div className="max-w-2xl mx-auto px-6">
          <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-6 text-center">LIVE EXAMPLE</p>
          <div className="flex flex-col gap-3">
            {DEMO.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#F97316] text-white rounded-br-sm'
                    : 'bg-gray-50 border border-gray-200 text-gray-900 rounded-bl-sm'
                }`}>
                  {msg.role === 'act' && (
                    <p className="text-[10px] font-black text-[#F97316] tracking-widest mb-1.5">ACT</p>
                  )}
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-black text-center text-gray-900 mb-12">Not a chatbot. An expert in your ear.</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-black text-gray-900 text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Thesis */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-3xl font-black leading-snug mb-6">
            "This isn't about replacing tradespeople.<br />
            It's about making anyone significantly<br />
            more capable on the job, faster."
          </p>
          <p className="text-gray-400">The ACT thesis</p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-black text-gray-900 mb-4">Start your first job.</h2>
        <p className="text-gray-500 mb-8">Free to try. No account needed. Works on any device.</p>
        <button
          onClick={onTry}
          className="bg-[#F97316] text-white font-bold px-10 py-4 rounded-xl hover:bg-orange-500 transition-colors text-base"
        >
          Open ACT →
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-sm text-gray-400">
          <span className="font-black text-[#F97316] tracking-widest text-xs">ACT</span>
          <span>© 2026 ACT. AI guidance for physical work.</span>
        </div>
      </footer>
    </div>
  )
}

// ─── App Shell ───────────────────────────────────────────────────────────────

function ActApp() {
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

// ─── Boot ────────────────────────────────────────────────────────────────────

function Boot() {
  return (
    <div className="min-h-screen bg-[#F97316] flex flex-col items-center justify-center gap-3">
      <h1 className="text-5xl font-black text-white tracking-[8px]">ACT</h1>
      <p className="text-white/70 text-sm">AI guidance for physical work.</p>
      <div className="mt-6 w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
    </div>
  )
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

const LEVELS = [
  { value: 'BEGINNER' as const, emoji: '🌱', label: 'New to this', desc: "I rarely do physical work" },
  { value: 'INTERMEDIATE' as const, emoji: '🔧', label: 'Some experience', desc: "I've done a few jobs before" },
  { value: 'EXPERIENCED' as const, emoji: '⚡', label: 'I know my way around', desc: "I work with tools regularly" },
]

const DOMAINS: { value: JobDomain; emoji: string; label: string }[] = [
  { value: 'PLUMBING', emoji: '🔧', label: 'Plumbing' },
  { value: 'ELECTRICAL', emoji: '⚡', label: 'Electrical' },
  { value: 'CARPENTRY', emoji: '🪵', label: 'Carpentry' },
  { value: 'HVAC', emoji: '❄️', label: 'HVAC' },
  { value: 'PAINTING', emoji: '🖌️', label: 'Painting' },
  { value: 'TILING', emoji: '🧱', label: 'Tiling' },
  { value: 'GENERAL', emoji: '🔩', label: 'General / Mixed' },
]

function Onboarding({ onDone }: { onDone: (name: string, level: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERIENCED', domain?: JobDomain) => void }) {
  const [step, setStep] = useState<'name' | 'level' | 'domain'>('name')
  const [name, setName] = useState('')
  const [level, setLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'EXPERIENCED'>('BEGINNER')
  const [domain, setDomain] = useState<JobDomain>('GENERAL')

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <p className="text-sm font-black text-[#F97316] tracking-[4px] mb-8">ACT</p>

        {step === 'name' && (
          <>
            <h2 className="text-2xl font-black mb-2">What should ACT call you?</h2>
            <p className="text-gray-500 mb-6">Optional — skip if you want.</p>
            <input
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg bg-white mb-4 outline-none focus:border-[#F97316]"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setStep('level')}
              maxLength={40}
            />
            <button
              className="w-full bg-[#F97316] text-white font-bold py-4 rounded-xl"
              onClick={() => setStep('level')}
            >
              {name.trim() ? `Nice to meet you, ${name.trim()}` : 'Skip'}
            </button>
          </>
        )}

        {step === 'level' && (
          <>
            <h2 className="text-2xl font-black mb-2">
              {name.trim() ? `${name.trim()}, how experienced are you?` : 'How experienced are you?'}
            </h2>
            <p className="text-gray-500 mb-6">ACT calibrates guidance to your level.</p>
            <div className="flex flex-col gap-3 mb-6">
              {LEVELS.map(l => (
                <button
                  key={l.value}
                  onClick={() => setLevel(l.value)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors ${
                    level === l.value ? 'border-[#F97316] bg-orange-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-2xl">{l.emoji}</span>
                  <div className="flex-1">
                    <p className={`font-bold ${level === l.value ? 'text-[#F97316]' : 'text-gray-900'}`}>{l.label}</p>
                    <p className="text-sm text-gray-500">{l.desc}</p>
                  </div>
                  {level === l.value && <span className="text-[#F97316] font-bold">✓</span>}
                </button>
              ))}
            </div>
            <button className="w-full bg-[#F97316] text-white font-bold py-4 rounded-xl" onClick={() => setStep('domain')}>
              Next →
            </button>
          </>
        )}

        {step === 'domain' && (
          <>
            <h2 className="text-2xl font-black mb-2">What do you work on most?</h2>
            <p className="text-gray-500 mb-6">ACT will use the right vocabulary and safety guidance.</p>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {DOMAINS.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDomain(d.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors ${
                    domain === d.value ? 'border-[#F97316] bg-orange-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-2xl">{d.emoji}</span>
                  <span className={`text-xs font-bold text-center leading-tight ${domain === d.value ? 'text-[#F97316]' : 'text-gray-600'}`}>
                    {d.label}
                  </span>
                </button>
              ))}
            </div>
            <button
              className="w-full bg-[#F97316] text-white font-bold py-4 rounded-xl"
              onClick={() => onDone(name.trim(), level, domain)}
            >
              Let's get to work →
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Chat View ───────────────────────────────────────────────────────────────

const CHIPS = [
  'Leaking pipe under the sink',
  'Outlet not working',
  'Door won\'t close properly',
  'Squeaky floor fix',
  'Patch drywall',
  'Replace a light fixture',
  'Unblock a drain',
  'Running new cable',
]

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
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <span className="font-black text-xl text-[#F97316] tracking-[4px]">ACT</span>
          {user?.name && <p className="text-xs text-gray-400 leading-none mt-0.5">Hey {user.name}</p>}
        </div>
        <div className="flex items-center gap-2">
          <a
            href="#"
            onClick={e => { e.preventDefault(); window.location.hash = ''; window.location.reload() }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Home
          </a>
          <button onClick={onNew} className="text-xs font-bold text-gray-400 border border-gray-200 rounded-full px-3 py-1.5 hover:border-gray-300 transition-colors">
            New
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {activeProject?.status === 'IN_PROGRESS' && (
          <button
            onClick={onResumeProject}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-[#F97316]/40 transition-colors"
          >
            <span className="text-xl">🔧</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">In progress</p>
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
                ? 'bg-[#F97316] text-white rounded-br-sm'
                : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
            }`}>
              {msg.role === 'ASSISTANT' && (
                <p className="text-[10px] font-black text-[#F97316] tracking-widest mb-1.5">ACT</p>
              )}
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              {msg.role === 'ASSISTANT' && msg.content === '' && isTyping && (
                <div className="flex gap-1 items-center h-5">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              )}
            </div>
          </div>
        ))}

        {suggestions && suggestions.length > 0 && (
          <div className="flex flex-col gap-3 mt-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Pick a job</p>
            {suggestions.map((s, i) => (
              <SuggestionCard key={i} suggestion={s} onPick={() => onPickSuggestion(s)} />
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {phase === 'DISCOVERY' && visible.length <= 2 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2 border-t border-gray-100">
          {CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => setInput(chip)}
              className="shrink-0 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#F97316]/40 hover:text-[#F97316] transition-colors whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white border-t border-gray-200 px-3 py-3 flex gap-2 items-end">
        <textarea
          className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2.5 text-[15px] outline-none focus:border-[#F97316]/60 bg-gray-50 max-h-28 min-h-[44px]"
          placeholder="Describe the job or ask a question..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="w-11 h-11 rounded-full bg-[#F97316] text-white text-xl font-bold flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
        >
          →
        </button>
      </div>
    </div>
  )
}

// ─── Suggestion Card ──────────────────────────────────────────────────────────

function SuggestionCard({ suggestion, onPick }: { suggestion: ProjectSuggestion; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className="flex bg-white border border-gray-200 rounded-xl overflow-hidden text-left hover:border-gray-300 hover:shadow-sm transition-all w-full"
    >
      <div className="w-1 shrink-0 bg-[#F97316]" />
      <div className="flex-1 p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🔧</span>
          <span className="font-bold text-gray-900">{suggestion.title}</span>
        </div>
        <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
        <p className="text-xs text-gray-400 italic mb-3">{suggestion.whyItFits}</p>
        <div className="flex gap-2 flex-wrap">
          {[`${suggestion.timeRequired} min`, suggestion.difficulty].map(tag => (
            <span key={tag} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-[#F97316]">
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
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="text-[#F97316] text-sm font-bold">← Back</button>
        <div className="w-2.5 h-2.5 rounded-full bg-[#F97316] shrink-0" />
        <p className="font-bold text-gray-900 truncate flex-1">{project.title}</p>
        {project.status === 'IN_PROGRESS' && (
          <button onClick={() => setShowAbandon(true)} className="text-xs text-gray-400 font-semibold">Quit</button>
        )}
      </header>

      {showAbandon && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 flex items-center gap-3">
          <p className="flex-1 text-sm text-gray-700">Give up on this one?</p>
          <button onClick={onAbandon} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-full">Yes, quit</button>
          <button onClick={() => setShowAbandon(false)} className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">Keep going</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{completed} of {project.steps.length} steps</span>
            <span className="font-bold text-gray-900">{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#F97316] transition-all duration-500" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {project.steps.map((step, i) => (
            <div key={step.id} className={`flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0 ${step.completed ? 'opacity-50' : ''}`}>
              <button
                onClick={() => !step.completed && onStepDone(i)}
                disabled={step.completed}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                  step.completed ? 'border-green-500 bg-green-500' : i === project.currentStepIndex ? 'border-[#F97316]' : 'border-gray-200'
                }`}
              >
                {step.completed && <span className="text-white text-[10px] font-black">✓</span>}
                {!step.completed && i === project.currentStepIndex && (
                  <span className="w-2 h-2 rounded-full bg-[#F97316]" />
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

        {allDone && project.status === 'IN_PROGRESS' && (
          <button onClick={onComplete} className="w-full bg-green-500 text-white font-bold py-4 rounded-xl hover:bg-green-600 transition-colors">
            Mark Complete ✓
          </button>
        )}

        {coachingMessages.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ACT</p>
            {coachingMessages.map(msg => (
              <div key={msg.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
          </div>
        )}

        {isTyping && (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-[10px] font-black text-[#F97316] tracking-widest mb-1.5">ACT</p>
            <div className="flex gap-1 items-center h-5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="bg-white border-t border-gray-200 px-3 py-3 flex gap-2 items-end">
        <textarea
          className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2.5 text-[15px] outline-none focus:border-[#F97316]/60 bg-gray-50 max-h-28 min-h-[44px]"
          placeholder="Ask ACT anything about this job..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="w-11 h-11 rounded-full bg-[#F97316] text-white text-xl font-bold flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
        >
          →
        </button>
      </div>

      {showComplete && project.status === 'COMPLETED' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-3xl mx-auto mb-4">🔧</div>
            <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-2">Done.</p>
            <h2 className="text-xl font-black text-gray-900 mb-2">{project.title}</h2>
            <p className="text-gray-500 mb-6">Job complete. Good work.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowComplete(false)} className="flex-1 border border-gray-200 rounded-xl py-3 font-bold text-gray-700 hover:border-gray-300 transition-colors">
                Close
              </button>
              <button onClick={onNew} className="flex-1 bg-[#F97316] text-white rounded-xl py-3 font-bold hover:bg-orange-500 transition-colors">
                Next job →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
