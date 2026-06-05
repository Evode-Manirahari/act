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
- **Display/Hero:** General Sans (600/700) — sturdy, confident grotesque. (Fontshare)
- **Body / UI / Data:** Geist (400/500/600), with **tabular numerals** for metrics. (Google Fonts)
- **Instrument accent:** Geist Mono (500/600) — used on ALL numbers, metrics, IDs, and section labels (the callback %, "$1,400", superheat, "TEACHABLE MOMENT 0:42"). This mono accent is the signature move; it makes the app read like a field instrument.
- **Code/Mono:** Geist Mono.
- **Loading:** expo-font (bundle the .ttf/.otf in `apps/mobile/assets/fonts/`). Until bundled, fall back to system + a monospace fallback for the accent.
- **Scale (px):** display 22/28, h1 20, h2 17, body 15, small 13, micro 11 (labels, mono, uppercase, letter-spacing 0.08em).

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
- **Border radius:** sm 4 · md 6 · lg 8 (sturdy, never pill/bubble except true toggles).
- **Information architecture — 3 tabs for the 3 users:**
  - **Field** — record a job, mark the teachable moment (capture). Primary action = safety-orange.
  - **Review** — lead tech approves/edits a proposed moment before publish.
  - **Lessons** — apprentice library + the lesson card.

## Component notes
- **Lesson card (hero):** clip thumbnail (with mono "TEACHABLE MOMENT 0:42") → title (General Sans) → **cost-anchor chip** ("$1,400 part avoided", mono, orange-tinted, left orange rule) → **Reasoning** → **Novice traps** (✕ bullets in danger red) → **Safety boundary** rendered as a lockout-style panel (heavy `#C81E1E` left rule, alert icon, tinted bg) → primary "Take the quiz" button.
- **Cost/impact is first-class** on every card — it's the ROI hook for operators.
- **Section labels:** mono, uppercase, steel-500, letter-spacing 0.1em.
- **Safety always reads loud** — never a soft tip; always the lockout panel treatment.

## Motion
- **Approach:** minimal-functional only. No bounce.
- **Easing:** enter ease-out, exit ease-in, move ease-in-out.
- **Duration:** micro 80ms · short 180ms · medium 300ms.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-05 | Initial system "Field Instrument" created | /design-consultation. Anchored to "a serious field tool." Industrial/utilitarian, mono-accented data, lockout-style safety, single hi-vis orange action color. |
