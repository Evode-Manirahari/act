import { useCallback, useEffect, useRef, useState } from 'react'
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

// ─── Actober AI Logo mark ────────────────────────────────────────────────────
// The OUTLINE is the brand — two dome bumps at top = frog head silhouette.
// Inside: orange ladybug body, white eyes, teal pupils, spine, two spots.
// Built on 8-unit grid. No gradients, no opacity, no mascot softness.
//
// Silhouette construction (all teal, merges into one shape):
//   • Squircle body: rect y=16, rx=16
//   • Left dome: circle cx=20 cy=20 r=18  ← protrudes 14px above badge top
//   • Right dome: circle cx=60 cy=20 r=18 ← same
// Combined: a squircle with two circular bumps at top-left/right corners.
// That IS the frog-head-from-above. Nothing else looks like this.

function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 80 80" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {/* ── Silhouette (all #052424, reads as single shape) ── */}
      {/* Squircle body starts at y=18. Dome bumps at cy=22 protrude ~14px */}
      {/* above badge top — frog-head-from-above at any size. */}
      <rect x="0" y="18" width="80" height="62" rx="16" fill="#052424"/>
      <circle cx="20" cy="22" r="18" fill="#052424"/>
      <circle cx="60" cy="22" r="18" fill="#052424"/>

      {/* ── Ladybug abdomen: flat orange arch, tighter to eyes ── */}
      <path d="M8 50 Q8 78 40 78 Q72 78 72 50 Z" fill="#F97316"/>

      {/* ── Frog eyes: white iris, 5px teal socket ring ── */}
      <circle cx="20" cy="22" r="13" fill="#ffffff"/>
      <circle cx="60" cy="22" r="13" fill="#ffffff"/>

      {/* ── Pupils: r = 1/2 iris ── */}
      <circle cx="20" cy="22" r="6.5" fill="#052424"/>
      <circle cx="60" cy="22" r="6.5" fill="#052424"/>

      {/* ── Eye shines: the single detail that makes it remarkable. */}
      {/* One specular dot per eye — flat white circle, upper-left quadrant */}
      {/* of each pupil. Still geometric. Still flat. Just alive. */}
      <circle cx="16" cy="18" r="2.5" fill="#ffffff"/>
      <circle cx="56" cy="18" r="2.5" fill="#ffffff"/>

      {/* ── Ladybug wing-split ── */}
      <line x1="40" y1="50" x2="40" y2="76" stroke="#052424" strokeWidth="2"/>

      {/* ── Ladybug spots: golden ratio placement within body ── */}
      {/* Body runs y=50→78 (28px). Golden ratio point: 50 + 28×0.382 = 60.7 ≈ 61 */}
      <circle cx="25" cy="63" r="4" fill="#052424"/>
      <circle cx="55" cy="63" r="4" fill="#052424"/>
    </svg>
  )
}

function LogoWordmark({ dark: isDark }: { dark: boolean }) {
  const wordColor = isDark ? 'rgba(255,255,255,0.92)' : '#0d0d0d'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <LogoMark size={30} />
      <span style={{
        fontFamily: 'Inter, -apple-system, sans-serif',
        fontWeight: 700,
        fontSize: 17,
        letterSpacing: '-0.5px',
        lineHeight: 1,
      }}>
        <span style={{ color: '#F97316' }}>Act</span>
        <span style={{ color: wordColor }}>ober</span>
      </span>
    </div>
  )
}

// ─── Scroll reveal hook ───────────────────────────────────────────────────────

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target) } }),
      { threshold: 0.12 }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

// ─── Landing Page ────────────────────────────────────────────────────────────

