# ACT — CLAUDE.md

## Product Vision
ACT is real-time AI guidance for physical workers.
A small camera and earpiece become your expert — seeing what you see, reasoning about the task, and talking you through each step.

**AI Persona**: ACT — direct, safety-first, trade-calibrated. The best tradesperson you know in your ear.
**Tagline**: Act on what you see.
**Target user**: Tradespeople, DIYers, and anyone doing hands-on physical work — plumbers, electricians, carpenters, HVAC techs, painters, tilers.

## Trade Domains (JobDomain)
- **PLUMBING** 🔧 — pipes, fixtures, drains, water heaters
- **ELECTRICAL** ⚡ — wiring, outlets, panels, fixtures
- **CARPENTRY** 🪵 — framing, trim, doors, cabinets
- **HVAC** ❄️ — heating, cooling, ventilation, ducts
- **PAINTING** 🖌 — interior/exterior, prep, finishing
- **TILING** 🧱 — floor, wall, grout, substrate
- **GENERAL** 🔩 — general maintenance and repairs

## Stack
- **Mobile**: React Native (Expo SDK 51), TypeScript
- **API**: Node.js + Express + TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Cache**: Redis (rate limiting)
- **AI**: Claude (claude-sonnet-4-6) via Anthropic SDK
- **State**: Zustand
- **Monorepo**: pnpm workspaces

## Folder Purposes
- `apps/mobile` — React Native Expo app
- `apps/api` — Express REST API (AI orchestration, DB, business logic)
- `packages/act-prompts` — ACT system prompt + conversation scaffolding
- `packages/shared-types` — TypeScript types shared between mobile and API

## Current State
- Full web app (React+Vite): landing page + hash-routed chat app
- Full mobile app (React Native Expo): boot, onboarding, home, project screens
- API: Express + Prisma + Claude streaming SSE + vision support
- Database: PostgreSQL (Prisma schema with User, Session, Message, Project, Step)
- Cache: Redis (rate limiting, subscription enforcement)
- Streaming: SSE via `anthropic.messages.stream()` — tokens appear in real-time
- Vision: `imageBase64` + `imageMimeType` in chat requests → Claude image blocks
- Trade domains: `JobDomain` on User, injected into system prompt per-request

## Conversation Phases
ACT moves through three phases in every session:
1. **DISCOVERY** — ACT asks what the job is, takes a photo if helpful
2. **SUGGESTION** — ACT proposes 2-3 job plans with steps, materials, time estimate
3. **COACHING** — ACT guides step by step; user confirms each step or shares photos

## THE RULE
**DO NOT rebuild anything already working. Extend only.**
Read a file before touching it. Understand before changing.

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

## API Routes
- `POST /api/users/register` — register or upsert user by deviceId (accepts `domain`)
- `GET  /api/users/:deviceId` — fetch user
- `POST /api/sessions` — create a new chat session
- `POST /api/chat` — **SSE streaming** chat; accepts `imageBase64` + `imageMimeType`
- `GET  /api/sessions/:id` — fetch session with messages
- `POST /api/projects` — save a project when user commits to one
- `PATCH /api/projects/:id` — update project status / step progress
- `GET  /api/projects/user/:userId` — list user's projects
- `GET  /health` — health check

## Streaming (SSE)
`POST /api/chat` returns `Content-Type: text/event-stream`. Events:
```
data: {"type":"delta","content":"token text"}
data: {"type":"done","message":{...},"phase":"COACHING","suggestions":[...]}
data: {"type":"error","message":"error text"}
```
Client (web + mobile): ReadableStream reader, split on `\n`, parse `data: ` lines.

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
