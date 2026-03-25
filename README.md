# ACTOBER AI

**Because free time should build something.**

ACTOBER AI is a mobile app with an AI guide called ACT. You tell ACT what's around you — materials, time, space — and ACT gives you a project you can start right now, then walks you through it step by step.

## The core experience

1. **ACT asks** — "Got some free time? Tell me what's around you."
2. **ACT suggests** — real projects based on your time, materials, and space
3. **ACT coaches** — step by step, until you finish something

## Project categories

- **Make** — builds, woodworking, useful things from materials
- **Improve** — home upgrades, organization, practical fixes
- **Grow** — gardening, herbs, outdoor projects
- **Create** — crafts, handmade items, decorative things

## Stack

- **Mobile**: React Native (Expo SDK 51), TypeScript
- **API**: Node.js 20, Express, TypeScript, Prisma, PostgreSQL, Redis
- **AI**: Claude (claude-sonnet-4-6) via Anthropic SDK

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
