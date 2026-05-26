# ACT Capture — HVAC Pilot Plan

**Status:** draft v1, 2026-05-25
**Owner:** Evode Manirahari
**Wedge:** HVAC residential / light commercial troubleshooting
**Mode:** ACT Capture (moment capture + expert debrief → reviewed training cards). Not real-time copilot.

---

## 1. What we are selling

> Your best HVAC techs train the next generation without writing documentation.

We are **not** selling AI that tells techs what to do. We are selling **apprentice ramp speed** and **preservation of senior expertise** — the institutional knowledge that walks out the door when a 30-year master retires.

Concretely, the pilot delivers:

- **20 captured expert jobs** turned into **50 reviewed training cards** over a 6-week window.
- Each card = short clip + the expert's *why* + the novice trap + the safety boundary + a quiz.
- A measurable improvement in apprentice hazard ID and next-step decisions, pre/post.

What the buyer (shop owner / GM) hears: *"In six weeks you'll have a library that makes a 19-year-old apprentice notice what your best tech notices."*

---

## 2. Target design partners

We want **3 paid design partners.** Criteria, in order:

1. **Has ≥1 senior tech (10+ years)** willing to be recorded on real jobs. This is the gating constraint.
2. **Has ≥2 apprentices** (or new hires < 2 years) who can be the learning target.
3. **Residential or light commercial** service work — pure new-construction shops have less diagnostic variability per call.
4. **Owner is hands-on** with training and feels the ramp cost (most do — apprentices are expensive).
5. **Located in CA / AZ / NV** so service density is high and seasonal cooling load runs through the pilot window.

### Candidate list (to fill in)

| # | Company | Contact | Source | Why a fit | Status |
|---|---|---|---|---|---|
| 1 | _____________ | _____________ | _____________ | _____________ | not contacted |
| 2 | _____________ | _____________ | _____________ | _____________ | not contacted |
| 3 | _____________ | _____________ | _____________ | _____________ | not contacted |
| 4 | _____________ | _____________ | _____________ | _____________ | reserve |
| 5 | _____________ | _____________ | _____________ | _____________ | reserve |

**How to find them:**
- HVAC Reddit, /r/HVAC, /r/HVACAdvice — DM owners who post about training pain
- Local ACCA + HARDI chapter meetings
- Existing electrical-side crew relationship from `project_act_customer_discovery` — ask which HVAC contractors they sub to or refer
- LinkedIn: "Owner / GM, HVAC contractor, < 50 employees, San Francisco Bay Area / Phoenix / Las Vegas"

---

## 3. Outreach script

### Cold message (text or LinkedIn DM, ~80 words)

> Hey [Name], I'm building a tool for HVAC contractors that captures what your senior techs already know — the diagnostic shortcuts, the novice traps, the safety stuff that lives in their head — and turns it into short training cards your apprentices can practice with. No writing required. 6-week paid pilot, 3 shops. Worth a 20-min call to see if your shop is a fit?

### First call (20 min — qualify, don't sell)

1. (3 min) Their training pain today. *How do you onboard a new tech? What part costs you the most time?*
2. (5 min) The wedge. *Walk through the capture loop in 3 sentences.* "Senior tech records, taps Mark on teachable moments, answers 3 questions later. We turn it into apprentice cards."
3. (5 min) What they would pay for. *Is this nice-to-have or is it the apprentice-ramp problem?*
4. (4 min) Fit check. Do they have ≥1 senior + ≥2 apprentices? Is the senior willing? Are they OK with consent on residential calls?
5. (3 min) Next step. Schedule the in-person kickoff if they're in.

**If they push back on AI:** *"We are not asking AI to tell your tech what to do. The AI's job is to listen to what your tech already says, find the moments worth keeping, and ask a follow-up question after the job. Your tech approves everything."*

**If they push back on recording:** *"The senior tech owns the marks. Nothing gets published without their approval. We can blur faces and customer-identifying details before any card leaves your shop."*

### Pilot agreement (signed before kickoff)

- **Term:** 6 weeks of active capture + 4 weeks of measurement.
- **Price:** $500 / week / shop during capture, $0 during measurement. Refund if < 30 reviewed cards published.
- **Roles:** The **senior tech being recorded is also the lead tech** for the pilot — they approve their own moments and edit their own questions. Single neck-to-wring, fastest feedback. Post-pilot we can split the lead-tech role out to a GM or designated trainer.
- **Data:** Their recordings, their cards. We retain anonymized rule-engine outputs for product improvement. Nothing leaves the shop without senior tech approval.
- **Exclusivity:** No exclusivity. They can stop at any time. We can publish anonymized aggregate metrics for marketing.

---

## 4. Capture week — what actually happens

