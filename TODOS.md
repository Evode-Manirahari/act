# ACT — TODOS

Deferred work, with the reasoning preserved. None of these block the 60-day
concierge pilot (decision: ship existing code as-is, measure by hand). Captured
from `/plan-eng-review` on 2026-05-29.

## P3 — Durable job queue for the recording pipeline

- **What:** Replace the in-process FastAPI `BackgroundTask` that runs the capture
  pipeline (`app/routes/recordings.py:242` → `app/services/processing.py`) with a
  durable job queue using the Redis already declared in `act-api/app/config.py:18`
  (currently imported nowhere).
- **Why:** The pipeline (ffmpeg audio extract → Deepgram → frame sampling → Claude)
  runs in the web process. If the Fly machine restarts, redeploys, or OOMs on a long
  recording mid-pipeline, that recording is stranded in `processing` forever with no
  retry. Techs lose trust when captures silently vanish.
- **Pros:** Durable, retryable, survives deploys; decouples heavy work from the web
  process so long videos don't compete with request handling.
- **Cons:** Real infra work (~1-2 days); pre-demand if still at one operator.
- **Context:** Accepted operationally for the pilot — at one-operator volume the
  founder watches for stuck recordings and re-POSTs `/recordings/{id}/process`. Build
  this the moment a second operator or higher volume lands. Redis config already
  exists, so the wiring is the work, not the dependency.
- **Depends on:** Nothing. Becomes urgent when pilot expands past one operator.

## P3 — Replace hardcoded stats on PilotHomeScreen

- **What:** `apps/mobile/src/screens/PilotHomeScreen.tsx:12-15` hardcodes
  "3 shops / 20 jobs / 50 cards". Fetch real numbers from `GET /dashboard/summary`
  (already implemented in `act-api/app/routes/library.py`).
- **Why:** The numbers are fake and are leftover old-frame ("3 shops") copy from the
  pre-reframe solo-shop plan. In a live demo to an operator they read as either fake
  or wrong-buyer.
- **Pros:** Demo shows real pilot progress; removes stale old-frame text.
- **Cons:** Trivial; not blocking.
- **Context:** `/dashboard/summary` returns counts already. ~20 min of work.
- **Depends on:** Nothing.

## P3 — Freeze or remove the legacy copilot surface

- **What:** Remove (or clearly quarantine) the dead "live copilot" surface:
  `act-api` `turns.py` (SSE), `demo.py`, ElevenLabs TTS (`tts.py`), and mobile
  `AskActScreen.tsx`, plus the `Turn`/`Frame` models if nothing else references them.
- **Why:** It's not on the capture pilot path and not part of the product anymore
  (the 2026-05-19 pivot retired the live copilot). It's maintenance weight and a
  future dev will waste time figuring out which surface is real.
- **Pros:** Smaller, clearer codebase; one obvious product surface.
- **Cons:** Need to confirm nothing in the capture flow imports `Turn`/`Frame` or
  the SSE helpers before deleting; tests for those surfaces (`test_diagnose.py`)
  would go too.
- **Context:** Explore confirmed these are unreachable from the active `PilotNavigator`.
  Defer until after the pilot so capture work isn't disrupted; do it as a dedicated
  cleanup PR with the test suite as the safety net.
- **Depends on:** Pilot stable; verify no capture-path imports first.
