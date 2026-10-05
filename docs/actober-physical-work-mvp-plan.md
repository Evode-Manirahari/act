# Actober physical-work MVP plan

**Written:** 2026-10-04, from [actober-physical-work-audit.md](actober-physical-work-audit.md). This is a proposal. It does not implement the pivot.

The product change is decisive: the thing Actober stores and retrieves is an evidence-backed work episode, not a lesson card. The mechanism stays the current stack: Expo capture, FastAPI, Postgres, the existing queue, ffmpeg, Deepgram, R2, and Claude only where a sentence must be drafted. No new service, no robotics, no sensor hardware, no weight training.

"Learning" in this MVP means: the episode is structured, an expert's correction is kept, and a later search returns that interval with its evidence. Model weights do not update when a job is uploaded.

## 1. The workflow to make reliable

**One phone recording of an HVAC no-cool diagnosis, narrated by the technician.**

The technician films the unit and says what they see, the number they read, what they think, what they do, and how they checked it. The system turns that file into a timeline of claims. Each claim has a class, a source interval, and an outcome state that stays unknown when nobody verified it.

This is the narrowest job the repository can already ingest. The audit ran it as synthetic speech: Deepgram returned five timestamped segments for arrival, a sweating suction line, subcooling of 3 degrees, a low-charge hypothesis, refrigerant added, and a spoken verification at subcooling of 10. The current moment merger then collapsed that sequence into one `sensory_cue`. The MVP starts from the segments, which survived, and stops treating the merged moment as the product.

### Assumptions (labeled)

| Assumption | Why it is an assumption |
|---|---|
| The first demonstrations are synthetic or founder-recorded, with `capture_class` left at `internal_product_test` until a person attests otherwise. | Production still shows the 2026-08-07 test corpus. Staging rows are `internal_product_test` with no frames. |
| Audio and video are one file from the phone. Session time is seconds from the start of that file. | That is the only clock the schema stores. A second device clock does not exist yet. |
| Measurements in milestone 1 come from speech. A CSV of gauge samples is milestone 2, behind the episode, and is not required to show the golden path. | There is no telemetry table. The HVAC regex already proves the vocabulary. |
| "I verified the repair" is expert-stated. It does not set the outcome to success. | The contract says an action is not proof. The synthetic script includes those words on purpose. |
| Claude is not required to build the first episode. Rules label claims; a person corrects them. | Question generation currently deadlocks before Claude is called. The episode path must not depend on that call. |
| HVAC no-cool stays the only trade in the MVP. Electrical `packages/act-kb` stays unused. | The lexicon, prompts, and pilot copy are HVAC. Multi-trade support is out of scope. |

### Golden path

```text
create job
→ upload one video (existing recording row)
→ extract audio and a Deepgram transcript (existing pipeline)
→ optional CSV of measurements attached to the same job (later milestone)
→ align on file time, or mark the other stream unaligned
→ segment claims from transcript intervals (new)
→ persist a work episode with evidence refs (new)
→ expert corrects a claim or a boundary (new, append-only)
→ search returns the claim and its interval (new)
```

Lesson-card compile, publish, practice, and the readiness matrix stay in the tree and are not on this path. A card can be rendered from an accepted episode later. It is not the definition of done.

## 2. Canonical representation

These names are domain concepts. The MVP adds **two tables**, not twelve.

### What already is the raw evidence

Leave these tables immutable except for the existing redaction purge:

| Concept | Existing row |
|---|---|
| JobSession | `jobs` plus the `recordings` row. One recording is one session for this MVP. `recordings.started_at` is wall clock. Media time is separate. |
| SignalStream | The recording file is the only stream. A later measurement file is a second stream row, not a new service. |
| Evidence | `transcript_segments`, `extracted_frames`, the object-storage key, `recording_marks`. Marks stay hints. |

Raw bytes stay in R2 or `.storage` under the current key. Updates to an interpretation never rewrite the object. Purge remains the deletion path and must grow to cover derived rows (audit P1-6).

### What to add

**`work_episodes`** — one current document per recording, plus `version`, `pipeline_run_id`, and `status` (`draft`, `accepted`, `insufficient`).

