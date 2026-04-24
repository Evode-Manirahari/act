# ACT

**AI guidance for physical work.**

As multimodal AI, affordable wearable hardware, and a shrinking skilled labor pool converge, the opportunity is to put real-time AI intelligence in the hands of the person doing the physical work.

A small camera and earpiece become your expert — seeing what you see, reasoning about the task, and talking you through each step.

This isn't about replacing tradespeople. It's about making anyone significantly more capable on the job, faster.

## The core experience

1. **ACT sees** — through your camera, in real time
2. **ACT reasons** — about what's in front of you and what needs to happen next
3. **ACT talks** — clear, step-by-step guidance through your earpiece

## Stack

- **Mobile**: React Native (Expo SDK 51), TypeScript
- **API**: Node.js 20, Express, TypeScript, Prisma, PostgreSQL, Redis
- **AI**: Claude (claude-sonnet-4-6) via Anthropic SDK


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

This keeps planning, coding, review, and QA consistent across ACT web, mobile, and API changes.

## Setup

```bash
pnpm install
docker-compose up -d
cd apps/api && pnpm prisma migrate dev
pnpm dev:api
pnpm dev:mobile
```

## Environment

Copy `apps/api/.env.example` to `apps/api/.env` and fill in:
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
