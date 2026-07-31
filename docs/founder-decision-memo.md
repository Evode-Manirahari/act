# Actober — Founder Decision Memo

*Written 2026-07-30 as cofounder/product strategist/systems architect, assuming
a from-zero founding. The existing repos are treated as evidence, not strategy.
Decision rules: [founder-principles.md](founder-principles.md).*

---

## 1. The market truth

> **CORRECTION (2026-07-31, from Experiment #1's corpus autopsy —
> act-api `evals/exp1_evidence_value/FINDINGS.md`):** the first two
> "verified" items below were wrong. The 22 recordings are app tests, not
> field jobs (the longest transcript narrates a demo of the app itself);
> the 5 published cards were AI-compiled from a bare mark timestamp with no
> transcript or genuine expert answer. **Capture of real work is NOT yet
> proven and moves back to the hypothesis column**; the review "bottleneck"
> reading was an artifact of test data. Everything downstream of those two
> items stands, and the recommended direction is unchanged — but its first
> prerequisite is now Capture Week (see the experiment package), not the
> offline eval itself.

**Verified (repo data, pilot dashboard, Bill interview — n=1 shop, n=1 vet):**

- ~~Senior techs will record real jobs. 22 jobs captured against a target of
  20, by a real HVAC company, with a working consent flow. Capture is not
  the risk.~~ *(corrected above — recordings were app tests)*
- ~~The human review loop is the bottleneck: 5 cards published against a
  target of 50. Knowledge distillation is rate-limited by lead-tech
  attention, not AI.~~ *(corrected above — test-data artifact)*
- Zero evidence that captured knowledge changes field behavior. `training_events`
  records views and quizzes; no "applied on a job" event has ever been logged.
- HVAC expertise is deep, fragmented, and dangerous: ~5 years to journeyman,
  heavy specialization (a resi tech knows little about ammonia or steam),
  daily hazards (electrocution, refrigerant, gas, falls). Generalists are rare.
- Turnover is structural. Pay ranges $20–100/hr by region; workers leave for
  respect and money; "no computer program" fixes retention (Bill). The premise
  must assume people leave.
- No knowledge-transfer software exists in a 40-year veteran's world. The gap
  is unoccupied. But the concept fails verbally — Bill heard "retention
  software." Demos land; pitches don't.
- The economics are real but secondhand: callbacks ≈ $650 each (ACCA),
  first-time-fix ~80% industry-average, 6–12 month ramp, replacement cost
  100–150% of salary, 425k techs and ~40k openings/yr (BLS).
- One paying-intent pilot client exists — an owner who trains many students.
  His motivation is training capacity, not retirement insurance.

**Where judgment lives today:** senior techs' heads, manufacturer tech-support
phone queues, distributor counter staff, YouTube/Facebook groups, manuals
nobody opens on a roof. **What an uncertain tech does today:** calls the senior
(interrupting the most expensive person in the company), calls the manufacturer
(hold music), guesses (the "parts cannon" — swap parts until it works), or
searches YouTube. Increasingly — *hypothesis, must verify* — he asks ChatGPT.

**What field-service software does not solve:** ServiceTitan, Housecall Pro,
FieldEdge own dispatch, quoting, invoicing, CRM — the business layer. None of
them touch the judgment layer (what to check next and why) or the truth layer
(was the work actually done right). Manufacturer support is per-brand and
overloaded. Interplay teaches the textbook, not this company's install base.

**The exponential, and our independent view (principle 3):** the cost of
multimodal reasoning over field evidence — a photo of a nameplate, a gauge
reading, a 30-second clip — collapsed from impossible to nearly free in ~24
months and keeps falling. Consequence most people miss: *generic* trade
knowledge is being commoditized into every frontier model. The durable value
migrates to what the models will never have by default: **situated evidence**
(this unit, this building, this company's history), **verification** (proof the
work was right), and an **accountability wrapper** (someone who stands behind
the answer). Products that are thin wrappers over model Q&A get absorbed;
products that own field ground truth do not.

