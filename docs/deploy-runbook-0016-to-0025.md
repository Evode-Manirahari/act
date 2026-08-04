# Release Runbook — production `0016` → `0025`

*Prepared 2026-08-03. Rehearsed end-to-end against a production-shaped database.
**Not executed.** Production deploy is a founder gate.*

This is the deploy that closes the fabricated-card incident in the field. Until
it runs, [the truth ledger](truth-ledger.md) row 2 stays `IMPLEMENTED — NOT
DEPLOYED` and production remains the version of the system that had the incident.

---

## 1. Rehearsal evidence (already done)

A local Postgres 16 was built to the **exact deployed schema (`0016`)**, seeded
with production-shaped data — 114 jobs, 22 recordings (11 pending / 8 ready /
3 failed), 5 moments (4 approved / 1 rejected), the 5 echoed non-human expert
answers, 4 processing jobs (2 failed / 2 succeeded), 2 transcripts, 0 cards —
then migrated.

| Step | Result |
|---|---|
| Forward `0016 → 0025` (9 migrations) | ✅ **2s**, no errors |
| Row counts after migration | ✅ preserved exactly (114 / 22 / 5 / 5 / 4 / 2) |
| Backfill `recordings.capture_class` | ✅ `unknown` on all 22 |
| Backfill `expert_answers.author_verified` | ✅ `false` on all 5 |
| Backfill `expert_answers.content_source` | ✅ `unknown` on all 5 |
| Backfill `processing_jobs.job_type` | ✅ `process_recording` on all 4 |
| Invariant indexes created | ✅ one-active-job-per-recording, one-card-per-moment |
| New tables | ✅ `capture_attestations`, `evidence_invalidations` |
| `server_default` dropped after backfill | ✅ all four columns (new writes must be explicit) |
| Rollback `0025 → 0016` | ✅ **1s**, all data intact |
| Re-upgrade after rollback | ✅ repeatable, 9 migrations |
| Boot `alembic upgrade head && uvicorn` | ✅ healthy in **4s** |
| Smoke `/health`, `/health/capture`, `/library/search`, `/dashboard/summary` | ✅ all `200` |
| `/library/search` contents | ✅ `[]` — no fabricated content |

**The decisive test.** Compiling one of the 4 approved moments — the exact path
that produced the five fabricated cards — was refused:

```
HTTP 409
capture_not_attested, missing_capture_timestamp, no_captured_evidence,
expert_answer_not_human_authored, expert_answer_echoes_prompt
```

Zero cards created. Fail-closed, with structured reasons rather than a bare
false. This is the incident closing.

## 2. Pre-flight against real production (already run, read-only)

Both operations that could hard-fail a boot-time migration were checked against
live production data:

| Check | Result |
|---|---|
| `0024` partial unique index — duplicate queued/running job per recording | **clear** (0 rows; prod has only 2 failed + 2 succeeded) |
| `0025` unique index — duplicate card per moment | **clear** (0 cards) |
| Orphan FKs (moments→recordings, answers→questions, recordings→jobs) | **0 / 0 / 0** |
| Database size | **8.9 MB** — backup and restore are near-instant |

Re-run the pre-flight immediately before deploying if any capture activity has
happened since.

---

## 3. The risk that shapes this runbook

`Dockerfile` line 25:

```
CMD sh -c "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8080"
```

**Deploying migrates automatically on boot.** Two consequences:

1. If a migration fails, `uvicorn` never starts and the machine crash-loops.
   Postgres DDL is transactional, so the *failing* migration rolls back cleanly,
   but earlier ones stay committed — leaving the DB at an intermediate revision.
2. **Reverting the image alone will not recover you.** The old image's
   `alembic/versions/` stops at `0016`. If the database is at `0021` and you roll
   the image back, alembic cannot locate revision `0021` and the *old* image
   crash-loops too.

> **Rollback order is therefore: downgrade the database first, then revert the
> image.** And because a crash-looping machine may not accept `ssh console`, run
> the downgrade **from your laptop** against the production `DATABASE_URL` — that
> path is proven to work (it is how the rehearsal ran).

---

## 4. Deploy procedure

**Step 0 — back up.** Pick one:
- *Preferred:* create a Neon branch from the current head (instant PITR snapshot,
  no data leaves the provider), or