The document is JSON with a schema version. It holds ordered claims. Reprocessing inserts a new version and moves a `current_version` pointer. Old versions stay.

**`episode_corrections`** — append-only. Columns: episode version corrected, claim id, field, previous value, new value, actor user id (from the verified token, never from the body), `created_at`.

That split is the whole model:

| Layer | Mutable? | Examples |
|---|---|---|
| Raw evidence | No, except authorized purge | video object, transcript segment text as returned by Deepgram, frame object |
| Derived artifacts | Replaced only by a new pipeline version | parsed measurement span, ffmpeg frame index |
| Model interpretations | Versioned | claim type suggested by rules or Claude, moment score |
| Human corrections | Append-only | moved boundary, relabeled hypothesis, outcome set to insufficient |

`knowledge_objects` stay. They are not the episode. Do not migrate their prose into claims automatically; those cards were the lesson product, and production has zero published eligible cards.

### Claim shape

A claim inside the episode JSON:

```text
id
kind: observation | measurement | hypothesis | action | state | transition | outcome
epistemic_class: observed | measured | expert_stated | model_inferred
text
interval: { start_s, end_s }          # session time, file-relative
evidence: [{ kind, id, start_s, end_s }]
value, unit, uncertainty              # measurements only; null otherwise
outcome_state: unknown | expert_reported | verified | contradicted
```

Mapping for the synthetic clip, as the target labeling, not as a result the code produced:

| Segment | kind | epistemic_class | outcome |
|---|---|---|---|
| "No cool call… suction line is sweating." | observation | expert_stated | — |
| "Subcooling is three degrees." | measurement | expert_stated | — |
| "I think this is low charge. Not a bad TXV." | hypothesis | expert_stated | — |
| "I added refrigerant." | action | expert_stated | unknown |
| "Subcooling is now 10 degrees… I verified the repair." | measurement, plus an outcome the speaker asserted | expert_stated | expert_reported, not verified |

`observed` is reserved for something the system has as a recording of the world (a frame that a later vision step actually describes, or a transcript of words that were said). The words themselves are `expert_stated` even when they describe the suction line. `measured` is reserved for an instrument row with a unit. A spoken gauge reading is `expert_stated` until that row exists. `model_inferred` is a label the rules or Claude added, and it must cite the interval it was inferred from.

Temporal order is not causation. The episode may say the action sits between two measurements. It may not say the refrigerant caused the subcooling change unless an accepted claim says that, and that claim is `expert_stated` or `model_inferred`, never `observed`.

### Time

For one phone file:

- **Source timestamps:** Deepgram `start_s` / `end_s` stored on the segment row, unchanged.
- **Session timebase:** the same numbers. t = 0 at the start of the container. Say so on the episode (`timebase: recording_file`).
- **Frame times:** store `assumed_timestamp_s = index * 5` and `assumption: fps_1_over_5`, because that is what `process_recording` writes. Do not copy those times onto a claim as if they were PTS.
- **Offset and drift:** none on a single file. Fields exist and stay null.
- **Alignment uncertainty:** null means unknown. Unknown does not become 0.
- **A future CSV** keeps its own `source_t` plus an optional `offset_s` a person sets. Until the offset is set, those points are `unaligned` and do not appear on the session axis.

