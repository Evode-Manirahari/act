# ACT / Actober

This file was deleted and rebuilt from scratch on 2026-08-13. The previous
version was 279 lines and ~5.2k tokens, read on every session. Most of it told
the model things it can read off the repo in one command, and four of its
claims had gone stale and were actively wrong.

**The rule for adding anything back:** a line earns its place only if it is
(a) not derivable from the repo, or (b) a rule that a real incident produced.
Do not add an instruction because it seems useful. Add it after watching the
model get the same thing wrong twice. Anything you can check with `ls`,
`git log`, or opening a file does not belong here.

Recover the old version with `git show <sha>:CLAUDE.md` if you want something back.

---

## What Actober is

Actober AI is building the intelligence layer for physical work, starting with
HVAC. Expert technicians film real jobs. Actober turns what they do, see, and
reason through into verified knowledge that guides other techs in the field,
with the original footage as proof.

Today's product is narrower than that sentence: capture a real job, detect the
teachable moment, ask the expert the right question *after* the job, compile a
structured card, review it, publish it, measure transfer.

**Wedge: HVAC** residential/commercial troubleshooting. Chosen for tight
feedback loops (no-cool/no-heat is a repeated, controlled event), measurable
outcomes (callbacks, first-time fix, time-to-diagnosis), and rich tacit signals
(sound, vibration, line temp, frost patterns).

**Users:** senior tech captures, lead tech reviews, apprentice learns.
**Buyer:** ops director / service manager / training lead at a 20-250 tech
multi-site operator, franchise group, or consolidator branch. Not the solo shop.

**Where it sits:** on top of generic simulation training (Interplay), not
against it. Generic training teaches the textbook. Actober captures the
company-specific tribal knowledge a generic catalog cannot hold. That
non-genericness is the moat.

## Say / do not say

The "do not say" list is the valuable half. Each line is a framing that was
tried and retired, and none of it is recoverable from the code.

- **Say:** "Cut callbacks and ramp new hires faster by capturing your senior
  techs' company-specific reasoning before they retire."
- **Say:** "Your senior techs pass on what they know without writing a word."
- **Do not say** "AI improvises answers in the field." Guidance comes from
  published, footage-backed, lead-tech-approved cards only.
- **Do not say** "employee retention software." Actober assumes people leave;
  the knowledge stays. (Bill discovery interview, July 2026.)
- **Do not say** "train the next generation" or position as generic apprentice
  training sold to solo shops. That is Interplay's hill and Actober loses there.

## The invariants an incident paid for

On 2026-07-31 an autopsy found the system had published five HVAC cards
compiled from a bare timestamp with no transcript and no human answer. The
"expert answers" were the moment's own metadata echoed back. They were deleted.
Nothing below is a style preference:

- **The client never asserts identity or provenance.** Not the expert's user
  id, not the account, not `source_type`, not whether something is field
  capture. The server derives all of it from a verified token and the actual
  evidence chain.
- **A mark is a hint, not evidence.** Captured evidence means a transcript or
  frame inside the moment's window.
- **A failed read is not an absence.** Never lower state or conclude "no card
  exists" from an error. Unconfirmed is its own state.
- **Compile and publish are fail-closed.** Missing or unreadable evidence means
  refuse, with reason codes, never a plausible guess.
- **Metrics and retrieval use the same eligibility rule as publication.** The
  dashboard that counted app tests as traction is how the fabrication went
  unnoticed for a month.

## Truth hierarchy

When sources disagree, do not average them. Use the higher one and open a task
to fix the lower:

```
physical work > production observation > deployed version and config
              > repo main and open PRs > documents and diagrams > prompts
```

A tested commit that is not deployed is a candidate capability, not a
capability. Never cite app-testing activity, seeded rows, or founder-operated
runs as customer usage.

**Current deployed state lives in `docs/truth-ledger.md`, not here.** Link to
the living source instead of copying it; a copy in this file is stale the day
after it is written. Verify against production before asserting anything about
what is running.

## Voice

Two voices, and picking the wrong one is obvious to a tradesperson.

**Debrief** (asking the expert, after the job): curious, specific, never
patronizing. The question a sharp apprentice would ask a master if they weren't
afraid to. "At the 4:12 mark you stopped and looked at the line set. What told
you to check there first?"

**Apprentice** (explaining a published card): direct, trade-calibrated, short
sentences, names the novice trap explicitly. "Frost on the suction line at this
temp means low charge or restricted airflow, not 'it's working hard'." "Don't
measure superheat on a TXV system to diagnose charge. Use subcooling."

There is no real-time-in-your-ear voice. That was the old product.

## Working rules

- **Extend, don't rebuild.** Read a file before touching it.
- **Always open a PR.** Never push to main without explicit approval.
- **Design:** read `DESIGN.md` before visual work. The system is "Field
  Instrument" — industrial, light-first, one hi-vis action color. Tokens live in
  `apps/mobile/src/theme/` and `apps/mobile/src/design/tokens/`; a static test
  in `src/design/__tests__` fails the build on drift, so the tokens are the
  source of truth, not a list of hex values in this file.
- **gstack** is the default helper workflow: `/review` before a PR, `/qa` on
  changed user flows, `/plan-eng-review` before major implementation.
- **gbrain** is indexed for this worktree. Prefer `gbrain search` / `code-def` /
  `code-refs` for semantic or symbol questions; `rg` for exact strings.

## Backend

The API lives in the sibling repo `../act-api` (Python, FastAPI, Postgres). It
is not a workspace member, so workspace commands do not reach it.

Everything else about it — routes, models, migrations, stack versions — read
from the repo. `app/routes/` and `app/models/` are the answer, and unlike this
file they cannot go stale.

---

## Observed stumbles

Boris Cherny's ablation method: delete the prompt, run it, and add a line back
only after watching the model repeatedly trip on the same thing. This file is
the "delete" half. This section is where the second half gets recorded.

Append a line here when you watch a model get the same thing wrong **twice**.
Include the date and what it actually did. When a line here has earned it,
promote it into the sections above.

_(empty — nothing observed yet since the 2026-08-13 rebuild)_
