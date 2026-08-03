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
| Fabricated evidence **cannot recur** | **IMPLEMENTED — NOT DEPLOYED** | Migrations 0020–0025 + generated-answer rejection exist on main and pass 452 tests; **production runs 0016 and Jun-30 code** | Migration head after deploy | This is currently *false in production* — see Risk 1 |
| Real field jobs have been captured | **NOT OBSERVED** | 0 eligible episodes; 22 recordings are app tests (`exclusion_log.md`); nothing new since 2026-07-30 | Daily during Capture Week | Reduce burden or change the capture moment |
| Expert answers are human-authored | **FALSE for existing rows** | All 5 stored answers are echoed moment metadata (Finding 2) | At each new answer | Keep the question pending; never compile |
| Backend main is production | **FALSE** | prod `0016` vs main `0025`; deployed image predates all incident fixes | Every deploy | Block any mobile release that assumes 0024+ |
| Mobile honest-debrief loop is live | **PROPOSED** | act PR **#70** open, unmerged, not device-verified | Before Capture Week | Do not run Capture Week without it |
| Auth protects production writes | **FALSE** | `SUPABASE_URL` and `AUTH_REQUIRED` both unset on the machine | Before inviting any pilot user | No named pilot users until configured |
| Company evidence beats generic model knowledge | **HYPOTHESIS** | Experiment 1 could not run — zero eligible episodes (`FINDINGS.md`) | After ≥10 eligible episodes | Favor verify-first, or narrow the wedge |
| Close-out verification catches real misses | **HYPOTHESIS** | No close-out test has been run | Capture Week + 5-item checklist | Change job type or stop |
| A buyer will pay | **HYPOTHESIS** | Bill interview validated the environment, not the product | Before any scale build | Reposition or stop |

---

## 3. Risks this ledger exposes

**Risk 1 — the incident is fixed in the repo, not in the field.**
Production runs the June 30 image at migration `0016`. Every structural fix from
the fabricated-card incident — provenance (`0020`), evidence invalidation
(`0021`), attestation + verified authorship (`0022`), pipeline reliability
(`0023`), the scheduling invariant (`0024`), one-card-per-moment (`0025`) — is
absent from the running system. The deployed code still contains the path that
manufactured the five cards.

**Risk 2 — the source chain that produced those cards is still live and still approved.**
Deleting the cards removed the output, not the cause: 4 `approved` moments and 5
echoed `expert_answers` remain in production, on a code version with no
generated-answer rejection and no invalidation. The system can rebuild the same
cards and has no memory that it shouldn't. `scripts/invalidate_evidence.py` and
migration `0021` exist to close this — **on main, not in production.**

**Risk 3 — anonymous writes are accepted.**
Auth is unconfigured in production. Combined with Risks 1 and 2, a client today
could submit a machine-generated "expert answer" under any user id and reach
compile. This is the exact chain from Figure 4 of the fieldbook, still open.

These three compound into one statement: **production is the version of the
system that had the incident.** No dashboard, memo, or passing test suite
changes that until a deploy happens.

---

## 4. What this ledger says to do next

The binding constraint is unchanged and is *not* an intelligence problem:

1. **Deploy main to production** (0016 → 0025) with staging rehearsal, backup,
   smoke, and a proven rollback — then re-verify this ledger's row 2.
2. **Invalidate the 5 echoed answers and 4 approved moments** using
   `invalidate_evidence.py` once `0021` is live, so the chain cannot be recompiled.
3. **Configure auth** (`SUPABASE_URL`, `AUTH_REQUIRED=true`) before any named
   pilot user exists.
4. **Merge and device-verify act PR #70** against the deployed backend.
5. Only then: **Capture Week** → Experiment 1 → the assist-vs-verify decision.

Steps 1–4 are release gates and remain founder decisions. Nothing below step 5
is an engineering unknown; it is a deployment and configuration sequence.

---

*Update this file at every weekly review and before every release. A row that
cannot name its proof does not belong in the ledger.*