**The hidden system constraint (principle 4): nobody knows what actually
happened on the job.** Not the owner (he sees invoices and callbacks), not
ServiceTitan (it stores photos, judges nothing), not the labs (no sensors on
site). Whoever owns job-level evidence tied to outcomes owns the ability to
verify AI answers, coach humans, and eventually train the agents and robots.

**Standing hypotheses (unverified, treated as such):** owners pay before the
expert retires; a second tech consults anything mid-job; AI-compiled cards are
good enough to teach; callback reduction is attributable at pilot scale; the
wedge generalizes beyond HVAC.

---

## 2. The company directions

### A. The Judgment Library *(the current prototype's thesis)*
Capture senior-tech jobs → review → publish cards → apprentices learn/retrieve.
1. **User:** senior tech (capture) + apprentice (learn) at a multi-site operator.
2. **Painful moment:** apprentice stuck; senior interrupted; knowledge retiring.
3. **Alternative:** ride-alongs, phone-a-friend, YouTube, Interplay.
4. **Better because:** company-specific, footage-backed, reviewed.
5. **Why now:** video+LLM pipeline is cheap; retirement cliff.
6. **Startup wins because:** incumbents have no footage pipeline; labs have no
   company corpus.
7. **Repeated use:** debriefs after jobs; lookups before/during jobs.
8. **Compounding asset:** the reviewed card corpus.
9. **Big-company path:** cross-trade company knowledge layer.
10. **Risks:** review bottleneck is *proven* (5/50); per-company cold start;
    retrieval moment unproven; slow to demonstrate value.
11. **Must be true:** cards change field behavior within weeks of publishing.
12. **30-day disproof:** the retrieve-and-apply slice (specced 2026-07-30):
    ≥2 real-job uses in 14 days or the loop's back half is dead as a wedge.

### B. The Field Copilot *(assist at the stuck moment)*
Grounded, evidence-linked next-step guidance for a tech alone on a job —
sources: manufacturer manuals, the company's reviewed cards, this unit's
service history, model general knowledge (labeled as such).
1. **User:** the 1–3-year tech alone on a no-cool/no-heat call.
2. **Painful moment:** stuck at the condenser, not sure what to check next;
   senior unreachable; customer watching.
3. **Alternative:** call senior, call manufacturer, guess, YouTube, raw ChatGPT.
4. **Better because:** instant, hands-on-equipment multimodal (nameplate photo,
   gauge reading), cites its evidence, gives a verification step with every
   answer, escalates honestly when out of depth.
5. **Why now:** frontier multimodal models just crossed useful-journeyman
   reasoning on common equipment; manuals are ingestable; voice is hands-free.
6. **Startup wins because:** labs won't build trade distribution, liability
   posture, equipment-history integration, or escalation-to-your-senior;
   ServiceTitan's DNA is business software.
7. **Repeated use:** every uncertain moment — potentially daily per tech. The
   highest-frequency surface any direction offers.
8. **Compounding asset:** consult episodes — (situation, evidence, answer,
   action taken, outcome) — the labeled diagnostic data nobody else has.
9. **Big-company path:** the interface every field tech opens first; the
   diagnostic brain for physical work.
10. **Risks:** safety/liability (wrong guidance on live electrical or
    refrigerant), hallucination, gloves/hands-busy UX, senior-tech pride,
    FM absorption (this is the direction a ChatGPT tab most nearly replaces).
11. **Must be true:** model + evidence ≥ the average phone-a-friend on common
    calls, with guardrails that bound harm; techs actually pull the phone out.
12. **30-day disproof (near-zero build):** offline eval. Pull 20–50 real
    stuck-moments from the 22 recorded jobs' transcripts; generate answers
    with/without company evidence; the senior tech blind-grades against what
    he actually did. If less than half are "safe and useful," the thesis dies
    for ~3 days of work.

### C. Proof of Work *(verify at the moment of completion)*
AI reviews job evidence — photos, clips, readings — against the company's
done-right checklist before the truck leaves; flags callback-causing misses;
produces a verification record for warranty, dispute, and coaching.
1. **User:** service manager/owner (buyer + enforcer); tech submits evidence.
2. **Painful moment:** the manager cannot see 200 jobs a week; he finds out a
   job was wrong when the customer calls back angry.
