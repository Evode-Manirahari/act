# ACT Capture - HVAC Operator Pilot

**Status:** current pilot operating plan, 2026-06-30
**Wedge:** HVAC residential and light-commercial troubleshooting
**Mode:** ACT Capture. Record senior-tech jobs, mark teachable moments, debrief after the job, publish reviewed training cards, and measure apprentice transfer.
**Buyer:** Owner-GM, service manager, operations director, regional service director, or training leader at a 20-250 tech multi-site HVAC/resi-commercial service operator, franchise group, or consolidator-owned branch. Not a solo shop. Not the apprentice.

## 1. Pilot Thesis

ACT is not a live copilot. It is a company-specific expertise capture system.

The buyer problem is not "make training content." The buyer problem is that callbacks, slow new-hire ramp, and retiring senior techs all leak money from the same place: hard-won field judgment that never becomes reusable company knowledge.

The pilot proves one claim:

> In 60 days, ACT can turn real senior-tech jobs into a reviewed training library that helps new or junior techs make better next-step and hazard-ID decisions on the operator's own equipment mix.

## 2. Ideal Design Partner

Start with one paid concierge pilot. Do not spread across several small shops.

Target profile:

1. 20-250 tech HVAC/resi-commercial service operator — multi-site operator, franchise group, or consolidator-owned branch — with service volume high enough that callbacks and ramp time matter.
2. Owner-GM, service manager, operations director, regional service director, or training leader with budget or direct influence over callback/ramp metrics.
3. At least one senior tech with 10+ years of field judgment who is willing to be recorded on real jobs.
4. At least two apprentices, helpers, or early-career techs who can use the cards during the measurement window.
5. Access to callback, first-time-fix, and time-to-billable signals, even if the baseline is imperfect.

Good first targets:

- ARS / Rescue Rooter regional branches
- CoolSys regional service teams
- Service Champions and similar regional operators
- One Hour Heating & Air Conditioning franchise groups
- Private-equity rollups with branch-level training pain

Solo shops are useful for discovery and referral paths, but they are not the pilot buyer.

## 3. Commercial Offer

**Offer:** 60-day paid concierge pilot.

Pilot structure:

- 6 weeks of active capture and review
- 4 weeks of measurement and operator readout
- One region or branch
- One senior tech as the primary capture source
- One lead reviewer, which may be the same senior tech for pilot speed
- Two to five apprentices or early-career techs as learners

Pilot target:

- 20 captured expert jobs
- 50 reviewed and published training cards
- Pre/post scenario assessment for each learner
- Callback/ramp readout against the operator's available baseline

Pricing signal:

- Flat pilot fee around $4k to $5k
- Refund or credit if fewer than 30 reviewed cards are published for reasons inside ACT's control
- Post-pilot expansion priced per tech seat or per branch, justified against callback reduction and ramp time

## 4. Product Loop Under Test

The pilot tests this exact loop:

1. **Record:** senior tech starts capture at the beginning of a diagnostic job.
2. **Mark:** senior tech taps Mark when a teachable moment happens.
3. **Process:** backend extracts transcript, frames, and proposed moments.
4. **Review evidence:** lead reviewer sees timestamp, transcript, frame evidence, score, and safety flags.
5. **Debrief after the job:** ACT asks the expert for the reasoning, novice trap, and safety boundary.
6. **Compile:** ACT turns approved evidence and expert answers into a draft card.
7. **Safety review and publish:** reviewer approves before the card enters the apprentice library.
8. **Learn:** apprentice studies card and completes quiz/interactions.
9. **Measure:** training events and job outcomes show whether transfer is happening.

Everything important happens after the job. ACT does not tell a tech what to do live in the field.

## 5. Weekly Operating Cadence

### Week 0 - Setup

- Confirm operator sponsor, senior tech, reviewer, and learner roster.
- Install the mobile app on the senior tech's device.
- Run one practice capture in the shop.
- Confirm consent script and customer-facing recording language.
- Capture baseline: callbacks, first-time-fix, and learner scenario scores.

### Weeks 1-6 - Capture and Review

Senior tech:

- Records 2 to 4 diagnostic jobs per week.
- Marks teachable moments live.
- Uploads recordings by end of day on reliable network.
- Answers debrief questions after the job by voice or text.

Reviewer:

