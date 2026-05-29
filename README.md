# ACT

**Your best HVAC techs train the next generation without writing documentation.**

ACT Capture turns ride-alongs and senior service calls into reviewed training objects — short clips of a teachable moment, paired with the expert's reasoning, the novice traps to avoid, the safety boundaries, and a quick quiz to check transfer.

The core invention is not smart glasses, a live AI copilot, or a generic training app. It is the tacit knowledge engine: detect teachable events in the field, ask the expert the right question at a safe time *after* the job, structure the answer into a reviewed training object, publish it, and measure whether apprentices actually improve.

The product loop is:

> **Capture → Detect → Ask → Structure → Review → Teach → Improve**

## Current wedge: HVAC

First trade is HVAC residential/commercial troubleshooting — no-cool, no-heat, refrigerant, compressor, airflow, electrical faults.

Why HVAC:
- Tight feedback loops — no-cool / no-heat is a repeated controlled event
- Measurable outcomes — first-time fix rate, callbacks, time-to-diagnosis
- Rich tacit signals — sound, vibration, line temp, frost patterns, gauge readings
- BLS: [425,200 jobs in 2024, 8% projected growth from 2024-2034, and about 40,100 openings per year](https://www.bls.gov/ooh/installation-maintenance-and-repair/heating-air-conditioning-and-refrigeration-mechanics-and-installers.htm)

Adjacent-market signal, not the first wedge:
- USDA's 2022 Census of Agriculture reported average U.S. producer age at [58.1](https://www.nass.usda.gov/Newsroom/2024/02-13-2024.php), with producers under 35 comprising [9%](https://www.nass.usda.gov/Newsroom/2024/02-13-2024.php) of all producers.
- ABC estimated construction needs [439,000 net new workers in 2025 and 499,000 in 2026](https://www.abc.org/News-Media/News-Releases/abc-construction-industry-must-attract-439000-workers-in-2025); this is ABC's proprietary model, not a government statistic.

Earlier electrician customer-discovery work is preserved as input but is not the first pilot target. Existing electrical prompts and KB entries stay in the codebase behind a `trade` flag during the migration — they are not being deleted.

## The Capture flow

1. **Record** — senior tech starts a job recording from their phone
2. **Mark** — they tap "mark this" at teachable moments (one-handed, glove-friendly)
3. **Detect** — backend processing proposes expertise-rich moments from transcript, marks, frames, and job context
4. **Ask** — after the job, ACT asks targeted why/how/counterfactual/safety questions
5. **Structure** — clip + situation + observation + expert reasoning + novice trap + safety + quiz become one training object
6. **Review & publish** — a lead tech approves before it goes into the apprentice library
7. **Teach & improve** — apprentice quiz results and job outcomes close the loop

## Product guardrails

- Do not build custom hardware first. Use phones, GoPros, chest mounts, or existing smart glasses until the software workflow proves what hardware is missing.
- Do not position ACT as surveillance. The expert controls capture, can mark moments, can delete or reject, and approves what enters the training library.
- Do not keep everything. Keep diagnostic shortcuts, sensory cues, counterfactuals, novice traps, threshold judgments, safety boundaries, repair verification, and customer/context reads.
- Do not automate everything on day one. The first serious MVP is human-marked moments plus AI-generated training cards; automatic moment detection expands after the loop proves value.

## Current MVP status

| Spec principle | Current state |
| --- | --- |
| HVAC wedge | Implemented in docs, app copy, seeded training card, and pilot shell. |
| Capture from phone | Implemented in `CaptureJobScreen` with camera/audio recording, consent state, marks, upload queue, and retry. |
| Moment marking | Implemented with explicit mark types: teachable, safety, verification, sensory, counterfactual. |
| Safe post-job review | Implemented as `PilotReviewScreen`; current mobile copy focuses on review/publish after capture. |
| Structured training cards | Implemented in `LearnScreen` and mobile API calls for compile/publish. |
| Expert approval | Implemented as mobile review actions before publish. |
| Apprentice library + quiz | Implemented with live library search plus seeded HVAC demo card and quiz. |
| Outcome tracking | Backend model exists in `act-api`; mobile UX is not built yet. |
| Fully automatic moment detection | Not a day-one requirement; backend proposed moments are supported, but human marks remain the MVP control. |

## Repo layout

This repo contains the **mobile client only**. The backend lives in a sibling repo.

- `apps/mobile` — React Native Expo app
  - `App.tsx` — pilot shell for the Capture → Review → Training flow
  - `src/screens/CaptureJobScreen.tsx` — capture-mvp flow: record, mark teachable moments, upload with retry
  - `src/screens/PilotReviewScreen.tsx` — mobile review handoff for proposed moments from a recording
  - `src/screens/PilotHomeScreen.tsx` — pilot menu for recording senior-tech jobs and opening apprentice training
  - `src/screens/LearnScreen.tsx` — apprentice-facing published-card library with a seeded HVAC demo card
  - `src/screens/AskActScreen.tsx` — earlier photo → question → Claude diagnosis slice; kept in source but outside the pilot shell
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

On `capture-mvp`, the app launches into the HVAC training-capture shell: Record senior tech → Review moments → Apprentice training. `AskActScreen` (single photo → question → streamed Claude answer) remains in source as legacy code, but it is not part of the pilot shell. The legacy multi-screen flow (Boot / Onboarding / Paywall / Home / Project) is preserved in source but is no longer the app entry point.

## Backend (sibling repo)

See [Evode-Manirahari/act-api](https://github.com/Evode-Manirahari/act-api) for the FastAPI service the mobile slice talks to.

## Environment

Mobile reads the API base URL through `apps/mobile/src/lib/config.ts`. Set `EXPO_PUBLIC_API_BASE_URL` for local or preview environments; otherwise it falls back to `https://act-api-evode.fly.dev`. Backend env vars live in `act-api/.env` — see `act-api/.env.example`.

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

## ACT agent memory (gbrain)

This repo is wired for [garrytan/gbrain](https://github.com/garrytan/gbrain) in the ACT agent context.

- Codex MCP server: `gbrain`
- Command: `/Users/evodemanirahari/.bun/bin/gbrain serve`
- ACT source id: `gstack-code-act-b3325446`
- Repo policy: `read-write`
- Worktree pin: `.gbrain-source` (ignored by git)

Use gbrain for semantic or symbol-based questions:

```bash
gbrain search "<terms>"
gbrain query "<question>"
gbrain code-def <symbol>
gbrain code-refs <symbol>
gbrain code-callers <symbol>
gbrain code-callees <symbol>
```

Use `rg` for exact strings, regexes, file globs, and small local checks.

## License

MIT — see [LICENSE](LICENSE).