3. **Alternative:** spot-checking photos in ServiceTitan; ride-alongs; nothing.
4. **Better because:** every job checked, not 5%; misses caught while the tech
   is still on site; evidence trail for disputes and warranty claims.
5. **Why now:** vision models can now read gauges, nameplates, brazing joints,
   panel wiring — checklist verification became automatable this year.
6. **Startup wins because:** incumbents store evidence but do not judge it;
   labs have no checklists, no enforcement channel, no trade trust.
7. **Repeated use:** every job close-out — mandatory, not optional.
8. **Compounding asset:** the only outcome-labeled evidence corpus in the
   industry (evidence → callback or no callback). This is also the best
   possible training data for future field agents and robots.
9. **Big-company path:** the trust layer for physical work — "Actober-verified"
   as a standard; insurers price on it; warranties require it.
10. **Risks:** surveillance culture — techs may sabotage it; checklist
    authorship burden on the company; vision precision; requires manager
    enforcement to sustain usage.
11. **Must be true:** owners will enforce evidence capture; AI catches real
    misses at precision high enough not to cry wolf.
12. **30-day disproof (near-zero build):** owner writes a 5-item checklist for
    his most callback-prone job type; run existing captured footage against
    it; owner grades the flags. One true catch = alive; all noise = dead.

### D. The Apprenticeship Engine *(workforce production)*
Turn a shop's real jobs into a structured first-90-days ramp with measured
competency; sell ramp-time reduction to owners; later trade schools/unions.
Compact assessment: our pilot client literally trains students, so the first
user exists in-house; ramp economics are real ($650 callbacks, 6–12mo ramp).
But training budgets are soft, outcomes take months to measure, Interplay owns
the category's mental slot, and it inherits Direction A's corpus bottleneck.
**Must be true:** competence gains show inside one pilot window. **30-day
test:** build one week-one module from existing footage for the client's next
hire; measure time-to-first-solo-task vs. his usual ramp. Not the company —
a natural expansion of whichever direction wins.

