# ACT — TODOS

All three items from the 2026-05-29 `/plan-eng-review` are done:

- **Replace hardcoded PilotHome stats** — done 2026-06-09 (act#37, live
  `/dashboard/summary` counts).
- **Remove the legacy copilot surface** — done 2026-06-09 (act#38 +
  act-api#18, including dropping the `turns`/`frames` tables).
- **Durable job queue for the recording pipeline** — done 2026-06-10
  (act-api#20). Built on Postgres (`processing_jobs` + SKIP LOCKED +
  heartbeat/reclaim + backoff retries), not Redis: same durability,
  zero new infra at one-operator volume. Revisit a dedicated
  Redis/worker split when a second operator lands or ffmpeg starts
  starving the web process.

Engineering is not the gate. The gate is demand: an ops director asking
"what would this cost me" unprompted.
