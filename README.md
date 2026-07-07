# ACT — Actober AI

**Your best HVAC techs retire. Their judgment doesn't have to.**

ACT captures how senior technicians diagnose real jobs — from the truck, in their own words — and turns it into reviewed, company-specific training that cuts callbacks and gets new hires billable on your own install base.

> "Generic training teaches your new hire what a capacitor is. It can't teach them how your lead tech, who retires in 14 months, fixes the recurring fault at your three biggest commercial accounts. We capture that, before he leaves, and put it on every truck."

The expert never writes a word. AI works behind the scenes — detecting the teachable moment, asking the right question after the job, compiling the lesson, pre-checking safety — and a lead tech approves everything before an apprentice ever sees it.

> **Capture → Detect → Ask → Structure → Review → Teach → Measure**

## The training object

Every published lesson carries the same anatomy — the cue, the reasoning, the trap, the safety line, a quiz:

<!-- TODO: replace with a real app screenshot of a published card -->

> ### Frost on the suction line means airflow first, not charge
>
> `CALLBACK AVOIDED · COMPRESSOR PROTECTED`
>
> **The expert's reasoning** — Low charge frosts too, but it wouldn't leave the return warm. Warm return plus frost is starved airflow. Check the filter and static pressure before touching refrigerant.
>
> **Novice trap** — ✕ Adding refrigerant to a starved coil: overcharges the system and slugs the compressor.
>
> **⚠️ SAFETY BOUNDARY** — Recover the refrigerant before opening any line. Do not vent — EPA 608.
>
> **Quiz** — Frost with a warm return points to? *(Restricted airflow)*

*(Example card — the same anatomy renders in the mobile Learn library, the web lessons portal, and the [marketing site](apps/site).)*

## What works today

The full loop runs end to end against the deployed backend (`https://act-api-evode.fly.dev`):

- **Capture** — one-button, glove-friendly job recording with "mark this" taps, consent selector, and offline upload retry/resume
- **Detect** — durable Postgres-queued pipeline: frame extraction, Deepgram transcription, moment detection (rules + Claude re-ranking)
- **Ask** — the pipeline runs itself between the two human gates: an approved moment drafts its own debrief question; the senior tech's phone shows *"1 waiting"*; they answer in 30 seconds of voice (or a guided voice debrief) or text
- **Structure** — the answer compiles into a training card with safety review and evidence-grounding checks pre-run
- **Review & publish** — lead-tech approval gates in mobile and the web admin; nothing publishes itself
- **Teach** — mobile Learn library with quizzes, a web lessons portal (`/learn`), and **Ask ACT**: answers drawn only from published cards, with citations — it refuses live job diagnosis
- **Measure** — per-job outcomes (first-time fix / callback), a live ops dashboard, and a weekly operator report
- **Trust** — invite-only auth across mobile, backend, and admin (activation is config-only); per-account tenant isolation; customer-requested redaction and purge

## Who buys ACT, and the dollar it moves

ACT's **users** are the senior tech (capture), the lead tech (review), and the apprentice (learn). ACT's **buyer** is the ops director / regional service director at a **multi-site operator or consolidator** — the ARS, CoolSys, Service Champions, and franchise-network operators of the world. Not solo shops.

That buyer already tracks the dollars ACT moves:

