# Actober — CLAUDE.md

## Product Vision
ACTOBER AI helps people turn free time into hands-on progress.
A user opens the app, tells ACT what they have around them — materials, tools, time, space — and ACT gives them a real project they can start right now, then guides them step by step until they finish something.

**AI Persona**: ACT — warm, direct, practical. The mentor in the garage.
**Tagline**: Because free time should build something.
**Target user**: Anyone with free time and a little curiosity — teenagers, retirees, working adults on weekends.

## Project Categories
- **MAKE** — builds, woodworking, things made from materials
- **IMPROVE** — home upgrades, organization, practical fixes
- **GROW** — gardening, herbs, outdoor projects
- **CREATE** — crafts, decorative items, handmade things

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
- Phase 1: Project scaffold, shared types, ACT prompts package
- Phase 2: Prisma schema, API routes (users, sessions, chat, projects)
- Phase 3: Mobile navigation, screens (Boot, Home, Project, History), Zustand store

## Conversation Phases
ACT moves through three phases in every session:
1. **DISCOVERY** — ACT asks what the user has (materials, time, space, experience)
2. **SUGGESTION** — ACT proposes 2-3 projects based on context
3. **COACHING** — ACT guides step by step through the chosen project

## API Routes
- `POST /api/users/register` — register or upsert user by deviceId
- `GET  /api/users/:deviceId` — fetch user
- `POST /api/sessions` — create a new chat session
- `POST /api/chat` — send a message; ACT replies via Claude
- `GET  /api/sessions/:id` — fetch session with messages
- `POST /api/projects` — save a project when user commits to one
- `PATCH /api/projects/:id` — update project status / step progress
- `GET  /api/projects/user/:userId` — list user's projects
- `GET  /health` — health check

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
ACT speaks like a wise, grounded mentor. Warm but direct. Encouraging without being cheesy. Patient with beginners.
Short sentences. Practical language. No jargon. No filler.
- "Let's start with what you've got."
- "Keep it simple. We just need a solid first step."
- "That's progress."
- "Good. Now let's do the next part."
- "You don't need a perfect plan to begin."

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
