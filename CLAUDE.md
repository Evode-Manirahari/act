# ACT — CLAUDE.md

## Product Vision
ACT Capture turns ride-alongs and senior service calls into reviewed training objects — short clips of a teachable moment, paired with the expert's reasoning, the novice traps to avoid, the safety boundaries, and a quick quiz to check transfer.

**Core invention**: detect teachable moments in the field → ask the expert the right question at a safe time *after* the job → compile a structured training object → review → publish → measure apprentice transfer.

**This is NOT a real-time AI copilot telling techs what to do.** That was the prior framing and it leaks into product decisions if you let it.

**Product framing**:
- **Say**: "Your best HVAC techs train the next generation without writing documentation."
- **Do not say**: "AI tells techs what to do in real time."

**Target users**: senior tech (capture), lead tech (review), apprentice (learn). Not the AI.

## Current Wedge: HVAC

Residential/commercial troubleshooting — no-cool, no-heat, refrigerant, compressor, airflow, electrical faults.

Why HVAC:
- Tight feedback loops — no-cool / no-heat is a repeated controlled event
- Measurable outcomes — first-time fix rate, callbacks, time-to-diagnosis
- Rich tacit signals — sound, vibration, line temp, frost patterns, gauge readings
- BLS: 425k jobs in 2024, ~8% growth through 2034, ~40k openings/year

The earlier electrician customer-discovery work is preserved as input but is not the first pilot target. Existing electrical prompts and KB entries stay in the codebase behind a `trade` flag during the migration — they are not being deleted.

## Trade Domains
- **HVAC** ❄️🔥 — refrigeration, airflow, compressors, controls **← current focus**
- ELECTRICAL ⚡ — retained for migration; not the first pilot
- PLUMBING 🔧, CARPENTRY 🪵, PAINTING 🖌, TILING 🧱 — future

## Repo Layout
This repo (`act/`) contains the mobile client only. The backend lives in a sibling repo.

- `apps/mobile` — React Native Expo app
  - `App.tsx` — pilot shell entrypoint, currently launching straight into Capture
  - `src/screens/CaptureJobScreen.tsx` — heart of ACT Capture: record, mark teachable moments, upload with retry
  - `src/screens/PilotReviewScreen.tsx` — mobile review handoff for proposed moments from a recording
  - `src/screens/PilotHomeScreen.tsx` — secondary pilot menu for Capture, Learn, and legacy diagnosis
  - `src/screens/LearnScreen.tsx` — apprentice-facing learning surface
  - `src/screens/AskActScreen.tsx` — legacy photo → question → Claude diagnosis slice, now demoted behind the pilot shell
  - Legacy screens (Boot / Onboarding / Paywall / Home / Profile / Project / History) retained pending Capture flow finalization
- `packages/act-prompts` — shared prompt scaffolding used by mobile
- `packages/shared-types` — shared TypeScript types
- `packages/act-kb` — field knowledge stubs (electrical entries retained pending HVAC migration)
- `../act-api/` — Python FastAPI backend (sibling repo, not a workspace member)

**Active branch**: `capture-mvp` — where the Capture flow is being built and merged back to `main` in waves.

Removed 2026-04-23: `apps/api` (Node/Express/Prisma), `apps/web` (React/Vite), `apps/flutter` (untracked, archived to `~/Downloads/act-apps-flutter-backup-2026-04-23.zip`), `railway.toml`.

## Stack
- **Mobile**: React Native (Expo SDK 51), TypeScript, Zustand
- **Backend** (in `../act-api/`): Python 3.13 + FastAPI + async SQLAlchemy 2.0 + Alembic
- **Database**: PostgreSQL (async via `asyncpg`)
- **Cache / queue**: Redis
- **Object storage**: Cloudflare R2 (video uploads, extracted frames)
- **AI**: Claude `claude-sonnet-4-6` via `anthropic` Python SDK — vision + streaming, prompt caching on system prompts
- **Speech-to-text**: Deepgram (`nova-3`)
- **TTS**: stub (ElevenLabs wiring pending)
- **Monorepo (mobile only)**: pnpm workspaces

