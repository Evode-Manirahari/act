# act-api handoff

What this repo needs from `act-api` and cannot do itself. Each item names the
client code that already speaks the contract, so the backend change lands
against a consumer that exists. Written against the deployed OpenAPI at
`https://act-api-evode.fly.dev/openapi.json` on 2026-09-05; verify the head
revision and route conventions in the repo before writing anything.

## 1. `readiness_levels` — the manager's decision persists

The only write in the readiness loop. Today the admin stores demo decisions in
a browser cookie and answers `501` for live technicians
(`apps/admin/app/api/readiness/levels/route.ts`). Once this ships, that route
forwards unchanged.

**Table**

```
readiness_levels
  id              uuid pk
  account_id      uuid not null            -- from the caller's user row
  tech_user_id    uuid not null            -- fk users.id
  activity_id     text not null            -- see packages/domain/src/activity.ts
  level           text not null            -- observe | assist | supervised | independent | mentor
  set_by_user_id  uuid not null            -- derived from the bearer token; never from the body
  set_at          timestamptz not null default now()
  note            text null                -- ≤ 200 chars, the line the tech reads
  unique (account_id, tech_user_id, activity_id)   -- current level; history is a later table
```

Clearing a level deletes the row (or write `level = null` as a delete).

**Routes**

```
GET  /readiness/levels
  auth required; scoped to the caller's account
  -> 200 ReadinessLevelOut[]

POST /readiness/levels
  auth required; caller role in {lead_tech, manager, admin} (whatever the roles table calls the entrusting role)
  body  { tech_user_id: uuid, activity_id: string, level: string | null, note: string | null }
  -> 200 ReadinessLevelOut         (upsert; re-posting replaces the current row)
  -> 204 when level is null and the row was deleted
  -> 422 level not one of the five, note > 200 chars, activity_id empty
  -> 403 caller may not set levels
  -> 404 tech_user_id not in the caller's account

ReadinessLevelOut
  { id, tech_user_id, activity_id, level, set_by_user_id, set_at, note }
```

Client: `apps/admin/lib/api.ts` (`readinessLevels`, `setReadinessLevel`),
`apps/admin/lib/readiness.ts` (`liveReadiness`: 404 = not deployed yet, any
other failure = unconfirmed, never rendered as "no levels").

**Invariants that carry over:** the client never sends `set_by_user_id` or
`account_id`. The API does not compute a level from evidence; it stores the
one a person chose.

## 2. Users roster

`GET /users` scoped to the caller's account: `{ id, email, display_name, role }[]`.
Until it exists the admin reads `ACT_TECH_ROSTER` (JSON in env,
`apps/admin/lib/roster.ts`). When it exists, replace that lookup in
`liveReadiness`.

## 3. `episode_type` and `activity_id` on `knowledge_objects`; `activity_id` on `jobs`

Both are inferred today (`packages/domain/src/episode.ts`,
`packages/domain/src/activity.ts`) from tags and `system_type`. Columns make
them a reviewer's choice. Nullable text; the inference stays as the default
when null. Expose on `KnowledgeObjectOut` / `JobOut` and accept on the PATCH
routes.

## 4. Port the debrief eval set

`docs/act-api-handoff/debrief_eval_set.json` — generated from
`packages/domain/src/evals/debriefEvalSet.ts`, kept identical by a test. Three
suites:

- `nextGap`: for each `draft` + `episodeType`, the next question's gap must be
  `expectGap` (`null` = the debrief is complete and no question is asked).
  `expectQuestionMatches` is a regex source the question text must match.
- `answers`: `answerRejectReason(answer, question, momentMeta)` must equal
  `expectReject`. The first case is the 2026-07-31 incident. Run it against
  `POST /questions/{id}/answers` and `POST /moments/{id}/debrief/next`.
- `grounding`: `groundClaim(claimId, claim, sources).grounded` must equal
  `expectGrounded`. Run it against the `grounding-check` reviewer.

Reference implementation of the three functions: `packages/domain/src/grounding.ts`
and `completeness.ts`. They are token overlap with a stopword list and light
stemming; port the thresholds (`MIN_ANSWER_TOKENS = 3`,
`MIN_NOVEL_FRACTION = 0.4`, `MIN_GROUNDING_SCORE = 0.4`,
`MIN_MATCHED_TOKENS = 3`) rather than re-tuning them, so both sides refuse the
same answers.

## 5. Pilot 0 provenance gate at compile and publish

`checkMvpPublish` in `packages/domain/src/provenance.ts`. AND it with the
existing grounding-check. Token overlap cannot approve; this cannot either.

A claim whose `source_refs` are `knowledge_object.*` or `draft.*` is the
2026-07-31 incident and must 409. Empty evidence is `no_evidence`, not a
guess. Tenant, `source_expert_id`, and `job_id` are derived on the server
from the moment's recording and a verified token — never from the client
body. Until those columns exist on `knowledge_objects`, treat them as
unconfirmed (do not render "no tenant").

Reference reasons: `MvpHardReason` / `MvpUnconfirmedReason`. Keep the strings
identical so admin and API refuse the same cases.

## Access

This repo's cloud agent cannot read `Evode-Manirahari/act-api` (private, not
in the agent's GitHub installation). Granting it makes items 1–5 a normal PR
instead of a handoff.