`agent_runs` already stores `model`, `prompt_version`, and `input_refs`. Point episode versions at a pipeline run id. A reprocess that changes text must be explainable from that row. Do not hold a `FOR UPDATE` lock across [`agent_runs.start_run`](https://github.com/Evode-Manirahari/act-api/blob/2a9a6378fd3336a55fc49c7f9d0fe2820f95861a/app/services/agent_runs.py#L86-L101) (audit P0-2). The lock is taken in [`create_question_for_moment`](https://github.com/Evode-Manirahari/act-api/blob/2a9a6378fd3336a55fc49c7f9d0fe2820f95861a/app/routes/knowledge.py#L414-L440).

## 3. Temporal processing

Build this on the pipeline that already ran, after `transcript_segments` are committed. Do not summarize the video into a paragraph.

**Video.** Keep the 5-second sample and the mark frames. They are context, not detections. Milestone 1 does not add an action recognizer. A claim may cite a frame interval only when a person attaches it or a later vision step writes a `model_inferred` observation with the frame id. Missing frames (the audit clip has no sampled frame over the last five seconds) stay missing.

**Audio.** Persist Deepgram segments as now, including `spk_0` and confidence. Do not rename `spk_0` to the technician. The session's recording user is the likely speaker; the claim says `speaker: spk_0`, `speaker_uncertain: true` until a person confirms. Split claims on segment boundaries. Use the existing HVAC lexicon only as a suggester:

- measurement regex → suggested measurement, class `model_inferred` until a person accepts it, at which point the correction records the acceptance and the class becomes `expert_stated` if the source is speech
- "I think", "not a bad TXV" → suggested hypothesis
- "I added", "I replaced" → suggested action
- "verified", "checked again" → suggested outcome, `outcome_state: unknown` until the suggestion is accepted as `expert_reported` or a second measurement claim is linked as verification

**Measurements.** Milestone 2 accepts a CSV with columns the file actually has: timestamp, value, unit, and optional device and uncertainty. Reject a file that lacks unit or timestamp. Do not convert units. Do not fill gaps. A value that fails a range check is stored and flagged `validation: out_of_range`, still with the original number.

**Across modalities.** If only the camera file exists, every claim's evidence is a transcript span and optional frames. If a CSV has no offset, it is listed as unaligned and cannot support a `measured` claim on the session axis. Confidence on a transcript segment is Deepgram's word confidence, not the probability that the diagnosis is right. The episode stores that number under `transcript_confidence` so the UI does not present it as diagnostic confidence.

**Insufficient evidence.** The action "I added refrigerant" with no later measurement link has `outcome_state: unknown`. The sentence "I verified the repair" without a linked before/after measurement is `expert_reported` only after a person accepts that reading of the words. The system does not write `verified` by itself.

## 4. Human correction

The expert edits on the timeline: drag a boundary, relabel a kind, fix a number, mark the outcome unknown, or attach a frame.

Rules:

- The model version that was corrected stays addressable (`work_episodes.version`).
- The correction row stores who, when, and which version.
- The accepted episode is the current version plus the corrections that apply to it. The UI reads that composition, not the raw model JSON.
- Reprocessing writes a new episode version. Corrections whose evidence ids and intervals still exist are copied forward as `carried`. Corrections whose interval disappeared are `unanchored` and show up for review. They are never deleted and never silently applied to a different sentence.
- A reprocess does not call the model again for a claim a person has accepted, unless they ask for a rebuild of that claim.

`PATCH /answers/{id}` can remain for the old debrief. New episode edits do not use it.

## 5. Reliability

Keep `processing_jobs`. Add job types `build_episode` and, later, `ingest_measurements`. Same claim, heartbeat, and backoff as `process_recording`.

| Failure | Behavior |
|---|---|
| Large upload | Existing queue retries the whole file today (audit P1-7). Milestone 1 may still use that path for short clips. Resume is required before jobs longer than a few minutes are piloted. |
| Duplicate complete | Already idempotent. `build_episode` must be idempotent per `(recording_id, transcript_hash, rules_version)`: if that version exists, return it. |
| Worker crash | Heartbeat reclaim. Episode build is a pure function of segments and writes a new version only when the hash changes, so a retry does not duplicate claims. |
| Deepgram or Claude down | Media job fails with `failure_reason` after bounded retries (already the pattern, `job_max_attempts` 3). Episode build does not start. Claude is off this path. |
| No audio or corrupt media | ffmpeg error fails the media job. No episode. Do not insert a stub transcript in any environment that can reach a real database. |
| Bad CSV | The measurement stream is `rejected` with a row-level reason. The video episode still stands. |
| Clock missing on a CSV | Stream stored as `unaligned`. Episode build ignores it. |
| Cancel | `processing_jobs.status = cancelled` already exists. Cancel stops the next stage. It does not delete raw media. |
| Reprocess | New episode version. Corrections carried or unanchored as above. Deepgram runs again only when the audio hash changes. |

Release the moment-row lock before `agent_runs` inserts (audit P0-2) in the same milestone, even though the new path does not call `create_question_for_moment`. The worker lives in the API process. An approval on the old route will wedge a connection if the bug stays.

Do not add Redis, Celery, or a second machine for this.

## 6. Job Timeline and search

The hero surface is a new admin route, one recording, four stacked lanes: video (frames until a player is wired), transcript, claims, and measurements when a stream exists. Selecting a claim seeks the media to `evidence.start_s` and highlights the segment. Mobile capture stays the current capture screen: record, optional marks, queue, upload status. Do not add a timeline editor on the phone in this MVP. Correction is a desk activity.

Search is Postgres over claim text plus filters on `kind`, `epistemic_class`, and unit. A query "high vibration + normal motor current" matches claims that contain those words, or claims whose stored threshold says the value is high or normal. The lexicon does not invent a cutoff. If the expert said "vibration is high" and the current was "normal," both claims must share a job and an overlapping or adjacent interval for the hit to count as one moment. A card-level LIKE match is not a hit.

Qualitative terms:

- **Expert-stated:** the word "high" or "normal" appears in an accepted claim, cited to speech.
- **Threshold:** a correction or a CSV column supplies `comparator` and `reference` (`subcooling_f < 6` labeled low by the technician). The number alone is not "low."
- **No basis:** the query does not match. The UI says the term is not grounded. It does not ask a model to guess.

Voyage embeddings can wait. Keyword claim search is enough to prove segment retrieval, and `VOYAGE_API_KEY` is unset.

## 7. Evaluation and security

### Harness

Annotate jobs by hand. The synthetic script in the audit is fixture `synthetic-nocool-001`. Any file with `capture_class != genuine_field_work` is a fixture. Mocks (`transcribe_provider=stub`) are excluded from scores. Do not publish a score until at least five annotated jobs exist, and do not mix fixtures into a field score.

| Metric | Calculation | Proposed threshold for the first field set |
|---|---|---|
| Event extraction | A predicted claim matches an annotation when kind matches and intervals overlap by at least half the shorter span. Recall and precision over annotated claims. | Recall ≥ 0.8 and precision ≥ 0.7 on the five-job set. |
| Temporal alignment | Median absolute error of matched start and end, in seconds. | Median ≤ 2.0 s. |
| Measurement extraction | Value and unit exact-match on annotated measurement claims. A unit conversion counts as wrong. | Exact-match ≥ 0.9. |
| Action and outcome | Kind match for action; outcome_state match. Predicting `verified` when the annotation says `unknown` is a false verified. | False verified rate = 0 on the set. |
| Unsupported claim rate | Predicted claims with no evidence id, or evidence outside the claim interval. | 0. |
| Evidence attribution | Matched claim cites the annotated segment id or an overlapping segment. | ≥ 0.9 of matched claims. |
| Retrieval | For each annotated query, the correct claim is in the top 5. | ≥ 0.8. |
| Pipeline success | Jobs that reach `ready` episode or a terminal `failed` with `failure_reason`, divided by jobs submitted. Hung `running` older than the visibility timeout counts as failure. | ≥ 0.95 on the fixture set, then reported separately on field jobs. |
| Latency | Upload complete → episode `draft`, wall clock. | Report p50 and p95. No target until one real hour of audio has been timed. |
| Cost | Deepgram plus any Claude dollars, divided by hours of source audio. | Report the number. No target in this plan. |

These thresholds are proposals. This audit measured one synthetic file and did not score it against a second annotator. The deadlock means the old compile path has no success rate to report.

### Security work that is part of the MVP, not a follow-up

- Turn on `AUTH_REQUIRED` with Supabase before any episode from a real job is stored (audit P0-1). The client already refuses to send account and expert ids; keep it that way.
- Scope episode reads and the new search with the same `account_id` join used in `scoping.py`. The worker loads the recording by id only after the enqueue path required a token.
- Signed GET for media, as now. Episode JSON does not embed raw URLs that outlive the signature.
- Purge deletes episode versions, corrections, measurement streams, embeddings, answer audio, and agent-run payloads for that recording.
- Do not log claim text at info level.
- Input validation: CSV size cap, required columns, no unit rewriting.

Secrets stay in Fly secrets and local `.env`. The audit did not print them. `.env.bak-20260819-165829` in the API checkout is untracked; it should not be committed.

## 8. Implementation order

Each step is shippable on its own. Later steps depend on earlier ones. None of them replace FastAPI, Postgres, or the mobile capture stack.

| Step | Work | Depends on | Acceptance | How to validate |
|---|---|---|---|---|
| 0 | Release the moment lock before `agent_runs.start_run` in [question generation](https://github.com/Evode-Manirahari/act-api/blob/2a9a6378fd3336a55fc49c7f9d0fe2820f95861a/app/routes/knowledge.py#L414-L440) and [compile](https://github.com/Evode-Manirahari/act-api/blob/2a9a6378fd3336a55fc49c7f9d0fe2820f95861a/app/routes/knowledge.py#L729-L820). | None | `POST /moments/{id}/questions` on Postgres returns 201 or 502 inside the provider timeout. `pg_stat_activity` shows no idle-in-transaction session blocked by an `agent_runs` insert. | Replay the audit clip's approve step against `act_audit_20261004` or a fresh database. Add a Postgres test that uses the same database for `agent_runs` and the moment row. |
| 1 | `build_episode` from existing segments. Persist `work_episodes` version 1 with the claim shape above. Rules only. No Claude. | Segments from the current pipeline. Step 0 so the process cannot wedge. | The synthetic no-cool clip yields separate claims for the observation, both subcooling statements, the hypothesis, and the action. Outcome of the action is `unknown`. Every claim cites a segment id and interval. | Run the audit upload again. Read the episode. Compare to the table in section 2. |
| 2 | Append-only corrections and a single admin timeline: transcript lane, claim lane, click-through to the segment. | Step 1 | Moving a boundary or relabeling a claim writes a correction. The previous version still reads back. Re-running `build_episode` does not drop the correction. | Edit the synthetic episode. Reprocess. Confirm `carried` or `unanchored`. |
| 3 | Claim search. | Step 1 | A query for the subcooling sentence returns that claim, not a whole-video summary. "High vibration" returns nothing on this fixture. | HTTP search against the fixture. |
| 4 | Measurement CSV as an unaligned stream, then a manual offset. | Step 1 | A CSV without timestamps is rejected unchanged. A CSV with timestamps and no offset is stored and absent from the session axis. | Fixture CSV. |
| 5 | Auth required in the environment, purge extended to episodes. | Steps 1–3 before any non-fixture job | Anonymous `GET /jobs` is 401. Purge removes the episode and the video. | Production config change, then a purge test on a fixture recording. |
| 6 | Evaluation script over annotated JSON, fixture set separated from field set. | Steps 1–3 | The script prints the metrics in section 7 for `synthetic-nocool-001` and refuses to label the run as field accuracy. | One command, checked-in fixture. |

Out of scope for all six steps: vision models, LiveKit, readiness levels, practice mode, electrical KB, multipart upload (track as P1-7 before long field jobs), foundation-model training, extra services.

## 9. First implementation milestone

**Step 0 and step 1 together.** Fix the lock ordering, then persist a work episode for one already-transcribed recording.

Done means:

- A Postgres request that approves a moment and generates a question either finishes or fails the provider call. It does not sit `idle in transaction`.
- The synthetic no-cool recording becomes a versioned episode whose claims are the spoken observation, the two subcooling statements, the hypothesis, and the action, each linked to the Deepgram segment that contains it.
- The action's outcome is `unknown`. The words "I verified" do not flip it to `verified`.
- Re-running the builder with the same transcript hash returns the same version.
- No `knowledge_objects` row is required, and no model weight changes.

The audit database `act_audit_20261004` still has that recording, five segments, and zero questions. It is a synthetic fixture. Use it to check the builder. Do not attest it as field work.
