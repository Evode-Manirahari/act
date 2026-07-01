# Design System — ACT ("Field Instrument")

## Product Context
- **What this is:** ACT captures how senior HVAC techs diagnose hard jobs, before they retire, and turns it into company-specific training that cuts callbacks.
- **Who it's for:** senior tech (captures, Field), lead tech (approves, Review), apprentice/new hire (learns, Lessons). Buyer = ops director at a multi-site operator.
- **Space/industry:** HVAC/refrigeration field service; trades training.
- **Project type:** React Native (Expo) mobile app.
- **The one memorable thing:** "a serious field tool" — a 30-year tech and an ops director both look at it and trust it. Every choice below serves that.

## Aesthetic Direction
- **Direction:** Industrial / Utilitarian — "Field Instrument."
- **Decoration level:** minimal/intentional. Structure is the decoration: sturdy borders, hairline rules, clear hierarchy. No gradients, no decorative blobs, no bubble-radius everything.
- **Mood:** high-contrast, function-first, credible. Reads like a well-made gauge, not a consumer app.

## Typography
- **Display/Hero + Body / UI / Data:** **Geist** (400/500/600/700). General Sans was the original display pick; standardized on Geist so the app bundles one family cleanly (loaded via `@expo-google-fonts`).
- **Instrument accent:** Geist Mono (500/600) — used on ALL numbers, metrics, IDs, and section labels (the callback %, "$1,400", superheat, "TEACHABLE MOMENT 0:42"). This mono accent is the signature move; it makes the app read like a field instrument.
- **⚠️ RN weight rule (do not forget):** custom Geist does **not** synthesize weight from `fontWeight`. `fontWeight: '700'` on a Geist style silently renders the wrong weight (or the system font). ALWAYS pick the weight by named family — `fonts.bold`/`fonts.semibold`/`fonts.medium`, or `ActText weight="bold"`. Never use `fontWeight` on app text.
- **Scale (px, as implemented in `type`):** display 27/32 (tracking −0.4) · h1 21/26 (−0.2) · h2 18/24 · bodyStrong 15/22 · body 15/22 · small 13/18. The mono uppercase `label` is 11px, letter-spacing 1.

## Color
- **Approach:** restrained. One hi-vis action color; everything else ink + cool steel neutrals; loud semantics only where they matter (safety).
- **Ink (text/headers):** `#14181F`
- **Safety Orange (single action color — CTAs, record, primary):** `#EA580C`; pressed/border `#C2410C`; tint `#FFF4ED`
- **Background:** `#F5F6F7` (cool steel neutral) · **Surface:** `#FFFFFF`
- **Neutrals (steel scale):** 100 `#E4E7EB` · 300 `#C3C9D0` · 500 `#586170` · 700 `#2B313B` · 900 `#14181F`
- **Semantic:** Danger/lockout `#C81E1E` (tint `#FDEBEB`) · Caution `#B45309` · Verified `#15803D`
- **Mode:** light-first (sunlight legibility). Dark mode deferred; if added, redesign surfaces and drop saturation ~15%.

## Spacing
- **Base unit:** 8px. **Density:** comfortable.
- **Tap targets:** ≥48px (gloved hands, field use).
- **Scale:** 2xs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · 3xl 48.

## Layout
- **Approach:** grid-disciplined. Predictable, sturdy alignment.
- **Border radius (`radii`):** sm 4 · md 6 (default: cards/buttons/inputs) · lg 8 · xl 14 · sheet 18 · full 999. `full` is reserved for true toggles only — status/tag chips use `sm` (squared instrument tag), never a rounded pill.
- **Information architecture — 3 tabs for the 3 users:**
  - **Field** — record a job, mark the teachable moment (capture). Primary action = safety-orange.
  - **Review** — lead tech approves/edits a proposed moment before publish.
  - **Lessons** — apprentice library + the lesson card.

## Component notes
- **Lesson card (hero):** clip thumbnail (with mono "TEACHABLE MOMENT 0:42") → title (General Sans) → **cost-anchor chip** ("$1,400 part avoided", mono, orange-tinted, left orange rule) → **Reasoning** → **Novice traps** (✕ bullets in danger red) → **Safety boundary** rendered as a lockout-style panel (heavy `#C81E1E` left rule, alert icon, tinted bg) → primary "Take the quiz" button.
- **Cost/impact is first-class** on every card — it's the ROI hook for operators.
- **Section labels:** mono, uppercase, steel-500, letter-spacing 0.1em.
- **Safety always reads loud** — never a soft tip; always the lockout panel treatment.

## Implementation — `apps/mobile/src/design/`
The system is code, not just this doc. **Build on the primitives; don't hand-roll styles.** Import from `../design` (or `../design/tokens`).

**Tokens** (`src/design/tokens/`): `colors` · `type` + `fonts` + `labelStyle` + `TypeScale` · `spacing` (+ `tapTarget` 48) · `radii` · `shadows` (`none`/`cta`/`slab`/`overlay`) · `motion` (`durations`/`easings`/`haptics`). `colors`/`fonts`/`labelStyle` are re-exported from `src/theme/` — the theme files stay the canonical source; the design barrel just adds the `type` scale and the primitives.

**Primitives** (`src/design/components/`):
- **ActText** — the only text component. `variant` (display/h1/h2/bodyStrong/body/small/`label`), `color` (ink/text/textMuted/textLight/steel700/primary/success/error/caution/surface), `mono`, `weight` (named Geist family). Use this instead of raw `<Text>` so the RN weight rule can't be violated.
- **ActButton** — the one action primitive. `variant` primary/secondary/danger/ghost, `size` md/lg (lg = 76px field CTA), `loading`, `detail`. Meets the 48px tap target.
- **ActInput** — labeled steel-fill field (mono label, radius 6, `multiline` grows + top-aligns). Label optional so it doubles as a bare input.
- **ActCard** — neutral surface, border not shadow. `accent` (steel/orange/warn/err/ok left rule, or `top` for the orange top-rule stat tile), `tone` (surface/warn/err/ok tint for lockout/caution/verified panels), `onPress`, `padded`.
- **ActPill** — mono uppercase instrument tag. `tone` neutral/orange/ok/err/warn, `dot`. Squared (radii.sm) — the canonical chip; match it for any bespoke status pill.
- **ActScreen** — standard screen body (padded 20, gap-16 ScrollView, steel bg, hidden scrollbar). `scroll={false}` for fixed bodies; `refreshControl` supported.
- **ActEmptyState** — the honest empty/error surface: capture-frame corner-bracket glyph + title + calm body + optional action. `tone="err"` for the danger-tinted variant.

**Signature panels:** safety/lockout → `ActCard tone="err" accent="err"` + `!` glyph; caution/novice-trap → `tone="warn" accent="warn"`; verified → `ok`. Numbers/ids/timers/counts → `mono`.

## Motion
- **Approach:** minimal-functional only. No bounce.
- **Easing:** enter ease-out, exit ease-in, move ease-in-out.
- **Duration:** micro 80ms · short 180ms · medium 300ms.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-05 | Initial system "Field Instrument" created | /design-consultation. Anchored to "a serious field tool." Industrial/utilitarian, mono-accented data, lockout-style safety, single hi-vis orange action color. |
| 2026-07-01 | System implemented as code in `src/design/` (tokens + 7 primitives); all 5 screens + Review components moved onto it | Codify the spec so UI is built, not re-derived. Reconciled doc to reality: Geist for display (not General Sans), real `type` scale, the RN named-weight rule, squared chips (removed the last rounded-999 pills and the dead legacy round-bubble MarkButton). |
