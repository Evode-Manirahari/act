# ACT — CLAUDE.md

## Product Vision
ACT is real-time AI guidance for physical workers.
A small camera and earpiece become your expert — seeing what you see, reasoning about the task, and talking you through each step.

**AI Persona**: ACT — direct, safety-first, trade-calibrated. The best tradesperson you know in your ear.
**Tagline**: Act on what you see.
**Target user**: Tradespeople doing hands-on physical work — plumbers, electricians, carpenters, HVAC techs, painters, tilers.

## Current Wedge: HVAC field diagnostics
Build vertically. The first deployed vertical is **HVAC field technicians** doing on-site diagnostic walkthroughs: tech points camera at equipment, asks a question, ACT identifies the component and gives the next concrete step. Other trades come after we have paying HVAC design partners.

## Trade Domains (future)
- **HVAC** ❄️ — heating, cooling, ventilation, ducts **← current focus**
- **PLUMBING** 🔧 — pipes, fixtures, drains, water heaters
- **ELECTRICAL** ⚡ — wiring, outlets, panels, fixtures
- **CARPENTRY** 🪵 — framing, trim, doors, cabinets
- **PAINTING** 🖌 — interior/exterior, prep, finishing
- **TILING** 🧱 — floor, wall, grout, substrate

## Repo Layout
This repo (`act/`) now contains only the mobile client. The backend lives in a sibling repo.

- `apps/mobile` — React Native Expo app (the only app after the 2026-04-23 prune)
- `packages/act-prompts` — shared prompt/conversation scaffolding used by mobile
- `packages/shared-types` — shared TypeScript types
- `packages/act-kb` — knowledge-base stubs (retained pending integration)
- `../act-api/` — Python FastAPI backend (sibling repo, not a workspace member)

Removed 2026-04-23: `apps/api` (Node/Express/Prisma), `apps/web` (React/Vite), `apps/flutter` (untracked, archived to `~/Downloads/act-apps-flutter-backup-2026-04-23.zip`), `railway.toml`.

## Stack
- **Mobile**: React Native (Expo SDK 51), TypeScript, Zustand
- **Backend** (in `../act-api/`): Python 3.13 + FastAPI + async SQLAlchemy 2.0 + Alembic
- **Database**: PostgreSQL (async via `asyncpg`)
- **Cache / queue**: Redis
- **AI**: Claude `claude-sonnet-4-6` via `anthropic` Python SDK, vision + streaming, prompt caching on system prompt
- **Speech-to-text**: Deepgram (`nova-3`) with stub fallback
- **TTS**: stub (ElevenLabs wiring pending)
- **Monorepo (mobile only)**: pnpm workspaces

## Backend Data Model (act-api)
- `accounts` — HVAC company (the buyer)
- `users` — technician, belongs to an account
- `jobs` — one field visit
- `turns` — one voice Q → Claude A exchange within a job (the moat: labeled workflow data)
- `frames` — image captures attached to a turn

## Mobile State
- Boot, onboarding, home, history, profile, project/session screens exist from the pre-pivot consumer-DIY product.
- **The mobile app still speaks the old `api.registerUser`, `api.createSession`, `api.updateProject` interface — it does not yet talk to `act-api/`.** Rewiring is the next mobile milestone: replace the old API client with calls to `POST /jobs`, `POST /jobs/:id/turns` (SSE), `GET /jobs/:id`.

## Conversation Flow (product concept)
Historically three phases — DISCOVERY, SUGGESTION, COACHING. For the HVAC wedge the flow collapses to a continuous loop of **turns**: frame + spoken question → diagnostic step + spoken response. Phase state, if we keep it, lives in the mobile app, not the backend.

## THE RULE
**DO NOT rebuild anything already working. Extend only.**
Read a file before touching it. Understand before changing.
*(Exception taken on 2026-04-23: backend rewritten from Node to Python because the vision/audio pipeline is materially easier in Python. Mobile is being pruned, not rewritten.)*

## Colors
- Primary: #F97316 (warm orange)
- Background: #FAFAF8 (warm off-white)
- Surface: #FFFFFF
- Text: #1A1A1A
- TextMuted: #6B7280
- Border: #E5E7EB
- Success: #10B981 (green)

## ACT Persona
ACT speaks like the best tradesperson you know. Direct. Safety-first. No padding.
Short sentences. Trade vocabulary where appropriate. Never condescending.
- "Turn off the breaker first. Don't skip this."
- "That fitting needs thread tape."
- "Good — now hand-tighten. We'll torque it after."
- "Photo helps here. Show me what you're working with."
- "That's a hairline crack in the P-trap. Needs replacing, not patching."

## API Routes (act-api, Python FastAPI)
- `GET  /health` — health check, returns `{ok, db}`
- `POST /jobs` — create a job for a user
- `GET  /jobs` — list recent jobs
- `GET  /jobs/{job_id}` — fetch one job
- `POST /jobs/{job_id}/turns` — **SSE streaming.** Multipart body: `frame` (image), `audio` (audio blob), optional `question` (text override for transcription). Returns events (below).

## Streaming (SSE)
`POST /jobs/{job_id}/turns` streams these events in order:
```
event: transcript
data: <tech's transcribed question>

event: token
data: <incremental Claude output token>
...

event: audio
data: <synthesized TTS audio URL>

event: done
data: <turn id>
```
Client: use `EventSource` (web) or an SSE-capable fetch reader (React Native).

## gstack
Use the /browse skill from gstack for all web browsing tasks.

Available skills:
- `/plan-ceo-review` — First-principles founder review: are we solving the right problem?
- `/plan-eng-review` — Lock in architecture, data flow, diagrams, edge cases before coding
- `/review` — Paranoid staff engineer code review hunting production-breaking bugs
- `/ship` — Release engineer: sync, test, resolve reviews, push to production
- `/browse` — QA engineer: visual feedback via automated browser testing with screenshots
- `/qa` — QA lead: systematic diff-aware testing of affected pages and routes
- `/retro` — Engineering manager: retrospectives with per-person metrics and feedback
