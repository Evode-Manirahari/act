# ACT — CLAUDE.md

## Product Vision
ACT Capture turns ride-alongs and senior service calls into reviewed training objects — short clips of a teachable moment, paired with the expert's reasoning, the novice traps to avoid, the safety boundaries, and a quick quiz to check transfer.

**Core invention**: detect teachable moments in the field → ask the expert the right question at a safe time *after* the job → compile a structured training object → review → publish → measure apprentice transfer.

**This is NOT a real-time AI copilot telling techs what to do.** That was the prior framing and it leaks into product decisions if you let it.

**Product framing**:
- **Say (buyer value)**: "Cut callbacks and ramp new hires faster by capturing your senior techs' company-specific reasoning before they retire." Sold to multi-site operators; measured in callbacks / first-90-day turnover / time-to-billable.
- **Say (user value)**: "Your senior techs pass on what they know without writing a word — captured from real jobs, in their own words."
- **Do not say (retired framing)**: "AI tells techs what to do in real time." (old copilot pitch)
- **Do not say / do not position as (retired framing)**: "Train the next generation" / "generic apprentice training" sold to solo shops. That is the incumbent's (Interplay) position; ACT is the company-specific capture layer *on top of* generic training.

**Users**: senior tech (capture), lead tech (review), apprentice (learn).
**Buyer**: ops director / regional service director / service manager at a multi-site operator or consolidator (ARS, CoolSys, Service Champions, franchise networks). Not the AI, not the solo shop.

**Where ACT sits**: on top of generic simulation training (e.g. Interplay Learning), not against it. Generic training teaches the textbook; ACT captures the company-specific tribal knowledge a generic catalog cannot hold. That non-genericness is the moat.

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
  - `App.tsx` — pilot shell for the Capture → Review → Training flow
  - `src/screens/CaptureJobScreen.tsx` — heart of ACT Capture: record, mark teachable moments, upload with retry
  - `src/screens/PilotReviewScreen.tsx` — mobile review handoff for proposed moments from a recording
  - `src/screens/PilotHomeScreen.tsx` — pilot menu for recording senior-tech jobs and opening apprentice training
  - `src/screens/LearnScreen.tsx` — apprentice-facing learning surface backed by live reviewed cards
- `apps/admin` — Next.js pilot admin (review queue, debrief answers, publish gate) behind the shared-password middleware; server-side client in `lib/api.ts`
- `packages/act-kb` — field knowledge stubs (electrical entries retained pending HVAC migration)
- `../act-api/` — Python FastAPI backend (sibling repo, not a workspace member)

**Active branch**: `main` — capture flow work has been folded into the mainline mobile pilot flow.

Removed 2026-04-23: `apps/api` (Node/Express/Prisma), `apps/web` (React/Vite), `apps/flutter` (untracked, archived to `~/Downloads/act-apps-flutter-backup-2026-04-23.zip`), `railway.toml`.

Removed 2026-06-02: the orphaned pre-pivot consumer-DIY surface — `RootNavigator` + 8 screens (Boot / Onboarding / Paywall / Home / Project / ProjectDetail / History / Profile), `hooks/usePaywall`, `store/act`, `api/act`, the `CompletionModal` / `ResumeBanner` / `SuggestionCard` components, and the now-dead `packages/shared-types` package (~3.7k lines). None were reachable from `App.tsx → PilotNavigator`.

Removed 2026-06-09: the legacy copilot surface — `AskActScreen.tsx` (photo → question → Claude diagnosis), its `AskAct` route and PilotHome entry link, `api/actApi.ts` (SSE `streamJobTurn` client; `createDemoSession` moved to `captureApi.ts`), and the unused `packages/act-prompts` package. The matching backend surface (`turns.py`, `/demo/turn`, `claude.py`, `tts.py`, `verified.py`, `Turn`/`Frame` models + tables) was removed from `../act-api/` in the same sweep.

