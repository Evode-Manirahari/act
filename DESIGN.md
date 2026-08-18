# Design System — ACT ("Field Instrument")

## Product Context
- **What this is:** ACT captures how senior HVAC techs diagnose hard jobs, before they retire, and turns it into company-specific training that cuts callbacks.
- **Who it's for:** senior tech (captures, Field), lead tech (approves, Review), apprentice/new hire (learns, Lessons). Buyer = ops director at a multi-site operator.
- **Space/industry:** HVAC/refrigeration field service; trades training.
- **Project type:** React Native (Expo) mobile app, plus two Next.js surfaces on the same system — the marketing site (`apps/site`) and the lead-tech review console (`apps/admin`).
- **The one memorable thing:** "a serious field tool" — a 30-year tech and an ops director both look at it and trust it. Every choice below serves that.

## Aesthetic Direction
- **Direction:** Industrial / Utilitarian — "Field Instrument."
- **Decoration level:** minimal/intentional. Structure is the decoration: sturdy borders, hairline rules, clear hierarchy. No gradients, no decorative blobs, no bubble-radius everything.
- **Mood:** high-contrast, function-first, credible. Reads like a well-made gauge, not a consumer app.

## Typography
- **Display/Hero + Body / UI / Data:** **Geist** (400/500/600/700), loaded via `@expo-google-fonts` on mobile and `next/font` on web.
- **Instrument accent:** Geist Mono (500/600) — used on ALL numbers, metrics, IDs, and section labels (the callback %, "$1,400", superheat, "TEACHABLE MOMENT 0:42"). This mono accent is the signature move; it makes the app read like a field instrument.
- **⚠️ RN weight rule (do not forget):** custom Geist does **not** synthesize weight from `fontWeight`. `fontWeight: '700'` on a Geist style silently renders the wrong weight (or the system font). ALWAYS pick the weight by named family — `fonts.bold`/`fonts.semibold`/`fonts.medium`, or `ActText weight="bold"`. Never use `fontWeight` on app text.
- **Scale (px, as implemented in `type`):** display 27/32 (tracking −0.4) · h1 21/26 (−0.2) · h2 18/24 · bodyStrong 15/22 · body 15/22 · small 13/18. The mono uppercase `label` is 11px (tracking 1); `labelSmallStyle` is 10px (tracking 0.8) for dense rows.
- **⚠️ 10px is the floor.** Nothing renders below `labelSmallStyle`. Sub-10px mono is unreadable on a bright roof, which is the premise of the whole system — if a label doesn't fit, the layout is too dense. An invariant test fails the build on a smaller `fontSize`.

## Color
- **Approach:** restrained. One hi-vis action color; everything else ink + cool steel neutrals; loud semantics only where they matter (safety).
- **Ink (text/headers):** `#14181F` · **Background:** `#F5F6F7` (cool steel) · **Surface:** `#FFFFFF` · **On solid fills:** `#FFFFFF`
- **Neutrals (steel scale):** 100 `#E4E7EB` · 300 `#C3C9D0` · 500 `#586170` · 700 `#2B313B` · 900 `#14181F`
- **⚠️ Every semantic family is a full 4-role ramp.** `base` (the loud color: rules, icons, solid fills) · `Light` (tint used as a panel background) · `Border` (hairline separating that tint from the page) · `Ink` (text readable ON the tint — the base is too light to read). Components must never invent a fifth value; a missing shade gets added to `theme/colors.ts`, not to a StyleSheet. Defining only base+tint is exactly how 13 files ended up with five different greens. An invariant test fails the build on a raw hex outside the palette.

  | Family | base | Light | Border | Ink |
  |---|---|---|---|---|
  | Safety Orange (the single action color) | `#EA580C` | `#FFF4ED` | `#F6D3BC` | `#C2410C` (also pressed) |
  | Verified | `#15803D` | `#E7F5EC` | `#BCE3C6` | `#0E6B30` |
  | Danger / lockout | `#C81E1E` | `#FDEBEB` | `#EBC4C4` | `#7A1212` |
  | Caution | `#B45309` | `#FEF3C7` | `#F1D7A8` | `#7C3B06` |

