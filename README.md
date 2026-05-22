# ACT

**Your best HVAC techs train the next generation without writing documentation.**

ACT Capture turns ride-alongs and senior service calls into reviewed training objects — short clips of a teachable moment, paired with the expert's reasoning, the novice traps to avoid, the safety boundaries, and a quick quiz to check transfer.

The core invention is not a live AI copilot telling techs what to do. It's a moment-capture system: detect teachable events in the field, ask the expert the right question at a safe time *after* the job, compile the answer into a structured training object, review it, publish it, and measure how well it transfers to apprentices.

## Current wedge: HVAC

First trade is HVAC residential/commercial troubleshooting — no-cool, no-heat, refrigerant, compressor, airflow, electrical faults.

Why HVAC:
- Tight feedback loops — no-cool / no-heat is a repeated controlled event
- Measurable outcomes — first-time fix rate, callbacks, time-to-diagnosis
- Rich tacit signals — sound, vibration, line temp, frost patterns, gauge readings
- BLS: 425k jobs in 2024, ~8% growth through 2034, ~40k openings/year

Earlier electrician customer-discovery work is preserved as input but is not the first pilot target. Existing electrical prompts and KB entries stay in the codebase behind a `trade` flag during the migration — they are not being deleted.

## The Capture flow

1. **Record** — senior tech starts a job recording from their phone
2. **Mark** — they tap "mark this" at teachable moments (one-handed, glove-friendly)
3. **Debrief** — after the job, ACT asks targeted questions about each mark
4. **Compile** — clip + expert-why + novice-traps + safety + quiz → one training object
5. **Review & publish** — a lead tech approves before it goes into the apprentice library
6. **Measure** — apprentice quiz results and on-job application close the loop

## Repo layout

This repo contains the **mobile client only**. The backend lives in a sibling repo.

- `apps/mobile` — React Native Expo app
  - `src/screens/CaptureJobScreen.tsx` — capture-mvp flow: record, mark teachable moments, upload with retry
  - `src/screens/AskActScreen.tsx` — earlier photo → question → Claude diagnosis slice (still wired as the app entry point on `main`)
  - `src/api/actApi.ts` — talks to the deployed backend
- `packages/act-prompts` — shared prompt scaffolding
- `packages/shared-types` — shared TypeScript types
- `packages/act-kb` — field knowledge stubs (electrical entries retained pending HVAC migration)
- `../act-api/` — Python FastAPI backend, deployed at https://act-api-evode.fly.dev ([sibling repo](https://github.com/Evode-Manirahari/act-api))

Active branch: **`capture-mvp`** — where the new capture flow is being built.

## Stack

- **Mobile**: React Native (Expo SDK 51), TypeScript, Zustand
- **Backend** (`act-api/`): Python 3.13, FastAPI, async SQLAlchemy 2.0, Alembic, PostgreSQL, Redis
- **AI**: Claude `claude-sonnet-4-6` via Anthropic Python SDK (vision + streaming, prompt caching)
- **Speech-to-text**: Deepgram (`nova-3`)
- **Monorepo (mobile only)**: pnpm workspaces

## Run the mobile slice

```bash
pnpm install
cd apps/mobile && pnpm start
```

Then on your phone:
1. Install **Expo Go** ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Make sure phone and Mac are on the **same WiFi**
3. Scan the QR code in the terminal, or paste `exp://<lan-ip>:8081` via "Enter URL manually"

On `main`, the app launches into `AskActScreen` (single photo → question → streamed Claude answer). On `capture-mvp`, the entry point will be the Capture flow once App.tsx is wired through. The legacy multi-screen flow (Boot / Onboarding / Paywall / Home / Project) is preserved in git history.

## Backend (sibling repo)

See [Evode-Manirahari/act-api](https://github.com/Evode-Manirahari/act-api) for the FastAPI service the mobile slice talks to.

## Environment

Mobile currently hardcodes the API base URL to `https://act-api-evode.fly.dev` in `apps/mobile/src/api/actApi.ts`. When the slice graduates beyond demo mode, this moves to an Expo env var. Backend env vars live in `act-api/.env` — see `act-api/.env.example`.

## Product framing (do not drift)

- **Say**: "Your best HVAC techs train the next generation without writing documentation."
- **Do not say**: "AI tells techs what to do in real time." That is the *old* framing and it leaks into product decisions if you let it.

The product is for the senior tech, the lead tech who reviews, and the apprentice who learns. Not the AI.

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
