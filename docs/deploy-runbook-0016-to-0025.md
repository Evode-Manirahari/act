# Release Runbook — production `0016` → `0025`

*Prepared 2026-08-03. Rehearsed against a production-shaped database, then
against the real production dump. Staged 2026-08-06.
**EXECUTED 2026-08-07** — production is `v20` at migration `0025`, health green.
See section 7 for the filled ledger and the post-deploy verification.*

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
| `server_default` dropped after backfill | ✅ three of four (`capture_class`, `author_verified`, `content_source`). `processing_jobs.job_type` keeps its `0017` default by design — corrected 2026-08-06, see section 7 |
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

**Staged 2026-08-06, executed 2026-08-07.** Production is `v20` at `0025`.

| Field | Value |
|---|---|
| Environment | production (`act-api-evode`) |
| Backend commit | `07e89a3` ✅ verified — image-relevant paths (`app/`, `alembic/`, `alembic.ini`, `pyproject.toml`) are clean against `main` |
| Image digest deployed | `deployment-01KZEFTTVKNWAP8E6P18JK2E3K` → **`sha256:35b0a001fca6d9f7facedbcc54ad9d999208fe4a49fd61e908006bac59b9e21d`** (293 MB). **Byte-identical to the image staged on 2026-08-06** — the build was a full cache hit, so what shipped is exactly what was rehearsed. This also closes the unpinned-dependency concern for *this* release: `pip install .` never re-resolved |
| Previous image digest (rollback point) | `v19` · `deployment-01KWCXVW9GFS2A7BGGVNABMJM4` → `sha256:37e47897b5975ce2bc1b70f7ef855f7b396e58afab9014aefde0c67c47236b9d` |
| Migration head before / after | `0016` → `0025` |
| Backup id / path | `pg_dump` 2026-08-06T20:19:30Z → `~/act-backups/act-prod-0016-20260806T201930Z.sql` (102 KB, mode 600). Verified: 18 tables, `alembic_version=0016`, counts match pre-flight. **Restore needs a psql ≥17** (dump carries `\restrict`): `docker run --rm -i postgres:17 psql "$URL" < file.sql`. A Neon branch is still the better backup and needs `neonctl auth` (interactive) |
| Frontend build | act PR **#70 merged** 2026-08-03 (`106039d`). **Not device-verified** |
| Auth mode | `SUPABASE_URL` unset, `AUTH_REQUIRED` unset — re-confirmed 2026-08-06 via `fly secrets list` (**unchanged by this deploy**) |
| Provider readiness | R2 ✅ · Deepgram ✅ · Anthropic key set, **credits still unverified** |
| Tests at deploy commit | **452 passing** ✅ — 443 on SQLite + the 9 `test_concurrency_pg.py` tests, which *skip* unless a Postgres is reachable. Run them: `TEST_POSTGRES_URL=postgresql+asyncpg://…  pytest tests/test_concurrency_pg.py`. They cover the two races `0024`/`0025` exist to close, so a bare `pytest` (443 passed, 9 skipped) does **not** verify this deploy |
| Smoke result | **post-deploy: `/health` 200, `/health/capture` 200, `/library/search` `[]`** (identical to the pre-deploy baseline). Machine `d8930e0b051658` on version 20, `started`, 1/1 health check passing |
| Known incompatibilities | Mobile main assumes pre-0020 API. #70 is merged, so the ordering is now: **deploy backend first, then device-verify #70 against it** — a mobile build shipped before this deploy hits a backend without 0020+ |
| Rollback command | `alembic downgrade 0016` (local, first) → `flyctl releases rollback` |
| Approved by / time | Evode, 2026-08-07 ~16:10 UTC (`v20`, "3m9s ago" at first verification) |

### Staging record, 2026-08-06

**Pre-flight (section 2) re-run against live production — CLEAR.**

| Check | Result |
|---|---|
| Migration head | `0016` (confirmed via `alembic current` on the machine) |
| `0024` blocker — >1 active `process_recording` job per recording | clear |
| `0025` blocker — >1 card per moment | clear |
| Orphan FKs (6 relations checked) | 0 / 0 / 0 / 0 / 0 / 0 |
| Drift vs the 2026-08-03 ledger snapshot | **none** — 114 jobs · 22 recordings (11/8/3) · 5 moments (4 approved, 1 rejected) · 5 expert answers · 0 cards · 4 processing jobs · 2 transcribed |
| Latest write in production | `recordings` 2026-07-12; nothing since |
| Database size | 8912 kB · Neon · PostgreSQL 17.10 |

Note for re-running: `processing_jobs.job_type` does not exist until `0023`, so
the `0024` check must omit that filter pre-deploy (every row at `0016` is
implicitly a `process_recording` job).