function LandingPage({ onTry }: { onTry: () => void }) {
  const [open, setOpen] = useState<number | null>(0)
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('act_theme')
    return saved ? saved === 'dark' : true
  })

  const CAPABILITIES = [
    {
      n: '01',
      title: 'Sees what you see',
      body: 'Point your camera at the problem. ACT reads the image in real time: crack in the P-trap, wiring fault, moisture damage. No guessing required.',
      tag: 'Vision AI',
    },
    {
      n: '02',
      title: 'Hands-free voice guidance',
      body: 'Works through your earpiece while your hands are busy. Ask questions out loud, get answers instantly. No screen touching on the job.',
      tag: 'Voice + Audio',
    },
    {
      n: '03',
      title: 'Calibrated to your trade',
      body: 'Plumber gets pipe specs and fitting types. Electrician gets wiring standards and breaker logic. The vocabulary, the safety rules, the tool list, all trade-specific.',
      tag: 'Trade Intelligence',
    },
    {
      n: '04',
      title: 'Safety-first, always',
      body: "ACT never skips the breaker shutoff, the water valve, the PPE check. Every job starts with safety. Not optional. Built in.",
      tag: 'Safety Protocol',
    },
  ]

  const TRADES = [
    { label: 'Plumbing',   sub: 'Pipes, fixtures, drains, water heaters' },
    { label: 'Electrical', sub: 'Wiring, outlets, panels, fixtures' },
    { label: 'Carpentry',  sub: 'Framing, trim, doors, cabinets' },
    { label: 'HVAC',       sub: 'Heating, cooling, ventilation, ducts' },
    { label: 'Painting',   sub: 'Prep, prime, interior & exterior' },
    { label: 'Tiling',     sub: 'Floor, wall, grout, substrate' },
    { label: 'General',    sub: 'Maintenance, repairs, mixed jobs' },
  ]

  const DEMO = [
    { role: 'user', text: '📷 [photo of pipe under sink]' },
    { role: 'act',  text: "Hairline crack on the P-trap elbow. That's your leak.\n\nFirst: shutoff valve under the sink, clockwise until it stops.\n\nYou'll need a replacement P-trap (1.5\" standard) and a bucket. Ready when you are." },
    { role: 'user', text: 'Do I need thread tape?' },
    { role: 'act',  text: "No. Plastic P-traps use compression washers, not tape. Hand-tighten the slip joints, then a quarter turn with channel-locks. Don't overtighten. It'll crack." },
    { role: 'user', text: 'Done. No drips.' },
    { role: 'act',  text: "Good work. Run the water for 30 seconds and check underneath. If it's dry, you're done." },
  ]

  return (
    <div className="ti-root" data-theme={dark ? 'dark' : 'light'}>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="ti-nav">
        <div className="ti-nav-inner">
          <LogoWordmark dark={dark} />
          <div className="ti-nav-links">
            <a href="#capabilities">Capabilities</a>
            <a href="#trades">Trades</a>
            <a href="#demo">Demo</a>
          </div>
          <div className="ti-nav-right">
            <button
              className="ti-theme-toggle"
              onClick={() => setDark(d => { const next = !d; localStorage.setItem('act_theme', next ? 'dark' : 'light'); return next })}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? '☀' : '☾'}
            </button>
            <button onClick={onTry} className="ti-cta-nav">TRY ACT FREE →</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="ti-hero">
        <LogoMark size={64} />
        <p className="ti-eyebrow">AI guidance for field workers · actober.com</p>
        <h1 className="ti-h1">
          <span className="ti-h1-anim">Act on</span>
          <span className="ti-h1-anim">what you see.</span>
        </h1>
        <p className="ti-hero-sub">
          ACT sees what you see, reasons about the job, and guides you through every step. Hands-free, trade-calibrated, safety-first.
        </p>
        <div className="ti-hero-cta">
          <button onClick={onTry} className="ti-btn-primary">Try ACT free</button>
          <a href="#capabilities" className="ti-btn-ghost">See capabilities ↓</a>
        </div>
      </section>

      <hr className="ti-rule" />

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <div className="ti-stats">
        {[
          { n: '7',  label: 'Trade domains' },
          { n: '3',  label: 'Skill levels' },
          { n: '∞',  label: 'Guided steps' },
          { n: '$0', label: 'To get started' },
        ].map((s) => (
          <div key={s.label} className="ti-stat">
            <span className="ti-stat-n">{s.n}</span>
            <span className="ti-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <hr className="ti-rule" />

      {/* ── Capabilities ─────────────────────────────────────────────────────── */}
      <section id="capabilities" className="ti-section">
        <div>
          <p className="ti-eyebrow">What ACT does</p>
          <h2 className="ti-h2">Capabilities.</h2>
        </div>
        <div className="ti-accordion">
          {CAPABILITIES.map((c, i) => (
            <div key={c.n} className={`ti-accordion-row${open === i ? ' open' : ''}`}>
              <button className="ti-accordion-trigger" onClick={() => setOpen(open === i ? null : i)}>
                <span className="ti-acc-num">{c.n}</span>
                <span className="ti-acc-title">{c.title}</span>
                <span className="ti-acc-tag">{c.tag}</span>
                <span className="ti-acc-icon">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <div className="ti-accordion-body">{c.body}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <hr className="ti-rule" />

      {/* ── Quote ────────────────────────────────────────────────────────────── */}
      <section className="ti-quote-section">
        <div className="ti-quote-wrap">
          <blockquote className="ti-quote">
            This isn't about replacing tradespeople. It's about making anyone{' '}
            <em>significantly more capable</em> on the job, faster.
          </blockquote>
          <p className="ti-quote-attr">The ACT thesis · actober.com</p>
        </div>
      </section>

      <hr className="ti-rule" />

      {/* ── Demo ─────────────────────────────────────────────────────────────── */}
      <section id="demo" className="ti-section">
        <div>
          <p className="ti-eyebrow">Live session</p>
          <h2 className="ti-h2">ACT in action.</h2>
        </div>
        <div className="ti-demo-window">
          <div className="ti-demo-header">
            <div className="ti-demo-dots">
              <span /><span /><span />
            </div>
            <span className="ti-demo-title">act / plumbing session · live</span>
          </div>
          <div className="ti-demo-body">
            {DEMO.map((msg, i) => (
              <div key={i} className={`ti-msg ti-msg-${msg.role}`}>
                {msg.role === 'act' && <p className="ti-msg-label">ACT</p>}
                <p className="ti-msg-text">{msg.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="ti-rule" />

      {/* ── Trades ───────────────────────────────────────────────────────────── */}
      <section id="trades" className="ti-section">
        <div>
          <p className="ti-eyebrow">Supported trades</p>
          <h2 className="ti-h2">Every trade.<br />Right vocabulary.</h2>
        </div>
        <div className="ti-trades-grid">
          {TRADES.map((t) => (
            <div key={t.label} className="ti-trade-item">
              <span className="ti-trade-label">{t.label}</span>
              <span className="ti-trade-sub">{t.sub}</span>
            </div>
          ))}
        </div>
      </section>

      <hr className="ti-rule" />

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="ti-cta-section">
        <p className="ti-eyebrow">Ready to start?</p>
        <h2 className="ti-cta-h">Start your<br />first job.</h2>
        <p className="ti-cta-sub">Free. No account. Works on any device right now.</p>
        <button onClick={onTry} className="ti-btn-primary ti-btn-lg">Open ACT →</button>
        <p className="ti-platform-note">iOS & Android coming soon</p>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="ti-footer">
        <div className="ti-footer-inner">
          <LogoWordmark dark={dark} />
          <span className="ti-footer-copy">© 2026 Actober. All rights reserved.</span>
          <a href="https://actober.com" className="ti-footer-link">actober.com</a>
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
  if (act.screen === 'home') {
    return (
      <HomeScreen
        user={act.user}
        projects={act.projects}
        activeProject={act.activeProject}
        onNew={() => act.newSession()}
        onResume={() => act.setScreen('project')}
      />
    )
  }
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
        onBack={() => act.setScreen('home')}
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
      limitReached={act.limitReached}
      onKickoff={act.kickoff}
      onSend={act.sendMessage}
      onPickSuggestion={act.pickSuggestion}
      onResumeProject={() => act.setScreen('project')}
      onNew={() => act.setScreen('home')}
      onClearLimit={act.clearLimitReached}
    />
  )
}

// ─── Boot ────────────────────────────────────────────────────────────────────

function Boot() {
  return (
    <div className="min-h-screen bg-[#052424] flex flex-col items-center justify-center gap-4">
      <LogoMark size={56} />
      <div className="mt-4 w-5 h-5 border-2 border-white/20 border-t-[#F97316] rounded-full animate-spin" />
    </div>
  )
}

// ─── Home Screen ─────────────────────────────────────────────────────────────

function HomeScreen({
  user, projects, activeProject, onNew, onResume,
}: {
  user: ReturnType<typeof useAct>['user']
  projects: ReturnType<typeof useAct>['projects']
  activeProject: ReturnType<typeof useAct>['activeProject']
  onNew: () => void
  onResume: () => void
}) {
  const past = projects.filter(p => p.status === 'COMPLETED' || p.status === 'ABANDONED')

  function relativeDate(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <header className="bg-[#052424] px-5 py-4 flex items-center justify-between">
        <LogoWordmark dark />
        <button
          onClick={onNew}
          className="text-sm font-bold text-white bg-[#F97316] px-4 py-2 rounded-full hover:bg-orange-500 transition-colors"
        >
          New job
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-6">
        {/* Greeting */}
        <div>
          <p className="text-xl font-bold text-gray-900">
            {user?.name ? `Hey ${user.name}.` : 'Hey there.'}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">What are we fixing today?</p>
        </div>

        {/* Active project resume card */}
        {activeProject && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">In progress</p>
            <button
              onClick={onResume}
              className="w-full bg-white border-2 border-[#F97316]/30 rounded-2xl p-4 text-left hover:border-[#F97316] transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#F97316] mt-1.5 shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{activeProject.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {activeProject.steps.filter(s => s.completed).length} of {activeProject.steps.length} steps done
                  </p>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F97316] rounded-full transition-all"
                      style={{ width: `${activeProject.steps.length > 0 ? (activeProject.steps.filter(s => s.completed).length / activeProject.steps.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-[#F97316] font-bold text-lg group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </button>
          </div>
        )}

        {/* Start new job CTA when no active project */}
        {!activeProject && (
          <button
            onClick={onNew}
            className="w-full bg-[#052424] rounded-2xl px-5 py-6 text-left hover:bg-[#073232] transition-colors group"
          >
            <p className="text-[#F97316] font-bold text-sm mb-1">Start a job</p>
            <p className="text-white text-lg font-bold leading-snug">
              Describe the problem.<br />ACT will guide you through it.
            </p>
            <p className="text-white/40 text-sm mt-3 group-hover:text-white/60 transition-colors">Get started →</p>
          </button>
        )}

        {/* Past jobs */}
        {past.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Past jobs</p>
            <div className="flex flex-col gap-2">
              {past.map(p => (
                <div key={p.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${p.status === 'COMPLETED' ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.status === 'COMPLETED'
                        ? `${p.steps.length} steps · ${relativeDate(p.createdAt)}`
                        : `Abandoned · ${relativeDate(p.createdAt)}`}
                    </p>
                  </div>
                  {p.status === 'COMPLETED' && (
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">Done</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {past.length === 0 && !activeProject && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <LogoMark size={48} />
            <p className="mt-4 text-sm text-gray-400">No jobs yet. Start your first one above.</p>
          </div>
        )}
      </div>
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
            <p className="text-gray-500 mb-6">Optional, skip if you want.</p>
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
  user, messages, phase, suggestions, activeProject, isTyping, limitReached,
  onKickoff, onSend, onPickSuggestion, onResumeProject, onNew, onClearLimit,
}: {
  user: ReturnType<typeof useAct>['user']
  messages: ReturnType<typeof useAct>['messages']
  phase: ReturnType<typeof useAct>['phase']
  suggestions: ReturnType<typeof useAct>['suggestions']
  activeProject: ReturnType<typeof useAct>['activeProject']
  isTyping: boolean
  limitReached: boolean
  onKickoff: () => void
  onSend: (text: string, silent?: boolean, imageBase64?: string, imageMimeType?: string) => void
  onPickSuggestion: (s: ProjectSuggestion) => void
  onResumeProject: () => void
  onNew: () => void
  onClearLimit: () => void
}) {
  const [input, setInput] = useState('')
  const [image, setImage] = useState<{ base64: string; mime: string; preview: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
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
    if ((!t && !image) || isTyping) return
    setInput('')
    if (image) {
      onSend(t || 'Here is a photo of the problem.', false, image.base64, image.mime)
      setImage(null)
    } else {
      onSend(t)
    }
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      setImage({ base64, mime: file.type, preview: dataUrl })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
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

      {limitReached && (
        <div className="mx-3 mb-2 bg-orange-50 border border-[#F97316]/30 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-lg shrink-0">⚡</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Monthly limit reached</p>
            <p className="text-xs text-gray-500 mt-0.5">You've used your free jobs this month. More coming soon.</p>
          </div>
          <button onClick={onClearLimit} className="text-gray-400 text-lg leading-none shrink-0">×</button>
        </div>
      )}

      <div className="bg-white border-t border-gray-200 px-3 pt-2 pb-3">
        {image && (
          <div className="relative mb-2 inline-block">
            <img src={image.preview} alt="Attached" className="h-20 rounded-xl object-cover border border-gray-200" />
            <button
              onClick={() => setImage(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white text-xs flex items-center justify-center leading-none"
            >×</button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImagePick} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isTyping}
            className="w-11 h-11 rounded-full border border-gray-200 text-gray-400 flex items-center justify-center hover:border-[#F97316]/40 hover:text-[#F97316] transition-colors disabled:opacity-40 shrink-0"
            aria-label="Attach photo"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
          <VoiceButton disabled={isTyping} onTranscribed={text => { setInput(text); }} />
          <textarea
            className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2.5 text-[15px] outline-none focus:border-[#F97316]/60 bg-gray-50 max-h-28 min-h-[44px]"
            placeholder={image ? 'Add a note or just send the photo...' : 'Describe the job or ask a question...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !image) || isTyping}
            className="w-11 h-11 rounded-full bg-[#F97316] text-white text-xl font-bold flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Voice Button ─────────────────────────────────────────────────────────────
// Press-and-hold mic. Records audio, sends to Whisper, fills the input.
// Works on mobile (touch) and desktop (mouse) via pointer events.

type VoiceState = 'idle' | 'recording' | 'transcribing' | 'error'

function VoiceButton({ onTranscribed, disabled }: {
  onTranscribed: (text: string) => void
  disabled: boolean
}) {
  const [state, setState] = useState<VoiceState>('idle')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  function getBestMimeType() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    return types.find(t => MediaRecorder.isTypeSupported(t)) ?? ''
  }

  async function startRecording() {
    if (disabled || state !== 'idle') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getBestMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        setState('transcribing')
        try {
          const { transcribeAudio } = await import('./api/act')
          const text = await transcribeAudio(blob)
          if (text.trim()) onTranscribed(text.trim())
          setState('idle')
        } catch {
          setState('error')
          setTimeout(() => setState('idle'), 2000)
        }
      }
      recorder.start()
      recorderRef.current = recorder
      setState('recording')
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 2000)
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
      recorderRef.current = null
    }
  }

  const label = state === 'recording' ? 'Release to send'
    : state === 'transcribing' ? 'Transcribing...'
    : state === 'error' ? 'Mic unavailable'
    : 'Hold to talk'

  const btnColor = state === 'recording'
    ? 'border-red-400 text-red-500 bg-red-50'
    : state === 'error'
    ? 'border-red-300 text-red-400'
    : 'border-gray-200 text-gray-400 hover:border-[#F97316]/40 hover:text-[#F97316]'

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onPointerDown={e => { e.preventDefault(); startRecording() }}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        disabled={disabled || state === 'transcribing'}
        className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors disabled:opacity-40 shrink-0 select-none touch-none ${btnColor} ${state === 'recording' ? 'animate-pulse' : ''}`}
        aria-label={label}
      >
        {state === 'transcribing' ? (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-[#F97316] rounded-full animate-spin" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill={state === 'recording' ? 'currentColor' : 'none'}
               stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="11" rx="3"/>
            <path d="M5 10a7 7 0 0 0 14 0"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="8" y1="22" x2="16" y2="22"/>
          </svg>
        )}
      </button>
      {state !== 'idle' && (
        <span className={`text-[9px] font-semibold leading-none whitespace-nowrap ${state === 'recording' ? 'text-red-500' : state === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
          {label}
        </span>
      )}
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
  onSend: (text: string, silent?: boolean, imageBase64?: string, imageMimeType?: string) => void
  onStepDone: (i: number) => void
  onComplete: () => void
  onAbandon: () => void
  onBack: () => void
  onNew: () => void
}) {
  const [input, setInput] = useState('')
  const [image, setImage] = useState<{ base64: string; mime: string; preview: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
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

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setImage({ base64: dataUrl.split(',')[1], mime: file.type, preview: dataUrl })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleSend() {
    const t = input.trim()
    if ((!t && !image) || isTyping) return
    setInput('')
    if (image) {
      onSend(t || 'Here is a photo of the job.', false, image.base64, image.mime)
      setImage(null)
    } else {
      onSend(t)
    }
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

      <div className="bg-white border-t border-gray-200 px-3 pt-2 pb-3">
        {image && (
          <div className="relative mb-2 inline-block">
            <img src={image.preview} alt="Attached" className="h-20 rounded-xl object-cover border border-gray-200" />
            <button onClick={() => setImage(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white text-xs flex items-center justify-center leading-none">×</button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImagePick} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isTyping}
            className="w-11 h-11 rounded-full border border-gray-200 text-gray-400 flex items-center justify-center hover:border-[#F97316]/40 hover:text-[#F97316] transition-colors disabled:opacity-40 shrink-0"
            aria-label="Attach photo"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
          <VoiceButton disabled={isTyping} onTranscribed={text => { setInput(text); }} />
          <textarea
            className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2.5 text-[15px] outline-none focus:border-[#F97316]/60 bg-gray-50 max-h-28 min-h-[44px]"
            placeholder={image ? 'Add a note or just send the photo...' : 'Ask ACT anything about this job...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !image) || isTyping}
            className="w-11 h-11 rounded-full bg-[#F97316] text-white text-xl font-bold flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
          >
            →
          </button>
        </div>
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
