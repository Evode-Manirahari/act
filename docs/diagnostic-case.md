# DiagnosticCase

The primary product object. A published lesson card can be *rendered from* a
case. A case cannot be reconstructed from a quiz.

Actober is a company-specific diagnostic apprenticeship and technician-readiness
system for HVAC. It turns real callbacks, hard service calls, and field evidence
into verified diagnostic cases that technicians practice — so they learn to
reason, not just read the answer — and it shows managers which job types each
technician is ready to handle independently.

## This slice

`packages/domain` is the contract. Existing `knowledge_objects` map onto a case
without a backend rewrite. Missing fields stay missing; they are not invented.

**Episode types:** callback, near miss, hard diagnosis, adaptation, proficiency.

**Debrief:** one targeted question at a time, from the first missing field
(cue → hypothesis → discriminating test → causal link → boundary → verification
→ novice trap).

**Practice:** safety gate → learner commit → challenge → expert comparison →
reflection. The model may draft; it does not publish, score readiness, or
diagnose a live job.

## Slice 2 — readiness, delayed variants, demo shop

Still `packages/domain`, still no backend change. Rendered in `apps/admin` at
`/readiness`, `/demo`, and `/learn?demo=1`.

**Work activity:** the unit a manager entrusts. Cases and field jobs are
bucketed into activities (`activity.ts`) from tags and `system_type`. The
starting HVAC taxonomy is a default, not a schema; unknown text lands in
`general` rather than a guessed bucket.

**Readiness matrix:** technician × work activity. Each cell counts practice
commits, completions, distinct cases, delayed variants, field jobs, and
callbacks, and carries the level a manager set. The code flags a cell for
review when evidence exists with no level, or moved since the level was set
(independent cells only re-flag on a callback; mentor cells never). **It does
not compute a level.** Levels: observe, assist, supervised, independent,
mentor.

**Delayed variant:** 7–14 days after the first completion, the case comes back
with the title hidden. A `completed` event whose note is
`{"kind":"variant_completed"}` closes it. Passing once shows reasoning; passing
the variant shows transfer.

**Demo shop:** Northline Mechanical, fictional. Every id is `demo-` prefixed,
every screen says so, and the write path refuses demo ids. It exists so the
loop can be shown before a shop has captured anything. It is never traction.

**Live mode** composes from endpoints that already exist: `/library/search`,
`/jobs`, `/jobs/{id}/outcomes`, `/apprentices/{id}/events`, `/me`. A failed
read renders as unconfirmed, not as an empty cell.

### What act-api needs next

Nothing in slice 2 persists a manager's decision. The picker changes the level
on screen and says it is not saved. To close that:

```
readiness_levels
  id, account_id, tech_user_id, activity_id, level, set_by_user_id, set_at, note
  set_by_user_id derived from the bearer token; client never sends it
GET  /readiness/levels                      -> current level per tech × activity
POST /readiness/levels                      -> {tech_user_id, activity_id, level, note}
```

Also still pending: `episode_type` column on `knowledge_objects` (inferred from
tags today), `activity_id` on `knowledge_objects` and `jobs` so bucketing is a
manager choice rather than an inference, and a `GET /users` roster so live mode
shows names instead of id prefixes.

**Not in slice 2:** glasses, multi-agent compile, eval set against fabricated
debrief questions, mobile readiness surface.