## Backend Data Model (act-api)

Capture surface (the new core):
- `accounts` — contractor (the buyer)
- `users` — tech, belongs to an account
- `jobs` — one field visit
- `recordings` — a video captured during a job
- `recording_marks` — "mark this" timestamps dropped by the tech mid-recording (the teachable moments)
- `moments` — moment objects compiled from a recording after processing; the unit a lead tech reviews
- `extracted_frames` — frames pulled from a recording at and around marks
- `transcript_segments` — diarized transcript chunks from the recording's audio
- `elicitation_questions` — questions ACT asks the expert during debrief about a moment
- `expert_answers` — the expert's voice/text answer; corrected and edited inline
- `knowledge_objects` — the published training object (clip + expert-why + novice traps + safety + quiz)
- `training_events` — apprentice interactions with a knowledge object (viewed, quizzed, applied)
- `job_outcomes` — first-time-fix, callbacks, time-to-diagnosis per job (the measurement loop)

Legacy copilot surface (still present, not the focus):
- `turns` — one voice Q → Claude A exchange within a job
- `frames` — image captures attached to a turn

## Mobile State

The mobile app has been progressively rewiring from the pre-pivot consumer-DIY product to the Capture flow. As of the latest `capture-mvp` work:
- `CaptureJobScreen` records, drops marks, queues uploads with retry/resume
- `App.tsx` now launches straight into Capture through the HVAC pilot shell
- `CaptureJobScreen` includes a consent selector before recording; `do_not_share` blocks capture
- `PilotReviewScreen` lets the pilot reviewer approve/reject proposed moments for the latest recording
- `LearnScreen` is the apprentice-facing surface
- Status polling + auto-process closes the loop after upload
- `AskActScreen` is still reachable for legacy diagnosis, but it is no longer the app entry point on `capture-mvp`

The mobile API client (`apps/mobile/src/api/actApi.ts`) talks to the deployed FastAPI service at `https://act-api-evode.fly.dev`.

## The Capture Flow (product concept)

1. **Record** — senior tech starts a job recording from their phone
2. **Mark** — taps "mark this" at teachable moments (one-handed, glove-friendly)
3. **Upload** — recording uploads with retry/resume; processing extracts frames and transcript at marks
4. **Debrief** — ACT generates `elicitation_questions` for each moment; expert answers via voice or inline edit
5. **Compile** — clip + expert-why + novice-traps + safety + quiz → one `knowledge_object`
6. **Review & publish** — a lead tech approves before it goes into the apprentice library
7. **Measure** — `training_events` and `job_outcomes` close the loop

Phase state, if needed, lives in the mobile app. The backend tracks objects, not phases.

## THE RULE
**DO NOT rebuild anything already working. Extend only.**
Read a file before touching it. Understand before changing.

*(Exceptions taken: 2026-04-23 backend rewritten from Node to Python because the vision/audio pipeline is materially easier in Python. 2026-05-19 product pivot from live copilot to ACT Capture — superseded vision/persona but did not require a code rewrite; capture surface is additive, copilot surface is retained behind the trade migration.)*

## Colors
- Primary: #F97316 (warm orange)
- Background: #FAFAF8 (warm off-white)
- Surface: #FFFFFF
- Text: #1A1A1A
- TextMuted: #6B7280
- Border: #E5E7EB
- Success: #10B981 (green)

## ACT Persona

ACT Capture has two voices — pick the one that matches the surface.

**Debrief voice** (asking the expert about a moment, *after* the job):
Curious, specific, never patronizing. The questions a sharp apprentice would ask a master if they weren't afraid to.
- "At the 4:12 mark you stopped and looked at the line set. What told you to check there first?"
- "You bypassed the standard sequence here — what would have happened if a newer tech ran it by the book?"
- "Safety-wise, what would you not want an apprentice to do alone at this step?"

