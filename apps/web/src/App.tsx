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
  const TRADES = [
    { emoji: '🔧', label: 'Plumbing',    desc: 'Pipes, fixtures, drains' },
    { emoji: '⚡', label: 'Electrical',  desc: 'Wiring, outlets, panels' },
    { emoji: '🪵', label: 'Carpentry',   desc: 'Framing, trim, cabinets' },
    { emoji: '❄️', label: 'HVAC',        desc: 'Heating, cooling, vents' },
    { emoji: '🖌️', label: 'Painting',    desc: 'Prep, prime, finish' },
    { emoji: '🧱', label: 'Tiling',      desc: 'Floor, wall, grout' },
    { emoji: '🔩', label: 'General',     desc: 'Maintenance & repairs' },
  ]

  const HOW = [
    { n: '01', title: 'Describe or show the job', body: "Tell ACT what you're working on. Show it a photo. It sees what you see and identifies what needs to be done." },
    { n: '02', title: 'Get a calibrated plan',     body: 'ACT proposes step-by-step jobs with materials, time estimates, and safety guidance for your trade and experience level.' },
    { n: '03', title: 'Work through it together',  body: 'ACT coaches you step by step. Ask questions mid-job. Send photos when stuck. It talks you through to completion.' },
  ]

  const DEMO = [
    { role: 'user', text: '📷 [photo of pipe under sink]' },
    { role: 'act',  text: "I can see the issue — the P-trap elbow has a hairline crack, that's where your leak is coming from.\n\nBefore anything: turn off the shutoff valve under the sink. Clockwise until it stops.\n\nYou'll need a replacement P-trap (standard 1.5\" should fit) and a bucket for the water still in the trap." },
    { role: 'user', text: "Do I need thread tape for the fittings?" },
    { role: 'act',  text: "For plastic P-trap fittings — no. They use compression washers, not tape. Hand-tighten the slip joints, then a quarter turn with channel-locks. Don't overtighten." },
  ]

  return (
    <div className="bg-[#050505] text-white min-h-screen">

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#141414] backdrop-blur-md bg-[#050505]/90">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-black text-xl tracking-[6px] text-[#F97316]">ACT</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#555]">
            <a href="#how"    className="hover:text-white transition-colors duration-200">How it works</a>
            <a href="#trades" className="hover:text-white transition-colors duration-200">Trades</a>
            <a href="https://actober.com" className="hover:text-white transition-colors duration-200">actober.com</a>
          </div>
          <button
            onClick={onTry}
            className="bg-[#F97316] text-white font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-[#ea6c10] transition-colors"
          >
            Try ACT →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-16 text-center relative overflow-hidden">
        {/* Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#F97316]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2.5 border border-[#1a1a1a] rounded-full px-4 py-2 text-xs font-mono text-[#555] mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse shrink-0" />
            AI AGENT FOR PHYSICAL WORK — actober.com
          </div>

          <h1 className="text-6xl md:text-8xl font-black leading-[0.92] tracking-tight mb-8">
            The expert<br />
            <span className="text-[#F97316]">in your ear.</span>
          </h1>

          <p className="text-lg md:text-xl text-[#666] max-w-2xl mx-auto mb-12 leading-relaxed font-light">
            ACT is an AI agent that sees what you see, reasons about the job,
            and guides you through it — step by step, trade by trade.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onTry}
              className="bg-[#F97316] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#ea6c10] transition-all text-base"
            >
              Try it free →
            </button>
            <a
              href="#how"
              className="border border-[#1a1a1a] text-[#666] font-bold px-8 py-4 rounded-xl hover:border-[#2a2a2a] hover:text-white transition-all text-base"
            >
              How it works
            </a>
          </div>

          <p className="text-xs text-[#333] mt-6 font-mono tracking-wide">No account. No download. Works now.</p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-[#141414]">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-3 divide-x divide-[#141414]">
          {[
            { n: '7',  label: 'trade domains' },
            { n: '3',  label: 'skill levels' },
            { n: '∞',  label: 'jobs guided' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1.5 px-4">
              <span className="text-4xl md:text-5xl font-black text-[#F97316]">{s.n}</span>
              <span className="text-[10px] text-[#333] font-mono uppercase tracking-widest">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Demo ── */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <p className="text-[10px] font-mono text-[#333] tracking-widest uppercase mb-8 text-center">LIVE EXAMPLE — PLUMBING SESSION</p>
        <div className="border border-[#141414] rounded-2xl overflow-hidden bg-[#0A0A0A]">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#141414]">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#1a1a1a]" />
              <span className="w-3 h-3 rounded-full bg-[#1a1a1a]" />
              <span className="w-3 h-3 rounded-full bg-[#1a1a1a]" />
            </div>
            <span className="text-xs font-mono text-[#333] ml-2">act — plumbing session</span>
          </div>
          <div className="p-6 flex flex-col gap-4">
            {DEMO.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#F97316] text-white'
                    : 'bg-[#111] border border-[#1a1a1a] text-[#bbb]'
                }`}>
                  {msg.role === 'act' && (
                    <p className="text-[10px] font-mono text-[#F97316] tracking-widest mb-2">ACT</p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="border-t border-[#141414] py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-[10px] font-mono text-[#333] tracking-widest uppercase mb-4 text-center">HOW IT WORKS</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-16 leading-tight">
            Not a chatbot.<br /><span className="text-[#F97316]">An agent.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {HOW.map(h => (
              <div key={h.n} className="border border-[#141414] rounded-2xl p-7 bg-[#0A0A0A] hover:border-[#F97316]/20 transition-colors duration-300">
                <span className="text-5xl font-black text-[#1a1a1a] font-mono block mb-6">{h.n}</span>
                <h3 className="font-bold text-white text-lg mb-3">{h.title}</h3>
                <p className="text-[#555] leading-relaxed text-sm">{h.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trades ── */}
      <section id="trades" className="border-t border-[#141414] py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-[10px] font-mono text-[#333] tracking-widest uppercase mb-4 text-center">SUPPORTED TRADES</p>
          <h2 className="text-4xl font-black text-center mb-16 leading-tight">
            Every trade.<br /><span className="text-[#F97316]">Right vocabulary.</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TRADES.map(t => (
              <div key={t.label} className="border border-[#141414] rounded-xl p-5 bg-[#0A0A0A] hover:border-[#F97316]/25 transition-colors duration-300 group cursor-default">
                <span className="text-3xl block mb-3">{t.emoji}</span>
                <h3 className="font-bold text-white mb-1 group-hover:text-[#F97316] transition-colors">{t.label}</h3>
                <p className="text-xs text-[#444]">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Thesis ── */}
      <section className="border-t border-[#141414] py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-3xl md:text-4xl font-black leading-snug mb-8">
            "This isn't about replacing tradespeople. It's about making anyone{' '}
            <span className="text-[#F97316]">significantly more capable</span>{' '}
            on the job, faster."
          </p>
          <p className="text-[10px] font-mono text-[#333] tracking-widest uppercase">The ACT thesis — actober.com</p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-[#141414] py-28 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black mb-5 leading-tight">
            Start your<br /><span className="text-[#F97316]">first job.</span>
          </h2>
          <p className="text-[#555] mb-10 text-lg">Free. No account. Works on any device.</p>
          <button
            onClick={onTry}
            className="bg-[#F97316] text-white font-black px-12 py-5 rounded-xl hover:bg-[#ea6c10] transition-all text-lg"
          >
            Open ACT →
          </button>
          <div className="flex items-center justify-center gap-6 mt-8">
            <span className="text-xs font-mono text-[#2a2a2a]">iOS App — Coming soon</span>
            <span className="text-[#1a1a1a]">·</span>
            <span className="text-xs font-mono text-[#2a2a2a]">Android — Coming soon</span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#141414] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-black text-[#F97316] tracking-[6px] text-sm">ACT</span>
          <span className="text-xs font-mono text-[#2a2a2a]">© 2026 Actober. AI guidance for physical work.</span>
          <a href="https://actober.com" className="text-xs font-mono text-[#333] hover:text-white transition-colors">actober.com</a>
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
      key={act.sessionKey}
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