| Day | Activity | Owner |
|---|---|---|
| **Monday** | Kickoff. 90 min on-site. Install dev-client on senior tech's phone (Android APK or iOS via TestFlight). Walk through Mark button. Run one practice capture in the shop. | Evode + senior tech |
| Mon–Fri | Senior tech records 2-3 jobs/day. Marks teachable moments live. Uploads at end of day on shop wifi. | Senior tech |
| End of Wed | Mid-week check-in (10 min phone call). Anything broken? Anything annoying about the flow? | Evode |
| Daily | Backend processes recordings overnight. Moments + draft questions appear in the lead-tech review queue by morning. | act-api |
| Tue–Sat | Lead tech (could be the senior or shop GM) approves/edits moments, sends 3-5 questions back to the senior tech. Senior tech answers via in-browser voice recorder. | Lead tech + senior |
| **Saturday** | Wrap-up call (20 min). Review the week's published cards. Decide if anything needs to change before Week 2. | Evode + lead tech |

**Per-week target:** 4 captured jobs → 8-12 reviewed moments → 5-8 published training cards.
**Six-week total target:** 20 captured jobs → 50 published training cards.

---

## 5. Metrics

Tied to the schemas in act-api so they fall out of the existing dashboards.

### Leading indicators (captured during pilot)

| Metric | Source | Target |
|---|---|---|
| Expert approval rate | approved Moments / proposed Moments (`Moment.status`) | ≥ 60% — proves the rule engine is finding real moments, not noise |
| Question usefulness | mean expert rating on each `ElicitationQuestion` (1-5) | ≥ 4.0 — proves the question generator is asking what experts want to answer |
| Senior tech time per job | self-reported minutes from senior tech | ≤ 5 min / captured job on top of normal job time |
| Published cards / week | count of `KnowledgeObject` rows with `status='published'` | ≥ 5 / week |
| Card completion rate | `training_events` where `event_type='quiz_completed'` / `event_type='viewed'` | ≥ 50% — proves apprentices actually engage |

### Lagging indicators (apprentice transfer — Weeks 7-10)

Each apprentice takes a **scenario assessment** in Week 0 (pre-pilot) and Week 10 (post-pilot). Same 15 HVAC scenarios both times, randomized order.

**Sourcing (locked 2026-05-25):** Hybrid. Evode drafts **10 scenarios** from public HVAC training material (ACCA, Carrier University, NATE practice banks) covering core no-cool / no-heat / airflow / electrical / refrigerant traps. A known senior tech is paid **$300–500** to write **5 high-tacit-judgment scenarios** — the kind of "I just knew" calls that don't show up in textbooks. Hybrid keeps the Week 0 baseline shippable while still capturing the moment-of-judgment patterns the pilot is meant to surface.

1. "Frost on the suction line, 78°F return — what's your next reading?" (correct: airflow before charge)
2. "Compressor hums 5 sec then trips on overload — what do you check first?" (correct: run cap microfarads)
3. "Subcool of 3 on a TXV system — what does that tell you?" (correct: low charge)
4. (...12 more — 7 more from Evode + 5 from the commissioned senior tech)

| Metric | Source | Target |
|---|---|---|
| Apprentice scenario score Δ | (Week 10 score − Week 0 score) / Week 0 score, per apprentice | ≥ +25% mean improvement |
| Hazard-ID accuracy Δ | subset of scenarios that are safety-boundary moments | ≥ +30% mean improvement |
| First-time-fix rate Δ | from `JobOutcome.first_time_fix` rows in pilot vs prior 90 days | ≥ +5 percentage points (noisy — directional) |
| Manager value | "Would you pay $X/seat/month to continue?" | ≥ 2 of 3 shops say yes at $50+ per apprentice/month |

### Anti-metrics (things we explicitly are NOT optimizing for)

- Number of AI responses generated → meaningless if not approved
- Real-time accuracy → not a real-time product
- Capture session length → longer ≠ better

---

## 6. Trust, consent, safety

These are product features, not legal footnotes.