## Stack
- **Mobile**: React Native (Expo SDK 51), TypeScript, Zustand
- **Backend** (in `../act-api/`): Python 3.13 + FastAPI + async SQLAlchemy 2.0 + Alembic
- **Database**: PostgreSQL (async via `asyncpg`)
- **Pipeline queue**: Postgres-backed durable job table (`processing_jobs`, SKIP LOCKED + heartbeat reclaim + backoff) worked in-process — no Redis
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

The legacy copilot tables (`turns`, `frames`) were dropped 2026-06-09 along with the rest of that surface.

## Mobile State

The mobile app has been progressively rewiring from the pre-pivot consumer-DIY product to the Capture flow. As of the current mainline work:
- `CaptureJobScreen` records, drops marks, queues uploads with retry/resume
- `App.tsx` now launches into the HVAC training-capture shell
- `CaptureJobScreen` includes a consent selector before recording; `do_not_share` blocks capture
- `PilotReviewScreen` lets the pilot reviewer approve/reject proposed moments for the latest recording
- `LearnScreen` is the apprentice-facing surface and includes live reviewed cards, quiz-event logging, completion logging, and an honest empty state when no card exists
- `PilotOutcomeScreen` logs final diagnosis, fix, first-time-fix/callback signal, diagnosis-time note, and apprentice progress against `/jobs/{job_id}/outcomes`; it must be launched with a real captured job id
- Status polling + auto-process closes the loop after upload
- `PilotNavigator` gates the pilot stack behind Supabase Auth (`LoginScreen`, invite-only, email+password) whenever `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set (see `src/lib/supabase.ts`, `src/hooks/useAuthSession.ts`); unset, it falls back to the pre-existing demo-session flow untouched. The backend does not yet verify Supabase tokens — see the Auth section below.

The mobile API clients (`apps/mobile/src/api/captureApi.ts`, `libraryApi.ts`) talk to the deployed FastAPI service at `https://act-api-evode.fly.dev` (`apps/mobile/src/lib/config.ts`, overridable via `EXPO_PUBLIC_API_BASE_URL`). `actApi.ts` (the old SSE copilot client) was removed 2026-06-09 — this reference predated that cleanup.

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

*(Exceptions taken: 2026-04-23 backend rewritten from Node to Python because the vision/audio pipeline is materially easier in Python. 2026-05-19 product pivot from live copilot to ACT Capture — superseded vision/persona but did not require a code rewrite; the retained copilot surface was finally removed 2026-06-09.)*

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

Session bootstrap:
- `POST /demo/session` — returns the seeded pilot account/user/job the capture flow records against until real auth lands

All endpoints are request/response — the SSE streaming surface went with the legacy copilot.

## Auth (Pilot)