- Reviews proposed moments daily or every other day.
- Rejects noise quickly.
- Confirms safety-sensitive moments before publish.
- Publishes only cards that match company-approved practice.

ACT:

- Produces evidence-first proposed moments.
- Generates expert debrief questions.
- Compiles draft cards.
- Logs apprentice usage and job outcomes.

### Weeks 7-10 - Measurement

- Apprentices complete the same scenario assessment used at baseline, with randomized order.
- Operator reviews callback and first-time-fix deltas where data exists.
- Sponsor interview decides whether ACT expands, pauses, or changes scope.

## 6. Pilot Metrics

### Leading Indicators

| Metric | Target | Why it matters |
|---|---:|---|
| Expert approval rate | >= 60% | Proposed moments are real signal, not noise |
| Published cards per week | >= 5 | Capture loop is producing reusable objects |
| Senior-tech extra time | <= 5 min per job | Workflow is light enough to survive real field work |
| Apprentice card completion | >= 50% | Learners actually engage |
| Debrief completion rate | >= 70% of approved moments | Expert reasoning is being captured, not just video |

### Lagging Indicators

| Metric | Target | Why it matters |
|---|---:|---|
| Scenario score improvement | >= 25% mean lift | Cards transfer judgment, not just facts |
| Hazard-ID score improvement | >= 30% mean lift | Safety boundaries are landing |
| First-time-fix change | Directionally positive | Buyer value connects to operating metrics |
| Callback change | Directionally positive | Buyer can justify rollout |
| Expansion intent | Paid branch or seat expansion | Pilot has commercial pull |

Do not optimize for AI response count, recording length, or real-time answer accuracy. Those are not the product.

## 7. Trust, Consent, and Safety

Trust is part of the product surface.

Built or in progress:

- Senior tech controls capture and mark points.
- `do_not_share` consent blocks capture usage.
- Redaction backend services exist.
- Review queue blocks unreviewed publishing.
- Safety review gates publishing.
- Apprentice events require correct learner identity when available.
- Published-card Ask ACT answers only from reviewed library content.

Still needed before a serious paid pilot:

1. **Redaction UX:** reviewer can request source redaction from the review surface and see recording redaction state. Purge remains an admin/backend action.
2. **Jurisdiction/company-approved label:** cards should visibly say "company-approved" and show jurisdiction when present.
3. **Consent artifact:** one-page customer-facing recording card and operator agreement clause.
4. **Reviewer accountability:** published cards should show who approved them and when.
5. **CI gate:** every push should run lint, typecheck, tests, and build.

## 8. Outreach Script

Short version:

> We help HVAC operators capture the judgment of senior techs before it walks out the door. A senior tech records real diagnostic jobs, taps Mark on teachable moments, and answers a few questions after the job. ACT turns that into reviewed training cards for your new techs, tied back to callbacks and ramp time. We are not telling techs what to do live. We are preserving how your best techs think on your own accounts.

Fit questions:

1. How long until a new service tech is trusted on diagnostic calls?
2. Which callback categories are most expensive right now?
3. Who is the senior tech everyone calls when a job gets weird?
4. Would that person tolerate recording if they controlled what gets published?
5. Can you give us two apprentices and a callback baseline for 60 days?

## 9. Go / No-Go Criteria

Go forward if:

- Senior tech records at least 12 jobs in the first 3 weeks.
- Reviewer publishes at least 15 cards by the midpoint.
- Expert approval rate stays above 50%.
- Apprentices complete cards without hand-holding.
- Operator sponsor can name the operating metric they want ACT to move.

Stop or re-scope if:

- Senior tech will not record real jobs.
- Review queue fills with unusable or unsafe moments.
- Cards are generic textbook material instead of company-specific judgment.
- Apprentices do not engage.
- Operator sees the output as "interesting content" but not callback/ramp leverage.

## 10. Engineering Priorities For Pilot Readiness

Priority order:

1. Keep the review/debrief/publish path tight and safe.
2. Add CI so regressions are caught before demos.
3. Ship redaction and jurisdiction/company-approved UX.
4. Make the weekly operator report visible from existing metrics.
5. Defer generic KB expansion until real captured cards expose gaps.

The product wins by capturing real operator-specific judgment. Anything that makes ACT look like generic HVAC chat or live advice is a regression.
