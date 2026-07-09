# ACT HVAC Pilot Go-Live

This is the concrete path to put ACT in front of the first HVAC design
partner without turning the pilot into a platform rebuild.

## What Is Already Live-Ready

- Capture: mobile records jobs, marks teachable moments, uploads with retry.
- Human gate 1: lead tech approves or rejects proposed moments.
- Auto-chain: approved moment queues a debrief question; answered question queues compile, safety review, and grounding.
- Expert notification: mobile shows the senior tech a waiting debrief count and an answer screen.
- Agent 6 v1: guided turn-based voice debrief is available in the senior-tech debrief path; LiveKit real-time voice remains optional infrastructure.
- Agent 9: Ask ACT answers only from published cards with citations and refuses live job diagnosis.
- Web portal: `/learn` in the admin app gives browser access to published lessons and Ask ACT.

## Deployment Shape

### 1. Backend API on Fly.io

Existing app: `act-api-evode.fly.dev`.

Required production secrets:

- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `DEEPGRAM_API_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`
- `AUTH_REQUIRED=true` when Supabase pilot users are provisioned
- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET`

Optional Agent 6 real-time voice:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

Deploy:

```bash
cd ../act-api
flyctl deploy
```

After deploy:

```bash
curl https://act-api-evode.fly.dev/health
curl https://act-api-evode.fly.dev/health/capture
```

### 2. Admin + Web Lessons on Vercel

Deploy the existing Next app at `apps/admin`.

Required Vercel env vars:

- `NEXT_PUBLIC_ACT_API_BASE_URL=https://act-api-evode.fly.dev`
- `ADMIN_PASSWORD`

Recommended once Supabase users exist:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `ADMIN_SUPABASE_EMAIL`
- `ADMIN_SUPABASE_PASSWORD`

Routes to hand to the client:

- `/` - lead-tech review queue
- `/library` - published card browser
- `/learn` - apprentice lesson portal with Ask ACT

### 3. Mobile Pilot Build

Use a development or preview EAS build for the first client, not the public app
stores.

Required Expo env vars:

- `EXPO_PUBLIC_API_BASE_URL=https://act-api-evode.fly.dev`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_REQUIRE_AUTH=true`

Pilot distribution:

- iOS: TestFlight or EAS internal distribution.
- Android: EAS internal distribution APK/AAB.

## First Client Operating Loop

1. Create the operator account and users in act-api/Supabase.
2. Give the senior tech mobile access.
3. Give the lead tech the web review URL.
4. Give apprentices `/learn`.
5. Run one shop practice capture before a real customer job.
6. First week target: 3 recorded jobs, 5 published cards, 2 apprentice lesson completions.

Optional: wire OpenClaw as the pilot notification/control channel after the
core app loop works. See [`docs/openclaw.md`](openclaw.md). Keep OpenClaw to
operator notifications such as waiting debrief questions, published lessons,
and weekly pilot reports; do not use it for live field diagnosis.

## Market Path

Do not launch a broad self-serve product yet. Sell the first version as a
concierge HVAC pilot.

Offer:

- 60-day paid pilot.
- One HVAC branch or operator.
- One senior tech, one reviewer, two to five apprentices.
- Target: 20 captured jobs and 50 reviewed cards.
- Price signal: $4k to $5k flat pilot fee.

Buyer pitch:

> ACT captures how your best HVAC techs diagnose real jobs, turns those moments
> into reviewed company-specific training cards, and measures whether new techs
> are learning the judgment that cuts callbacks.

Do not position this as live AI advice in the field. The product is post-job
expertise capture plus reviewed training.

## What Not To Build Before The First Pilot

- A multi-agent orchestration framework.
- Public self-serve signup.
- A generic HVAC content catalog.
- Fully real-time LiveKit voice as a blocker.
- Role-based enterprise admin beyond the current shared-password gate plus Supabase-backed act-api attribution.

The first pilot is won by the loop working end to end: capture, approve,
debrief, publish, learn, measure.