End-to-end wiring is in place across both repos; activation is config-only (no Supabase project exists yet):
- `apps/mobile/src/lib/supabase.ts` creates a Supabase client gated on `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`supabaseConfigStatus` from `lib/supabaseConfig.ts`). Both unset — the state today — `PilotNavigator` renders the pilot stack as before (`/demo/session`). Partial or unparseable config **fails closed** to a config-error screen, as does a build with `EXPO_PUBLIC_REQUIRE_AUTH` set but no Supabase config (set that flag in the same EAS profile change that adds the Supabase vars). The gate decision is the pure `resolveAuthGate` in `src/navigation/authGateModel.ts` (tested).
- Once configured, `PilotNavigator` requires a session and shows `LoginScreen` (email + password, invite-only, no sign-up) until one exists. PilotHome shows a "Signed in as … · Sign out" row when a session exists.
- **Backend (Phase 3, act-api#38)**: `app/services/supabase_auth.py` verifies Supabase Bearer tokens (JWKS ES256/RS256 + legacy HS256), maps the token's email to the invite-only `users` row, and overrides client-provided actor ids. Env-gated: `SUPABASE_URL`/`SUPABASE_JWT_SECRET` unset = auth off; `AUTH_REQUIRED=true` = anonymous rejected, `/demo/*` disabled.
- **Phase 4 (act-api#39 + this repo)**: backend `GET /me` + account-scoped jobs/review-queue/library/dashboards; mobile attaches the session token to every API call (`src/lib/authToken.ts` → both `jsonFetch` helpers, the audio-answer upload, the dev-fallback recording upload; the presigned R2 PUT deliberately stays headerless) and bootstraps identity via `getPilotContext`/`createCaptureSession` (`/me` + real jobs when logged in, demo flow untouched otherwise).
- **Admin (Phase 4)**: `apps/admin/lib/actAuth.ts` — server-side service login (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / ADMIN_SUPABASE_EMAIL / ADMIN_SUPABASE_PASSWORD, all four together); every act-api call carries the admin user's token, and the topbar shows "acting as …" from `GET /me`. Any var unset (today) = anonymous, unchanged.
- **Per-object account scoping** (act-api `app/services/scoping.py`): cross-tenant recording/moment/job ids 404 on the whole capture surface. Remaining: knowledge.py's question/answer/card-by-id routes — mechanical with the shared loaders.
- **Deferred (post-activation hardening, from the 2026-07-01 review)**: encrypt the persisted session (SecureStore-keyed storage adapter instead of raw AsyncStorage); keep `PilotStack` mounted (overlay login instead of unmount) so a `SIGNED_OUT` event mid-capture can't destroy an in-progress recording; map raw Supabase error strings to pilot-friendly copy on `LoginScreen`.

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

## GBrain Configuration (configured by /setup-gbrain)
- Mode: local-stdio
- Engine: pglite
- Config file: `~/.gbrain/config.json` (mode 0600)
- Setup date: 2026-05-29
- MCP registered: yes, via Codex global config at `~/.codex/config.toml`
- Codex MCP command: `/Users/evodemanirahari/.bun/bin/gbrain serve`
- Current repo policy: read-write
- Current repo source: `gstack-code-act-b3325446`
- Worktree pin: `.gbrain-source` (ignored by git)
- Artifacts sync: off
- Known warning: vector embeddings are not populated until `ZEROENTROPY_API_KEY` or another embedding provider is configured. Keyword search and symbol code lookup still work.

## GBrain Search Guidance (configured by /setup-gbrain)
<!-- gstack-gbrain-search-guidance:start -->

GBrain is installed and synced for this ACT worktree. Prefer gbrain over Grep when the question is semantic, architectural, or symbol-based and you do not already know the exact string to search.

Indexed ACT code source:
- `gstack-code-act-b3325446` for `/Users/evodemanirahari/act`

Prefer gbrain when:
- "Where is X handled?" or intent-based lookup:
  `gbrain search "<terms>"` or `gbrain query "<question>"`
- "Where is symbol Y defined?":
  `gbrain code-def <symbol>`
- "Where is symbol Y used?":
  `gbrain code-refs <symbol>`
- "What calls Y?" or "What does Y call?":
  `gbrain code-callers <symbol>` / `gbrain code-callees <symbol>`
- "What did we decide last time?":
  `gbrain search "<terms>" --source gstack-code-act-b3325446` for ACT-specific indexed content, then fall back to local project docs if needed.

Grep is still right for exact strings, regex, file globs, and very small local checks. Run `/sync-gbrain` or:
`bun ~/.codex/skills/gstack/bin/gstack-gbrain-sync.ts --code-only --full`
after large code moves so the ACT source stays fresh.

<!-- gstack-gbrain-search-guidance:end -->

### Core gstack skills used in ACT
- `/office-hours` — product discovery and reframing
- `/plan-ceo-review` — first-principles founder/product review
- `/plan-eng-review` — architecture, data-flow, and test planning
- `/review` — production-focused code review
- `/qa` — diff-aware QA of affected journeys
- `/ship` — release engineer flow for push + PR
- `/browse` — browser automation + screenshots
- `/retro` — post-release process improvement

## Design System
Read **DESIGN.md** before any visual/UI work. ACT's system is "Field Instrument"
(industrial/utilitarian, light-first): one hi-vis action color (safety orange
`#EA580C`), cool steel neutrals, ink text, mono-accented numbers/labels, and a
lockout-style safety panel. Tokens live in `apps/mobile/src/theme/colors.ts` and
`typography.ts`. Don't deviate without updating DESIGN.md. In QA, flag UI that
doesn't match it.