- **Callbacks** — industry-average first-time-fix is ~80%; a typical callback runs [~$650 (ACCA)](https://hvac-blog.acca.org/the-true-cost-of-callbacks-and-how-to-stop-the-bleeding/), and two of the named top-five callback causes are *inadequate documentation* and *gaps in technician knowledge*.
- **First-90-day turnover** — most tech attrition happens in the first 30–90 days; [replacing a tech costs 100–150% of salary](https://applausehq.com/blog/how-retaining-your-home-services-technicians-saves-thousands-vs-hiring).
- **Ramp** — [new hires take 6–12 months to full productivity](https://thebluecollarrecruiter.com/hvac-technician-turnover-costs-jacksonville-the-real-cost-of-hvac-technician-turnover-a-jacksonville/); the first three months alone burn salary against partial output.

When a senior tech retires, the company-specific reasoning that prevents callbacks on *that operator's own install base* walks out the door. ACT captures it first.

## Where ACT sits (vs. generic training)

Generic simulation training (e.g. [Interplay Learning](https://www.interplaylearning.com/industries/hvac/)) teaches the textbook: how a heat pump works, how to braze, how to troubleshoot a *typical* system. ACT does not compete there — it is the layer on top, capturing what a generic catalog structurally cannot hold: how *your* best tech diagnoses *your* hardest jobs on *your* accounts. That non-genericness is the moat.

**Go-to-market**: a **60-day paid concierge pilot** — one operator, one senior/retiring tech, ~20 company-specific training cards on real callback-prone accounts, measured against the operator's own callback and ramp numbers — proving willingness to pay before building self-serve.

## Current wedge: HVAC

First trade is HVAC residential/commercial troubleshooting — no-cool, no-heat, refrigerant, compressor, airflow, electrical faults.

- Tight feedback loops — no-cool / no-heat is a repeated, controlled event
- Measurable outcomes — first-time fix rate, callbacks, time-to-diagnosis
- Rich tacit signals — sound, vibration, line temp, frost patterns, gauge readings
- BLS: [425,200 jobs in 2024, 8% projected growth through 2034, ~40,100 openings per year](https://www.bls.gov/ooh/installation-maintenance-and-repair/heating-air-conditioning-and-refrigeration-mechanics-and-installers.htm)

**Beyond HVAC** (expansion signal, not the wedge): the same retirement wave hits every trade — [average U.S. farm producer is 58.1 years old (USDA)](https://www.nass.usda.gov/Newsroom/2024/02-13-2024.php); [construction needs ~439k net new workers in 2025 (ABC estimate)](https://www.abc.org/News-Media/News-Releases/abc-construction-industry-must-attract-439000-workers-in-2025). Earlier electrician discovery work is preserved behind a `trade` flag.

## Product guardrails

- **No custom hardware first.** Phones and chest mounts until the software workflow proves what hardware is missing.
- **Not surveillance.** The expert controls capture, marks the moments, can delete or reject, and approves what enters the library.
- **Don't keep everything.** Keep diagnostic shortcuts, sensory cues, counterfactuals, novice traps, threshold judgments, safety boundaries, verification, and customer/context reads.
- **Humans keep the judgment.** Moment approval and publish are human gates — the automation runs *between* them, never around them.

---

## Repo layout

This repo contains the mobile client, web admin, and marketing site. The backend lives in a sibling repo.

- `apps/mobile` — React Native Expo app (capture, review, debrief, learn, outcomes)
  - `src/screens/CaptureJobScreen.tsx` — record, mark teachable moments, upload with retry
  - `src/screens/DebriefScreen.tsx` — the expert's answer surface: pending questions, voice/text answers, guided voice debrief
  - `src/screens/PilotReviewScreen.tsx` / `PilotHomeScreen.tsx` / `LearnScreen.tsx` / `PilotOutcomeScreen.tsx`
  - `src/api/captureApi.ts`, `src/api/libraryApi.ts` — typed clients for the deployed backend
- `apps/admin` — Next.js pilot admin: review queue, debrief answers, publish gate, web lessons portal (`/learn`)
- `apps/site` — Actober AI marketing site (static export; store-link slots, privacy, support)
- `packages/act-kb` — field knowledge stubs (electrical entries retained pending HVAC migration)
- [`../act-api`](https://github.com/Evode-Manirahari/act-api) — Python FastAPI backend, deployed at `https://act-api-evode.fly.dev`

## Stack

- **Mobile**: React Native (Expo SDK 54), TypeScript, Zustand
- **Backend** (`act-api/`): Python 3.13, FastAPI, async SQLAlchemy 2.0, Alembic, PostgreSQL; durable Postgres job queue (no Redis)
- **AI**: Claude (Haiku 4.5 for classification/questions, Sonnet 4.6 for compile/safety/reports) via the Anthropic Python SDK; Deepgram `nova-3` speech-to-text
- **Storage**: Cloudflare R2 (video, frames)
- **Auth**: Supabase (invite-only), JWT verification server-side, per-account tenant isolation
- **Monorepo**: pnpm workspaces

## Run the mobile slice

```bash
pnpm install
cd apps/mobile && pnpm start
```

Then on your phone:
1. Install **Expo Go** ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Make sure phone and Mac are on the **same WiFi**
3. Scan the QR code in the terminal, or paste `exp://<lan-ip>:8081` via "Enter URL manually"

Mobile reads the API base URL through `apps/mobile/src/lib/config.ts` — set `EXPO_PUBLIC_API_BASE_URL` for local dev; otherwise it falls back to the deployed backend. Backend env vars: see `act-api/.env.example`. Pilot deployment path: [`docs/hvac-pilot-go-live.md`](docs/hvac-pilot-go-live.md).

## Product framing (do not drift)

- **Say (buyer value)**: "Cut callbacks and ramp new hires faster by capturing your senior techs' company-specific reasoning before they retire."
- **Say (user value)**: "Your senior techs pass on what they know without writing a word — captured from real jobs, in their own words."
- **Do not say**: "AI tells techs what to do in real time." (retired copilot framing)
- **Do not say**: "Train the next generation" / generic apprentice training sold to solo shops. (the incumbent's hill — ACT loses there)

## Engineering workflow

AI-assisted workflow tooling (gstack skills, gbrain memory) is documented in [`docs/internal-tooling.md`](docs/internal-tooling.md).

## License

MIT — see [LICENSE](LICENSE).