- **Mode:** light-first (sunlight legibility). Dark mode deferred; if added, redesign surfaces and drop saturation ~15%.

## Spacing
- **Base unit:** 8px. **Density:** comfortable.
- **Tap targets:** ≥48px (gloved hands, field use).
- **Scale:** 2xs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · 3xl 48.

## Layout
- **Approach:** grid-disciplined. Predictable, sturdy alignment.
- **Border radius (`radii`):** sm 4 · md 6 (default: cards/buttons/inputs) · lg 8. That's the whole set — there is deliberately **no pill token**, so a 999 bubble can't be reached for by habit. Status/tag chips use `sm` (squared instrument tag).
- **Information architecture — 3 tabs for the 3 users:**
  - **Field** — record a job, mark the teachable moment (capture). Primary action = safety-orange.
  - **Review** — lead tech approves/edits a proposed moment before publish.
  - **Lessons** — apprentice library + the lesson card.
- **⚠️ This is not a chat app.** The home screen opens on the field-size Record CTA, not a greeting or a composer; the drawer leads with Record, not "+ New chat"; Ask ACT is one destination among several because it only answers from published cards. Any surface that starts to look like a familiar assistant home is drifting away from "a serious field tool."
- **Nothing renders a zero.** An empty queue shows no row at all, not a tile reading "0" — that's one more thing to parse on a roof. And never show a readout of a value the user just typed into the field beneath it.

## Component notes
- **Lesson card (hero):** clip thumbnail (with mono "TEACHABLE MOMENT 0:42") → title (Geist display) → **cost-anchor chip** ("$1,400 part avoided", mono, orange-tinted, left orange rule) → **Reasoning** → **Novice traps** (✕ bullets in danger red) → **Safety boundary** rendered as a lockout-style panel (heavy `#C81E1E` left rule, alert icon, tinted bg) → primary "Take the quiz" button.
- **Cost/impact is first-class** on every card — it's the ROI hook for operators.
- **Section labels:** mono, uppercase, steel-500, letter-spacing 0.1em.
- **Safety always reads loud** — never a soft tip; always the lockout panel treatment.

## Implementation — `apps/mobile/src/design/`
The system is code, not just this doc. **Build on the primitives; don't hand-roll styles.** Import from `../design` (or `../design/tokens`).

**Tokens** (`src/design/tokens/`): `colors` · `type` + `fonts` + `labelStyle` + `labelSmallStyle` + `TypeScale` · `spacing` (+ `tapTarget` 48) · `radii` · `shadows` (`cta`/`slab`) · `motion` (`durations`/`easings`). `colors`/`fonts`/`labelStyle` are re-exported from `src/theme/` — the theme files stay the canonical source; the design barrel just adds the `type` scale and the primitives.

Tokens are kept to what the app actually uses. An unused token is a decision nobody made, and it invites the next person to reach for it instead of asking whether the surface needs it.

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
- **Easing:** enter ease-out, exit ease-in, move ease-in-out, sheet (custom bezier).
- **Duration:** short 180ms · sheet 320ms.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-05 | Initial system "Field Instrument" created | /design-consultation. Anchored to "a serious field tool." Industrial/utilitarian, mono-accented data, lockout-style safety, single hi-vis orange action color. |
| 2026-07-01 | System implemented as code in `src/design/` (tokens + 7 primitives); all 5 screens + Review components moved onto it | Codify the spec so UI is built, not re-derived. Reconciled doc to reality: Geist for display (not General Sans), real `type` scale, the RN named-weight rule, squared chips. |
| 2026-08-18 | Cut the chat-app costume; completed the semantic ramps; put admin + site on the system | The app had drifted into an assistant UI (greeting + composer home, "+ New chat" as the primary drawer row, a fake chat input on two screens) and away from "a serious field tool." Separately, each semantic family defined only base+tint, so 13 files invented their own borders and on-tint inks; type ran 8-11.5px. Deleted `radii.full`/`xl`/`sheet`, two shadows, two durations, and the `haptics` doc-map. Admin was on an entirely separate palette and neither web app ever loaded the Geist it asked for. Site lost its CSS-drawn rooftop (184 lines) and its internal-agent list. New invariant tests fail the build on a raw hex or sub-10px type. |
