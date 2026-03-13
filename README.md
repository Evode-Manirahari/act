# Actober

**Act on what you see.**

Real-time AI coaching for skilled trade workers. A worker wears a camera on-site — ACT sees what they see and coaches them through the job, live and hands-free.

## First vertical: Electricians

## Stack
- **Mobile**: React Native (Expo SDK 51), TypeScript
- **API**: Node.js 20, Express, TypeScript, Prisma, PostgreSQL, Redis
- **AI**: OpenAI GPT-4o (vision + text) + Whisper (voice)

## Setup

```bash
pnpm install
docker-compose up -d
cd apps/api && pnpm prisma migrate dev
pnpm dev:api
pnpm dev:mobile
```
