# ACT

**AI guidance for physical work.**
*Short-form for technical channels: **"Claude Code for electricians."***

As multimodal AI, affordable wearable hardware, and a shrinking skilled labor pool converge, the opportunity is to put real-time AI intelligence in the hands of the person doing the physical work.

A small camera and earpiece become your expert — seeing what you see, reasoning about the task, and talking you through each step.

This isn't about replacing tradespeople. It's about making anyone significantly more capable on the job, faster.

## The core experience

1. **ACT sees** — through your camera, in real time
2. **ACT reasons** — about what's in front of you and what needs to happen next
3. **ACT talks** — clear, step-by-step guidance through your earpiece

## Current wedge: electrician field diagnostics

First vertical is working electricians doing on-site identification and safety triage: unknown panels, legacy wiring, hacked junctions, mixed old/new systems, and "what do I verify before touching this?" moments. Other trades come after we have paying electrical contractor design partners.

## Repo layout

This repo contains the **mobile client only**. The backend lives in a sibling repo.

- `apps/mobile` — React Native Expo app
  - `src/screens/AskActScreen.tsx` — current vertical slice: photo → question → Claude answer
  - `src/api/actApi.ts` — talks to the deployed backend
- `packages/act-prompts`, `packages/shared-types`, `packages/act-kb` — shared code and electrical field knowledge
- `../act-api/` — Python FastAPI backend, deployed at https://act-api-evode.fly.dev ([sibling repo](https://github.com/Evode-Manirahari/act-api))

## Stack

- **Mobile**: React Native (Expo SDK 51), TypeScript, Zustand
- **Backend** (`act-api/`): Python 3.13, FastAPI, async SQLAlchemy 2.0, Alembic, PostgreSQL, Redis
- **AI**: Claude `claude-sonnet-4-6` via Anthropic Python SDK (vision + streaming, prompt caching)
- **Speech-to-text**: Deepgram (`nova-3`)
- **Monorepo (mobile only)**: pnpm workspaces

## Run the mobile slice

The mobile app currently launches directly into `AskActScreen` — a single screen that takes a photo, accepts a typed question, and streams Claude's diagnosis back from the live API at `https://act-api-evode.fly.dev`.

```bash
pnpm install
cd apps/mobile && pnpm start
```

Then on your phone:
1. Install **Expo Go** ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Make sure phone and Mac are on the **same WiFi**
3. Scan the QR code in the terminal, or paste `exp://<lan-ip>:8081` via "Enter URL manually"

The legacy multi-screen flow (Boot / Onboarding / Paywall / Home / Project) is preserved in git history. To restore it:
```bash
git show HEAD~:apps/mobile/App.tsx > apps/mobile/App.tsx
```

## Backend (sibling repo)

See [Evode-Manirahari/act-api](https://github.com/Evode-Manirahari/act-api) for the FastAPI service the mobile slice talks to.

## Environment

Mobile currently hardcodes the API base URL to `https://act-api-evode.fly.dev` in `apps/mobile/src/api/actApi.ts`. When the slice graduates beyond demo mode, this moves to an Expo env var. Backend env vars live in `act-api/.env` — see `act-api/.env.example`.

## AI workflow helper (gstack)

This repo standardizes on [garrytan/gstack](https://github.com/garrytan/gstack) as the default AI workflow helper for planning, implementation, review, and QA.

### Local install (one-time)
```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup
```

### Team usage in this project
- Start product discovery with `/office-hours` + `/plan-ceo-review`
- Validate implementation with `/plan-eng-review` before coding
- Run `/review` before opening a PR
- Run `/qa` against the changed experience before merge
- Run `/ship` when ready to push and open PRs

## License

MIT — see [LICENSE](LICENSE).
