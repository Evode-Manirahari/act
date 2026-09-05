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

Moved to `docs/act-api-handoff.md` (table, routes, status codes, the eval set
as JSON, and the client code that already calls each endpoint). In the
meantime a manager's decision persists in the demo through a browser cookie
(`apps/admin/lib/levelStore.ts`, demo ids only), and live technicians take
their names from `ACT_TECH_ROSTER`.

**Not in slice 2:** glasses, multi-agent compile, eval set against fabricated
debrief questions, mobile readiness surface.

## Slice 3 — the debrief that can't fabricate

The 2026-07-31 autopsy: five cards published from a bare timestamp, "expert
answers" that were the moment's own metadata echoed back. Slice 3 is the step
that chain was missing, as deterministic code in `packages/domain`.

**Answer guard** (`answerRejectReason`): an answer is refused if it is too
short, if it mostly repeats the question, or if every content word in it came
from what the system already knew (moment type, window, score, mark label).
Reason codes: `empty_answer`, `answer_echoes_prompt`, `answer_is_metadata`.

**Interview machine** (`interview.ts`): one question for the first missing
field, one accepted answer fills only that field. Refused answers stay in the
record with their reason and never touch the draft.

**Grounding check** (`checkCaseGrounding`): every claim must trace, by content
token overlap, to a transcript segment or an accepted answer. Fail-closed:
`no_evidence`, `no_claims`, `claim_ungrounded:<id>`. It can refuse; it cannot
approve what a lead tech has not read.

**Eval set** (`evals/debriefEvalSet.ts`): plain data, the incident is the
first case. act-api should port it verbatim and run it against the real
compile path.

**Surfaces:** `/debrief` replays the airflow callback's interview for the demo
(bad answer refused, grounding gates "send to lead review"). The live moment
page now checks typed answers before saving and shows an advisory grounding
readout on the compiled card — advisory because earlier sessions' answers are
not loaded there; act-api's `grounding-check` stays authoritative at publish.

**Mobile:** Learn reads the learner's history, orders due variants first, and
opens them with the title hidden. A failed history read shows as unknown
timing, never as "not practiced".

**Still pending in act-api:** see `docs/act-api-handoff.md`.
