# Actober — CLAUDE.md

## Product Vision
Actober is a real-time AI coaching system for skilled trade workers. A worker wears a camera on-site — phone chest mount today, smart glasses tomorrow. The AI (ACT) sees exactly what they see, hears their voice, and guides them through the job step by step. Live. Hands-free. On-site.

**AI Persona**: ACT — the voice of Actober in the field
**Tagline**: Act on what you see.
**First vertical**: Electricians doing retrofit and renovation work in old buildings.

## Stack Decisions
- **Mobile**: React Native (Expo SDK 51) — cross-platform, OTA updates via EAS
- **API**: Node.js + Express + TypeScript — fast iteration, strong ecosystem
- **Database**: PostgreSQL via Prisma ORM — relational, audit trails
- **Cache**: Redis (ioredis) — session data, rate limiting, PDF cache
- **AI**: OpenAI GPT-4o (vision + chat) + Whisper (speech-to-text)
- **State**: Zustand — simple, no boilerplate
- **Monorepo**: pnpm workspaces — shared types, unified tooling

## Folder Purposes
- `apps/mobile` — React Native Expo app (the worker's interface)
- `apps/api` — Express REST API (AI orchestration, DB, business logic)
- `packages/trade-knowledge` — AI system prompts and trade expertise
- `packages/shared-types` — TypeScript types shared between mobile and API

## Current State
- Phase 1: Project scaffold, dependencies, trade knowledge base
- Phase 2: Prisma schema, all API routes (users, sessions, chat), 17 tests passing
- Phase 3: Full mobile navigation + all 5 screens, Zustand store, zero TypeScript errors
- Phase 4: Live AI chat loop wired — API client, session init, optimistic UI, safety flash, voice output, AppState persistence
- Phase 5: Camera + GPT-4o vision — ActoberCamera component, image compression, capture→thumbnail→analysis flow, simulator demo mode
- Phase 6: Voice input + hands-free mode — Whisper transcription (POST /api/transcribe), VoiceInput component, hold-to-record, walkie-talkie hands-free loop
- Phase 7: Job documentation + PDF export — GPT-4o structured report, pdfkit builder, Redis 24h cache, GET /summary + GET /export, expo-file-system + expo-sharing
- Phase 8: Offline mode & resilience — OfflineBanner (animated slide-in), useNetworkStatus (NetInfo), matchOfflineQuery (10 cached electrical answers), AsyncStorage offline queue (enqueue/flush on reconnect), session message backup, reconnect-sync effect (processes queue on isOnline transition), 71 tests total
- Phase 9: Multi-trade expansion — HVAC, Plumbing, Welding system prompts; 25 offline knowledge entries (10 ELECTRICAL + 5 each HVAC/PLUMBING/WELDING); matchOfflineQuery trade filter; trade-specific quick chips on FieldScreen; trade-specific scenario cards on HomeScreen; getVisionContext() for per-trade image analysis; 102 tests total
- Phase 10: Production deploy & monitoring — express-rate-limit (global 100/min, chat 20/min, transcribe 10/min, skip in test); @sentry/node API (graceful no-op without DSN); @sentry/react-native mobile; compression middleware; enhanced /health (Redis probe, degraded 503); Dockerfile (multi-stage pnpm monorepo build); railway.toml; eas.json (dev/preview/production profiles); .env.example updated; 116 tests total

## API Routes
- `POST /api/users/register` — register or upsert user by deviceId
- `GET  /api/users/:deviceId` — fetch user
- `POST /api/sessions` — create session
- `GET  /api/sessions/:id` — fetch session with messages
- `GET  /api/sessions/user/:userId` — list user sessions (newest first)
- `PATCH /api/sessions/:id` — update endedAt / jobNotes
- `POST /api/chat` — AI chat (GPT-4o, vision-capable, safety detection)
- `GET  /health` — health check

## THE RULE
**DO NOT rebuild anything already working. Extend only.**

Before touching any file, read it first. Understand what exists before changing anything.

## Colors
- Primary: #EA580C (orange)
- Background: #0A0A0A (near black)
- Font: Courier New for labels/monospace, system font for body

## ACT Persona
ACT speaks like a calm master electrician. Short sentences. Trade language. Safety first.
- ⚠️ = hazard
- ✅ = safe
- 🔧 = action item
- 📋 = code reference