- `pg_dump` to a file you control. At 8.9 MB this takes seconds. Prefer running
  it on the Fly machine over pulling pilot data to a laptop.

Record the backup id/path in the release ledger below **before** step 1.

**Step 1 — capture the rollback point.**
```bash
flyctl releases  -a act-api-evode          # note the current version number
flyctl status    -a act-api-evode          # note the current image digest
```

**Step 2 — re-run the pre-flight** (section 2) and confirm both blockers clear.

**Step 3 — deploy.**
```bash
cd ~/act-api
flyctl deploy -a act-api-evode
```
Watch the release logs. The migration runs before the server binds; expect it to
complete in seconds at this data size.

**Step 4 — verify (do not skip; this is what promotes the ledger row).**
```bash
flyctl ssh console -a act-api-evode -C "sh -c 'cd /app && alembic current'"   # expect 0025 (head)
curl -s -o /dev/null -w '%{http_code}\n' https://act-api-evode.fly.dev/health
curl -s -o /dev/null -w '%{http_code}\n' https://act-api-evode.fly.dev/health/capture
curl -s https://act-api-evode.fly.dev/library/search                          # expect []
```

**Step 5 — update [the truth ledger](truth-ledger.md)**: row 2 moves from
`IMPLEMENTED — NOT DEPLOYED` to `DEPLOYED`, naming the SHA, migration head, and
smoke result. Fill in the release ledger below.

---

## 5. Rollback procedure

Trigger if: migration fails, health checks do not go green, or `/library/search`
returns anything unexpected.

```bash
# 1. DATABASE FIRST — run locally; works even if the machine is crash-looping.
cd ~/act-api
DBURL=$(flyctl ssh console -a act-api-evode -C "printenv DATABASE_URL" | tr -d '\r\n')
DATABASE_URL="$DBURL" uv run alembic downgrade 0016     # rehearsed: 1s, data intact

# 2. THEN the image.
flyctl releases rollback -a act-api-evode               # or deploy the noted digest
```

Verify: `alembic current` → `0016`, health `200`, row counts unchanged.

Do **not** revert the image before the downgrade — see section 3.

---

## 6. Immediately after a successful deploy

`0021` (evidence invalidation) becomes live, which unlocks the step that closes
the *cause* rather than the output:

```bash
# withdraw the fabrication source chain so it can never be recompiled
uv run python scripts/invalidate_evidence.py            # dry run first
```

Target: the **4 approved moments** and **5 echoed expert answers** still present
in production. Deleting the five cards removed the output; this removes the
system's ability to rebuild them. Use `invalidate_evidence.py`, **not**
`purge_fabricated_cards.py` — that script is historical and guards against reuse.

Then, still before any pilot user exists: configure `SUPABASE_URL` and
`AUTH_REQUIRED=true` (truth ledger row 7 — production currently accepts
anonymous writes).

---

## 7. Release ledger — fill at deploy time

| Field | Value |
|---|---|
| Environment | production (`act-api-evode`) |
| Backend commit | `07e89a3` (verify at deploy time) |
| Image digest deployed | |
| Previous image digest (rollback point) | |
| Migration head before / after | `0016` → `0025` |
| Backup id / path | |
| Frontend build | *unchanged — PR #70 not merged* |
| Auth mode | `SUPABASE_URL` unset, `AUTH_REQUIRED` unset (**unchanged by this deploy**) |
| Provider readiness | R2 ✅ · Deepgram ✅ · Anthropic key set, **credits unverified** |
| Tests at deploy commit | 452 passing |
| Smoke result | |
| Known incompatibilities | Mobile main assumes pre-0020 API; do not ship a mobile build against this backend until PR #70 is merged and device-verified |
| Rollback command | `alembic downgrade 0016` (local, first) → `flyctl releases rollback` |
| Approved by / time | |

---

## 8. What this deploy does *not* do

- It does **not** turn auth on. Anonymous writes remain accepted until Supabase is configured.
- It does **not** invalidate the existing bad evidence — that is section 6, a separate deliberate step.
- It does **not** make mobile compatible. PR #70 is still open and unverified on a device.
- It does **not** create field evidence. Capture Week remains the binding constraint, and the corpus is still zero eligible episodes.
