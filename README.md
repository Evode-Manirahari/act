# ACT

**AI guidance for physical work.**

As multimodal AI, affordable wearable hardware, and a shrinking skilled labor pool converge, the opportunity is to put real-time AI intelligence in the hands of the person doing the physical work.

A small camera and earpiece become your expert — seeing what you see, reasoning about the task, and talking you through each step.

This isn't about replacing tradespeople. It's about making anyone significantly more capable on the job, faster.

## The core experience

1. **ACT sees** — through your camera, in real time
2. **ACT reasons** — about what's in front of you and what needs to happen next
3. **ACT talks** — clear, step-by-step guidance through your earpiece

## Current wedge: HVAC field diagnostics

First vertical is HVAC field technicians doing on-site diagnostic walkthroughs. Other trades (plumbing, electrical, carpentry, painting, tiling) come after we have paying HVAC design partners.

## Repo layout

This repo contains the **mobile client only**. The backend lives in a sibling repo.

- `apps/mobile` — React Native Expo app
- `packages/act-prompts`, `packages/shared-types`, `packages/act-kb` — shared code
- `../act-api/` — Python FastAPI backend (sibling repo, not a workspace member)

## Stack

- **Mobile**: React Native (Expo SDK 51), TypeScript, Zustand
- **Backend** (`act-api/`): Python 3.13, FastAPI, async SQLAlchemy 2.0, Alembic, PostgreSQL, Redis
- **AI**: Claude `claude-sonnet-4-6` via Anthropic Python SDK (vision + streaming, prompt caching)
- **Speech-to-text**: Deepgram (`nova-3`)
- **Monorepo (mobile only)**: pnpm workspaces

## Setup

Mobile:
```bash
pnpm install
pnpm dev:mobile
```

Backend (in the sibling `act-api/` repo):
```bash
cd ../act-api
uv sync                          # or: python -m venv .venv && pip install -e .
cp .env.example .env             # set ANTHROPIC_API_KEY, DEEPGRAM_API_KEY
docker compose up -d postgres redis
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

The mobile app needs to be rewired to talk to `act-api/` (current screens still speak the old `api.createSession` / `api.updateProject` interface from the pre-pivot codebase).

## Environment

Mobile reads its API base URL from Expo env. Backend env vars live in `act-api/.env` — see `act-api/.env.example`.

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