### E. The Physical-Work Data Refinery *(sell training data to robot/agent labs)*
Capture rigs + labeling pipeline; license field-work data to robotics
companies starving for manipulation and diagnostic data. Why now: robot
foundation models are data-bound. Why not now: two-sided cold start; we would
become a data-services vendor whose customer is a lab, not a worker —
a mission misfit (we exist to increase workers' capability); pricing power
accrues to whoever owns *distribution* of capture, which is Directions B/C.
**The right form of this idea:** exhaust. B and C generate exactly this corpus
as a by-product, with consent and provenance. Revisit as a revenue line in
year 2–3, not a company. 30-day test if ever needed: pitch three robotics
labs the sample footage for an LOI.

*(Considered and rejected without full workup: an AI-native FSM/dispatch
suite — a frontal assault on ServiceTitan's core, no unfair advantage.)*

---

## 3. The comparison matrix

Scores 1–5, 5 best. Scored against evidence, not affection.

| Criterion | A Library | B Copilot | C Verify | D Training | E Data |
|---|---|---|---|---|---|
| Problem severity | 4 | 5 | 5 | 4 | 3 |
| Problem frequency | 3 | 5 | 5 | 3 | 2 |
| Urgency to purchase | 2 | 3 | 4 | 2 | 2 |
| Ease of reaching users | 4 | 4 | 4 | 4 | 2 |
| Speed to real-world proof | 2 | **5** | 4 | 2 | 2 |
| Repeated-usage potential | 2 | **5** | **5** | 3 | 1 |
| Measurable customer value | 3 | 4 | **5** | 3 | 3 |
| Data flywheel | 3 | 5 | **5** | 3 | 4 |
| Defensibility | 3 | 3 | **5** | 3 | 2 |
| Expansion potential | 3 | 5 | 5 | 3 | 4 |
| Feasibility (small team) | 4 | 4 | 4 | 3 | 2 |
| Safety & liability | 4 | **2** | 4 | 4 | 3 |
| FM-absorption risk (5 = safe) | 4 | **2** | 4 | 3 | 3 |
| **Total** | **41** | **52** | **59** | **40** | **33** |

**Honest readings.** A — the current product — is not the company; it is a
subsystem. Its two proven facts (capture works; review is the bottleneck) and
two fatal-as-a-wedge facts (no application evidence; slow corpus growth) say
so. B has the highest frequency and the fastest kill-test in the portfolio,
but the worst safety exposure and the most FM-absorption risk on its own.
C has the best buyer alignment, the best data moat, and the best defensibility,
but as a standalone it is surveillance software techs will resent.

**The synthesis the matrix points to:** B and C are the two halves of one
loop. Assistance without verification is unsafe and absorbable; verification
without assistance is surveillance. An answer that ships with "here is how
you'll know it was right" *is* verification at the moment of assist; a
close-out check *is* the ground truth that makes the next answer better. One
system, two moments: **the moment of uncertainty and the moment of
completion.**

- **Recommended direction:** B+C as one product — the Field Judgment System.
- **Strongest alternative:** C alone (verify-first, manager-led). Safer,
  clearer buyer — chosen if experiment #1 kills the assist thesis.
- **Why the rest wait:** A becomes the tier-1 evidence source inside the
  system, not the product; D is an expansion once the corpus and verification
  exist; E is exhaust, not a company; FSM is a war we cannot win.

---

## 4. Recommended direction

**Actober is the field judgment system for physical work: it gives a
technician a verified next step at the moment of uncertainty, and proves the
job was done right at the moment of completion — starting with HVAC.**

This preserves the mission (worker capability up), keeps the founder's stated
long arc (humans → agents → robots coordination), and repositions the current
capture/review/library machinery as what it demonstrably is: the mechanism
that turns this company's experience into tier-1 evidence.

## 5. The strongest argument against my recommendation

We would be diluting the one behavior we have proven (capture: 22 jobs) to
chase a moment — the in-field consult — that a free ChatGPT tab may already
serve "well enough," in a domain where a wrong answer can electrocute someone;
and this company already retired copilot framing once for considered reasons.
If techs won't pull out a phone mid-job, or if raw model answers are already
good enough that our evidence layer adds no perceived value, the wedge
collapses into either A (slow) or C-alone (surveillance). This is the real
bear case. It is why experiment #1 is an offline eval that costs three days
and no product risk, why the design below is verification-first with
escalation as a success state, and why "do techs already ask ChatGPT on
jobs?" is the single most important evidence question on the list.

## 6. Ten-year vision and initial wedge

**Ten-year vision:** the trust layer for physical work. Every uncertain
moment assisted with cited evidence; every completed job verified against a
standard; the resulting corpus of situated, outcome-labeled field episodes
becomes the substrate on which human crews, AI agents, and eventually robots
are trained, evaluated, and coordinated. "Actober-verified" on a job means
what "UL-listed" means on a device.

**Initial wedge:** residential/light-commercial HVAC diagnostics at one
multi-site operator. First user: the 1–3-year tech alone on a call. First
painful moment: stuck at the equipment, unsure of the next check. First
repeatable workflow: ask → evidence-cited next step + verification check +
safety boundary → outcome tap → (at job end) close-out evidence check. First
measurable outcome: time-to-correct-next-step, and assisted first-time-fix
rate vs. the shop's baseline.

**Minimum trustworthy product (not minimum viable):** every answer carries a
citation and an evidence tier; every answer includes its own verification
step; hazard classes always append lockout language; "I don't know — call
Dave" is a first-class, well-designed outcome; every episode is logged.

**Human-review boundary:** company knowledge enters tier 1 only through
lead-tech review (unchanged from today). **AI autonomy boundary:** the system
proposes checks and explains reasoning; it never authorizes energized work,
refrigerant handling, gas work, or code-affecting decisions; the human always
decides. **Safety and escalation model:** three evidence tiers (T1 company-
reviewed > T2 manufacturer documentation > T3 model general knowledge, always
labeled); hazard hard-stop categories with mandatory escalation; correction
reporting feeds review; a standing eval suite of real episodes graded by
senior techs, re-run on every model or prompt change.

**Proprietary learning loop:** each consult writes an Episode — situation,
evidence shown, answer given, action taken, outcome. Close-out verification
and callback records label episodes with ground truth. Graded episodes become
evals; evals gate changes; corrections become tier-1 knowledge. Nobody else
has this data, and every job compounds it (the moat, per principle 6).

**Distribution:** founder-led sales to multi-site operators and consolidators
(existing outreach list); land with assist (techs want it), monetize with
verify (managers pay for callback reduction and proof); expand branch by
branch; later channels: manufacturers (support-call deflection) and insurers
(verified-work pricing). Store presence continues in parallel per your
standing decision.

**Expansion path:** HVAC diagnostics → HVAC install verification → adjacent
mechanical trades (refrigeration, plumbing, electrical) → verification as an
industry standard → the episode corpus as the training/eval substrate for
field agents and robots (Direction E as exhaust, Direction D as a product
line on top of the corpus).

## 7. Product and technical architecture (first principles)

**Surfaces.** (1) Field app: ask, evidence capture, close-out — glove-first,
camera-first, honest offline states. (2) Review workspace (web): lead tech
grades episodes, reviews corrections, curates tier-1 knowledge. (3) Manager
console: verification results, callback linkage, coaching signals. (4) API
for future channel partners.

**Core domain objects.** Organization, Member (role: tech/lead/manager);
**Asset** — the unit itself: nameplate, model, install date, service history
(new; today's model has no first-class equipment object, and situated
evidence demands one); Job (visit to an asset); **Episode** — the new atomic
unit: situation + evidence in + answer + citations + action + outcome;
EvidenceItem (photo/clip/reading/transcript, provenance-stamped);
KnowledgeItem (tiered: reviewed card | manual chunk | bulletin);
Checklist and VerificationResult; OutcomeRecord (first-time-fix, callback).

**Knowledge & evidence representation.** One store, three tiers with
provenance; manuals ingested and chunked per equipment model; company cards
as today; asset history as a retrieval source of equal rank to documents.

**Retrieval & reasoning.** One orchestrated pipeline, deliberately simple
(principle 7): classify hazard class → retrieve across tiers scoped to
org+asset → single model call answers with citations, verification step, and
tier labels → or refuses and escalates. No agent swarms until logged failures
prove the single pipeline insufficient.

**Evaluation system.** A golden set of real episodes (seeded from the 22
recorded jobs); a senior-tech grading surface; per-hazard-class precision
bars; regression run on every prompt/model change; model swaps are eval-gated
(re-ablate every generation — the Cherny rule).

**Permissions & tenancy.** Org-scoped everything (the existing scoping
pattern is the right one); cross-tenant sharing only for manufacturer-tier
knowledge, explicitly.

**Observability & correction.** Every episode logged end-to-end with answer
provenance; one-tap "this was wrong" routes to the lead tech; accepted
corrections become tier-1 items. **Feedback & outcomes:** helped/didn't at
answer time; verification at close-out; callback linkage through outcomes.

**Model-provider abstraction.** Thin provider layer; the eval suite, not
loyalty, decides the model. **Offline & field:** evidence capture queues
offline (the existing upload-queue design is correct); v1 answers require
connectivity and say so honestly; on-device caching of the org corpus later.
**Security & safety:** tenant isolation, hazard hard-stops, immutable episode
audit trail, incident review loop.

## 8. What should be reused or discarded

Verdict first: **continue from the current code.** The unknowns that can kill
this company are behavioral, not architectural; the new spine (Asset,
Episode, tiered KnowledgeItem) is additive to this schema; a rewrite burns
the pilot window for zero learning. The repo is our XB-1 — we keep the
airframe and iterate at the product level.

- **Reuse unchanged:** act-api core (FastAPI/SQLAlchemy/Postgres durable
  queue), auth + tenant scoping, offline upload queue, R2 + Deepgram
  integrations, admin review workspace, Field Instrument design system,
  marketing site.
- **Reuse with modification:** `/library/ask` → the Episode pipeline (tiered
  retrieval; the blanket live-diagnosis refusal becomes hazard-aware
  card/manual-grounded answering — the already-specced slice is step one);
  `knowledge_objects` → KnowledgeItem tier 1; `training_events` →
  Episode/outcome records; capture flow → general evidence capture (not only
  teachable-moment marks); Ask ACT panel → the field ask surface.
- **Useful experiment, not production architecture:** the ten-agent
  auto-chain (it grows tier-1 corpus; it is a subsystem, not the spine);
  the realtime LiveKit scaffold; the quiz/learn surface (parked, returns
  with Direction D).
- **Discard:** nothing wholesale — the dead surfaces were already removed in
  prior sweeps. The standalone embeddings branch should fold into tiered
  retrieval rather than ship separately.
- **Unrelated to the wedge (continues in parallel):** store submissions
  (your explicit call), marketing site, Supabase activation (infra, still
  blocked on your `supabase login`).

## 9. The first three real-world experiments

1. **The eval before the product** (~3 days, near-zero build, kills or
   confirms Direction B): extract 20–50 stuck-moments from the recorded
   jobs' transcripts; generate answers with and without company evidence;
   senior tech blind-grades against what he actually did. Bar: >50% "safe
   and useful" with evidence, and a visible gap over the no-evidence arm
   (that gap *is* our moat, measured).
2. **The retrieve-and-apply slice** (~1 day build, already specced and
   pending your approval): on-job ask over published cards with helped/
   didn't logging. Bar: ≥2 real-job uses by the second tech in 14 days,
   ≥1 marked helped.
3. **The close-out verification test** (~2 days, near-zero build): owner
   writes a 5-item done-right checklist for his most callback-prone job
   type; run existing footage/photos against it; owner grades the flags.
   Bar: ≥1 true catch the owner says would have prevented a callback.

Three experiments, ~one week of total build, each capable of killing its
direction. Whatever survives is the company.

## 10. Evidence I must collect from customers

1. What the second tech does today at a stuck moment — including whether he
   already asks ChatGPT (this single answer moves the FM-absorption risk
   from assumption to fact).
2. Whether phone-in-hand mid-job is real (gloves, attic, roof) or whether
   assist is a truck-cab moment — changes copy and UX, not the thesis.
3. Three separate willingness-to-pay conversations with the owner: assist,
   verify, training — priced independently, before we bundle.
4. Tech-side reaction to close-out evidence capture, asked plainly — the
   surveillance risk is cultural and cannot be engineered away.
5. The install base: which brands/models dominate his book (sets manual-
   ingestion priority and the Asset model's first schema).
6. The lead tech's named escalation preference ("call Dave" must be a real
   Dave who agreed).

## 11. Decisions that require your judgment as founder

1. **Liability posture for in-field guidance.** Hazard hard-stops and
   insurance are designable; accepting the residual risk is a founder call
   that defines the company. I can draft the safety case; only you can own it.
2. **Assist-first or verify-first go-to-market.** I recommend assist-first
   (techs love it, managers then pay for verify); the reverse is safer and
   slower. Your sales instinct with this client outranks my matrix.
3. **The public pitch.** "Intelligence layer for physical work" already
   covers this direction; deciding *when* the site/README shift from
   training-capture framing to field-judgment framing is a positioning call
   with pilot-client optics.
4. **The pilot client's role.** Design partner for the new direction (their
   experience gets messier) or protected reference customer (we learn
   slower). Pick one deliberately.
5. **Budget split** between store distribution (your standing override) and
   these three experiments over the next 30 days.

---

*Stop point: awaiting founder response. No code has been written. The
previously approved-pending slice (retrieve-and-apply) is unchanged and slots
in as Experiment #2 of this memo.*
