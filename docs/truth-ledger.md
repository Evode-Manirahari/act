# Actober Truth Ledger

*Standing control against architecture-by-story, per the Actober Systems
Engineering Fieldbook (Appendix K). One row per consequential claim. **No claim
moves up a status without naming the proof.***

**Verified: 2026-08-03.** Every row below was checked against the source that
outranks the others, not against a document. Method:

```
physical work
  > production observation
  > deployed version and configuration
  > repository main and open PRs
  > documents and diagrams
  > prompts and model narratives
```

Status vocabulary: `OBSERVED` · `DEPLOYED` · `IMPLEMENTED` · `PROPOSED` · `HYPOTHESIS`.
`IMPLEMENTED` is **not** customer proof. A tested commit that is not deployed is
a candidate capability, not a capability.

**Re-verified 2026-08-06** against live production: still release `v19` (Jun 30
image) at migration `0016`, `SUPABASE_URL` and `AUTH_REQUIRED` still unset, and
**zero drift** in every row count from the 2026-08-03 snapshot — the last write
of any kind was a recording on 2026-07-12. One row changed on its own evidence
(mobile #70, below); two rows in section 4 were corrected.

**Deployed 2026-08-07.** Production is `v20` at migration `0025`. Rows 2 and 5
move, Risks 1 and 2 close, Risk 3 does not. Post-deploy state, observed directly:
0 cards · 10 evidence invalidations · 114 jobs · 22 recordings · 5 moments (4
approved) · 5 expert answers. **The recording split changed on its own:** 11
`pending` / 8 `ready` / 3 `failed` → **0 / 8 / 14**, because the `0023`
stale-recording sweeper resolved the 11 stuck uploads and wrote them a terminal
reason (`upload never completed: no object in storage after 1800s`). Nothing was
lost; a dead capture is now visible instead of quiet, and it independently
confirms the autopsy's "11 of 22 died at upload." Expect `0 / 8 / 14` from here.

---

## 1. What was actually verified today

| Reality | Evidence captured 2026-08-03 |
|---|---|
| Production migration head | `alembic current` on the Fly machine → **`0016`** |
| Repository migration head | `alembic/versions/` → **`0025`** (nine ahead) |
| act-api `main` | `07e89a3` (book cites `e46f521`; main has moved 2 commits) |
| act-api tests | **452 passed** on main (book cites 443) |
| act `main` | `b8e9199` — matches the book |
| Deployed image | `deployment-01KWCXVW9GFS2A7BGGVNABMJM4`, last deploy **Jun 30 2026** |
| Production auth | `SUPABASE_URL` **unset**, `AUTH_REQUIRED` **unset** → anonymous accepted |
| Production `knowledge_objects` | **0 rows, any status** |
| Production `recordings` | 22 total — 11 `pending`, 8 `ready`, 3 `failed` |
| Production `moments` | 4 `approved`, 1 `rejected` |
| Production `expert_answers` | **5** (the echoed, non-human answers — still present) |
| Recordings with transcript | **2** |
| `training_events` / `job_outcomes` | 0 / 5 |

The fieldbook's own snapshot is already stale in three places. That is the
doctrine working, not a defect in the book: documents lag code, code lags
deployment, deployment lags reality.

---

## 2. The ledger

| Claim | Status | Evidence | Next check | Decision if false |
|---|---|---|---|---|
| The five fabricated cards are gone from production | **OBSERVED** | `knowledge_objects` returns 0 rows of any status; `deletion_audit.md` records ids + timestamp `2026-07-31T18:40:11Z` | After any deploy or recompile | Re-run purge; treat as incident |
| Fabricated evidence **cannot recur** | **DEPLOYED** | Deployed 2026-08-07: `v20`, image `sha256:35b0a001…`, backend `07e89a3`, `alembic current` → **`0025`**, smoke green. `0021` wrote **10 invalidation rows** (5 moment + 5 recording) in production, the state that makes compile refuse. Refusal itself was proven pre-deploy against this exact data and image (`409`, zero cards), **not re-tested live** | After any recompile, and at each new answer | Roll back per the runbook (DB first), treat as incident |
| Real field jobs have been captured | **NOT OBSERVED** | 0 eligible episodes; 22 recordings are app tests (`exclusion_log.md`); nothing new since 2026-07-30 | Daily during Capture Week | Reduce burden or change the capture moment |
| Expert answers are human-authored | **FALSE for existing rows — now inert** | All 5 stored answers are echoed moment metadata (Finding 2). Still present, but since 2026-08-07 they carry `author_verified=false`, `content_source=unknown`, and their chains are invalidated, so compile refuses them | At each new answer | Keep the question pending; never compile |
| Backend main is production | **OBSERVED — true as of 2026-08-07** | prod and main both at `0025`; deployed image built from `07e89a3`. The Jun-30 image is now the rollback point (`sha256:37e47897…`) | Every deploy | Re-open this row the moment main moves ahead again |
| Mobile honest-debrief loop is live | **IMPLEMENTED — NOT VERIFIED** | act PR **#70** merged 2026-08-03 (`106039d`); 266 mobile tests pass; **still never run on a device against a real backend** (re-checked 2026-08-06) | Device walkthrough after the backend deploy | Do not run Capture Week without it |
| Auth protects production writes | **FALSE** | `SUPABASE_URL` and `AUTH_REQUIRED` both unset on the machine | Before inviting any pilot user | No named pilot users until configured |
| Company evidence beats generic model knowledge | **HYPOTHESIS** | Experiment 1 could not run — zero eligible episodes (`FINDINGS.md`) | After ≥10 eligible episodes | Favor verify-first, or narrow the wedge |
| Close-out verification catches real misses | **HYPOTHESIS** | No close-out test has been run | Capture Week + 5-item checklist | Change job type or stop |
| A buyer will pay | **HYPOTHESIS** | Bill interview validated the environment, not the product | Before any scale build | Reposition or stop |

---

## 3. Risks this ledger exposes

**~~Risk 1~~ — CLOSED 2026-08-07.** *(was: the incident is fixed in the repo, not
in the field.)* Production ran the June 30 image at `0016`, without provenance
(`0020`), evidence invalidation (`0021`), attestation + verified authorship
(`0022`), pipeline reliability (`0023`), the scheduling invariant (`0024`) or
one-card-per-moment (`0025`). All six are now deployed: `v20`, head `0025`. The
code path that manufactured the five cards is no longer running.

**~~Risk 2~~ — CLOSED 2026-08-07.** *(was: the source chain is still live and
still approved.)* The 4 `approved` moments and 5 echoed `expert_answers` are
still present — deliberately, since invalidation preserves the audit trail
rather than deleting it — but `0021` recorded 10 invalidation rows against them
on deploy, and compile refuses the chain. Verified pre-deploy against this exact
data and image: `409 (capture_not_attested,
expert_answer_not_human_authored, expert_answer_echoes_prompt,
evidence_invalidated)`, zero cards created.

**Risk 3 — anonymous writes are accepted. STILL OPEN.**
Auth is unconfigured in production (`SUPABASE_URL` and `AUTH_REQUIRED` unset —
re-confirmed 2026-08-07, after the deploy; this release did not change it). The
blast radius is smaller now that Risks 1 and 2 are closed — a machine-generated
"expert answer" is refused at write time and its chain cannot compile — but
unauthenticated writes still reach the API, and no named pilot user should exist
until this is configured. **This is now the only one of the three still open,
and it is a configuration change, not a build.**

That compounding statement — **production is the version of the system that had
the incident** — was true from 2026-07-31 until 2026-08-07. It is now false, and
a deploy is what changed it, exactly as this section said it would be. What
remains is Risk 3 and a corpus of zero.

---

## 4. What this ledger says to do next

The binding constraint is unchanged and is *not* an intelligence problem:

1. ~~**Deploy main to production** (0016 → 0025)~~ → **DONE 2026-08-07.**
   `v20`, head `0025`, smoke green, row 2 re-verified above. Backup retained at
   `~/act-backups/act-prod-0016-20260806T201930Z.sql`; rollback point is
   `sha256:37e47897…` and the procedure is runbook section 5 (**database first**).
   See the [release runbook](deploy-runbook-0016-to-0025.md) section 7.
2. ~~**Invalidate the 5 echoed answers and 4 approved moments** using
   `invalidate_evidence.py`~~ — **not needed as a separate step.** Migration
   `0021` inserts the invalidation rows itself; verified on the real dump to
   create 10 rows (5 moment + 5 recording scope), after which all four approved
   moments refuse compile with `409`. Verify those 10 rows after deploying
   instead.
3. **Configure auth** (`SUPABASE_URL`, `AUTH_REQUIRED=true`) before any named
   pilot user exists. Re-confirmed still unset 2026-08-06. A local Supabase
   stack is already running for act-api, so the values exist to be wired.
4. **Device-verify act PR #70** against the deployed backend (#70 merged
   2026-08-03; the device walkthrough is what is still missing).
5. Only then: **Capture Week** → Experiment 1 → the assist-vs-verify decision.

Steps 1–4 are release gates and remain founder decisions. Nothing below step 5
is an engineering unknown; it is a deployment and configuration sequence.

---

*Update this file at every weekly review and before every release. A row that
cannot name its proof does not belong in the ledger.*