| Risk | Product response | Status |
|---|---|---|
| Tech feels surveilled | Senior tech owns marks + approvals. No individual performance scoring during pilot. | ✅ Built |
| Customer privacy | `Recording.consent_state` defaults to `internal_training`. Future redaction workflow. | ⚠️ Defaulted; redaction UX = TODO |
| Unsafe AI instruction | Training cards require lead-tech approval before publish. Real-time advisory only, never authoritative. | ✅ Built (admin review queue) |
| Code variability | Cards tagged with state/local jurisdiction. Mark as "company-approved", not "code-approved". | ⚠️ Tagging field exists; jurisdiction UX = TODO |
| Bad capture quality | Reviewers can reject unusable clips. | ✅ Built |
| Trade resistance | Credit the master by name in the card. Mentorship framing, not replacement. | ✅ Copy uses "your best tech" framing |
| Interruption policy | `do_not_interrupt` flag on Moments. Questions queued for post-job. Brazing / vacuum / driving windows blocked. | ✅ Built (PR #4 hardening) |

### Consent script for the senior tech (give to them before Day 1)

> Before any video leaves your shop, you have to approve it. The Mark button only saves the moment — the camera was already running, that's not new. The system asks you 3 short questions when you're off the job. You can delete any moment, edit any question, or pull a card before it goes to an apprentice. Nothing publishes without you.

### Consent script for the customer (residential — printed card to leave on the truck)

> Your tech is part of a training program. Their phone is recording the work area to help train newer techs. We do not record inside private rooms or capture identifying information. If you would prefer they stop recording on this visit, just ask — there's no impact on your service.

**Legal floor (locked 2026-05-25):** Before Week 1, the consent card + pilot agreement go to a contracts paralegal for a one-shot template review ($200–500). Goal is not a full lawyer pass — it is a defensible artifact that addresses CA/AZ/NV two-party recording rules and the AI/training-data use clause specifically. If the paralegal flags a state-specific issue, we ship a state-tagged variant of the card.

---

## 7. Pricing & commercial framing

**Pilot:** $500 / shop / week during the 6 active capture weeks = $3,000 per shop. $9,000 total across 3 shops if all in.

**Post-pilot price (signaled, not committed):** $50–100 / apprentice / month. The buyer is the shop owner; the price scales with the apprentice headcount (the thing they're trying to make more efficient).

**Why this works:**
- $50 / apprentice / month is < 1 hour of a senior tech's billable rate. Easy ROI math.
- The pilot price is high enough that they take it seriously and low enough that 3 shops is realistic for a single-founder push.
- We give one full refund clause (< 30 cards) to remove buyer risk.

---

## 8. Timeline

| Week | Milestone | Owner |
|---|---|---|
| Week 0 (now, 2026-05-25) | Finalize this doc. Apple Developer enrollment (in progress). Real-iPhone build verified. | Evode |
| Week 1 | First 5 outreach DMs sent. Aim: 2 qualified calls. | Evode |
| Week 2 | 3 signed pilot agreements. Apprentice pre-pilot assessments administered. | Evode + 3 shops |
| **Weeks 3–8** | Capture weeks 1–6 (6 weeks of active capture, see §4). | All |
| Weeks 9–10 | Measurement — apprentice post-pilot assessments, manager interview, churn / continue decision. | Evode + 3 shops |
| Week 11 | Pilot retro. Decide commercial structure for Round 2. | Evode |

---

## 9. What kills the pilot

Things we have to watch and respond to:

- **No senior tech will agree to be recorded.** Mitigation: lead with the "credit the master" framing. Show the admin review queue — they own the publish button.
- **Manual marks dry up after Day 2.** Mitigation: mid-week check-in catches this. If the Mark button is friction, fix it before Week 2.
- **Apprentices ignore the cards.** Mitigation: ship the Learn tab with quiz scoring + streak. Make completion visible to the shop owner.
- **Cards don't transfer (Week 10 score = Week 0 score).** Mitigation: this is the existential question. If transfer is zero we have a design problem in the cards themselves, not the capture loop.
- **Shop owner won't pay post-pilot.** Mitigation: the manager interview at Week 9 surfaces this before we ask. If they say "this is interesting but not $50/apprentice", we re-price or re-scope.

---

## 10. Decisions locked (2026-05-25)

- [x] **Scenario sourcing:** Hybrid — Evode drafts 10, commissions 5 from a paid senior tech ($300–500). See §5.
- [x] **Consent legal floor:** Paid paralegal template review ($200–500) before Week 1, not a full lawyer pass. See §6.
- [x] **Pricing:** $500/wk paid pilot with refund-if-<30-cards clause. No free-for-case-study variant. See §3 / §7.
- [x] **Lead tech role (pilot only):** The senior tech being recorded IS the lead tech. Single neck-to-wring. See §3.

### Still open

- [ ] **Which 3 contractors specifically?** Names go in §2. Method: (a) ask the existing electrical crew which HVAC contractors they sub to or refer, (b) DM 5 owners who posted recently in /r/HVAC about training pain, (c) one ACCA-chapter intro in Bay Area / Phoenix. Aim for 5 quality leads → 3 signed.

---

*This doc is the source of truth for pilot execution. Update it as we go. When the migration ledger in [project_act_trade_wedge](../.claude/projects/-Users-evodemanirahari/memory/project_act_trade_wedge.md) says "pilot complete," that means the §5 lagging indicators are measured and recorded here.*