**Dress rehearsal on the real production dump (local, zero production risk).**
Stronger than the 2026-08-03 rehearsal, which used production-*shaped* seed
data. This one restored the actual dump above into Postgres 17 and migrated it:

| Step | Result |
|---|---|
| Restore real dump → `0016` | ✅ counts exact |
| Forward `0016 → 0025` (9 migrations) | ✅ no errors |
| Row counts after migration | ✅ preserved exactly (114 / 22 / 5 / 5 / 4 / 25 segments / 0 cards) |
| Backfills | ✅ `capture_class=unknown` ×22 · `author_verified=false` ×5 · `content_source=unknown` ×5 · `job_type=process_recording` ×4 |
| New tables | ✅ `capture_attestations`, `evidence_invalidations` |
| Invariant indexes | ✅ both created |
| Rollback `0025 → 0016` | ✅ <1s, all rows intact |
| Re-upgrade after rollback | ✅ repeatable |
| Boot + smoke on migrated real data | ✅ `/health` 200, `/health/capture` 200, `/library/search` `[]` |

**The decisive test, on the real rows.** Compile was attempted against all four
`approved` production moments — the exact chain that produced the five
fabricated cards. All four refused:

```
HTTP 409  evidence is not verified field capture; cannot compile
(capture_not_attested, expert_answer_not_human_authored,
 expert_answer_echoes_prompt, evidence_invalidated)
```

Zero cards created. The reason set differs from the 2026-08-03 rehearsal
(`evidence_invalidated` instead of `missing_capture_timestamp` /
`no_captured_evidence`) because the real rows *do* carry capture timestamps and
evidence — they are refused for being invalidated and non-human-authored, which
is the stronger and more accurate refusal.

**Two corrections this rehearsal forced into this document:**

1. **Section 1 overstated the `server_default` row.** `processing_jobs.job_type`
   keeps its default — it comes from `0017` and is deliberate; nothing in
   `0017`–`0025` drops it. Only three of the four backfilled columns end up
   requiring explicit writes.
2. **Section 6 is largely already done by the deploy.** Migration `0021`
   inserts the invalidation rows itself (`INSERT … SELECT`, reason code
   `exp1_corpus_autopsy_fabricated_evidence`). Against real production data it
   created **10 rows — 5 moment-scope + 5 recording-scope** — which is why
   compile now refuses. Running `invalidate_evidence.py` for the Exp1 chains
   afterwards is therefore **not required**; the script stays the tool for
   *future* rulings. Verify the 10 rows post-deploy instead.

### Post-deploy verification, 2026-08-07

| Check | Result |
|---|---|
| Release | `v20` complete; machine `d8930e0b051658` version 20, `started`, 1/1 passing |
| `alembic current` on the machine | **`0025 (head)`** |
| Smoke | `/health` 200 · `/health/capture` 200 · `/library/search` `[]` |
| Pre-flight re-run post-deploy | head `0025` (already deployed), both blockers clear, 6/6 orphan relations at zero |
| Invalidation rows (corrected section 6) | **10 — 5 `moment` + 5 `recording`**, reason `exp1_corpus_autopsy_fabricated_evidence`, exactly as the rehearsal predicted |
| `capture_class` backfill | `unknown` ×22 |
| Cards | still **0** |
| Totals | 114 jobs · 22 recordings · 5 moments · 5 expert answers — unchanged |

**One status change, and it is the new code working.** The recording split moved
from 11 `pending` / 8 `ready` / 3 `failed` to **0 / 8 / 14**. The 11 that had sat
`pending` since the Exp1 autopsy were resolved by the stale-recording sweeper
(`0023`) and now carry a terminal reason:

```
upload never completed: no object in storage after 1800s
```

Nothing was lost — the total is still 22, and the original 3 failures keep their
null reason. This is the sweeper doing precisely what `0023` exists for: a dead
capture is now *visible* rather than merely quiet, and it independently confirms
the autopsy's finding that 11 of 22 recordings died at upload. Any future
pre-flight run should expect `0 / 8 / 14`, not the 2026-08-03 numbers.

**Not re-tested in production:** the live compile-refusal `409`. It was proven
against this exact data and this exact image during the rehearsal, and the 10
invalidation rows above are the state that produces it. Re-testing it in
production means POSTing to the fabrication path against real rows — worth doing
deliberately, not as a smoke test.

---

## 8. What this deploy does *not* do

- It does **not** turn auth on. Anonymous writes remain accepted until Supabase is configured.
- It does **not** device-verify mobile. #70 is merged but has never run against a real backend on hardware.
- It does **not** create field evidence. Capture Week remains the binding constraint, and the corpus is still zero eligible episodes.

It *does* invalidate the existing bad evidence — see correction 2 above. That
was previously listed here as a separate manual step.