**Apprentice voice** (training surface, explaining a published knowledge object):
Direct. Trade-calibrated. Short sentences. Names the novice trap explicitly.
- "Frost on the suction line at this temp = low charge or restricted airflow, not 'it's working hard'."
- "Don't measure superheat on a TXV system to diagnose charge. Use subcooling."
- "Federal Pacific Stab-Lok panel. Treat as high risk and verify the disconnect."

There is no real-time-in-your-ear voice anymore. That was the old product.

## API Routes (act-api, Python FastAPI)

Health:
- `GET  /health` — health check
- `GET  /health/capture` — capture-pipeline-specific health

Jobs:
- `POST /jobs` — create a job
- `GET  /jobs` — list recent jobs
- `GET  /jobs/{job_id}` — fetch one job
- `POST /jobs/{job_id}/summary` — generate/fetch job summary

Recordings (the Capture core):
- `POST /jobs/{job_id}/recordings` — create a recording for a job
- `GET  /jobs/{job_id}/recordings` — list recordings for a job
- `GET  /recordings/{recording_id}` — recording detail
- `POST /recordings/{recording_id}/marks` — drop a mark at a timestamp
- `POST /recordings/{recording_id}/complete` — mark recording complete
- `POST /recordings/{recording_id}/upload` — finalize uploaded video
- `POST /recordings/{recording_id}/process` — kick processing (frames + transcript + moment detection)
- Additional `GET` endpoints under `/recordings/{recording_id}/...` expose processing status and artifacts

Moments:
- `GET   /moments/review` — review queue for lead techs
- `PATCH /moments/{moment_id}` — edit / approve / reject a moment

Knowledge (debrief + compilation):
- `POST  /questions/...` — elicitation questions, expert answers, compiled knowledge objects, and inline edits
- `PATCH /questions/...` — edit questions, answers, transcripts, and compiled cards
- (See `app/routes/knowledge.py` for the full set — admin voice recorder, inline transcript correction, etc.)

Library + outcomes:
- `GET  /library/search` — search published knowledge objects
- `POST /library/...` — publishing endpoints
- `POST /jobs/{job_id}/outcomes` — log first-time-fix / callback / time-to-diagnosis
- `GET  /jobs/{job_id}/outcomes` — fetch outcomes
- `GET  /dashboard/summary` — pilot-readiness metrics

Legacy copilot (retained):
- `POST /jobs/{job_id}/turns` — SSE streaming voice Q → Claude A flow (older surface)
- `POST /demo/turn`, `POST /demo/session` — demo endpoints

## Streaming (SSE, legacy turns surface)
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
Client: `EventSource` (web) or SSE-capable fetch reader (React Native). Capture-flow endpoints are request/response, not SSE.

## Admin / Pilot Safety

Recent work added a shared-password gate, in-browser voice recorder for expert answers, inline editing for questions and compiled cards, and inline transcript correction in the voice recorder. The pilot admin surface is meant to keep a lead tech in the loop on every published object.

## gstack
Use [garrytan/gstack](https://github.com/garrytan/gstack) as the default helper workflow throughout this product.

### Required usage pattern
- Use `/office-hours` and `/plan-ceo-review` when defining new features or pivots.
- Use `/plan-eng-review` before major implementation work to lock architecture and edge cases.
- Use `/review` before opening or updating a PR.
- Use `/qa` on changed user flows before merge (mobile/web/api-visible behavior).
- Use `/ship` to finalize release-ready branches.
- Use `/retro` after significant milestones to improve team process.

### Browsing/tooling rule
Use the `/browse` skill from gstack for all web browsing tasks.

### Core gstack skills used in ACT
- `/office-hours` — product discovery and reframing
- `/plan-ceo-review` — first-principles founder/product review
- `/plan-eng-review` — architecture, data-flow, and test planning
- `/review` — production-focused code review
- `/qa` — diff-aware QA of affected journeys
- `/ship` — release engineer flow for push + PR
- `/browse` — browser automation + screenshots
- `/retro` — post-release process improvement
