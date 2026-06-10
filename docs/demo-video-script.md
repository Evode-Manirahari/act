# ACT Capture — Demo Video (90 seconds)

**Purpose:** one video that works for Josh, operator DMs, and the one-pager follow-up.
**Length target:** 75–90 seconds. **Format:** vertical-friendly phone capture + two web inserts, captions burned in (most viewers watch muted).

---

## Voiceover script (~125 words, read at a relaxed pace ≈ 55s)

> Every HVAC operator has one tech who never gets callbacks. And he's usually the one closest to retirement.
>
> This is ACT. Your senior tech records the job from his phone, and taps Mark when something matters. That's it. No writing, no extra time on the job.
>
> After the job, ACT asks him three short questions about each moment. Why did you check there first? What would a new tech have missed?
>
> His answers become training cards. The clip, his reasoning, the trap, the safety line, and a quick quiz. A lead tech approves every card before anyone sees it.
>
> Your new hires train on your jobs, your equipment, your accounts. Not a generic catalog.
>
> ACT. Capture what your best techs know, before it walks out the door.

Record in Voice Memos, quiet room, phone 6–8 inches from your mouth. Read it three times, keep the best take. Don't rush the last line.

---

## Shot list

| # | Dur | Source | What's on screen | Action / note |
|---|---|---|---|---|
| 1 | 4s | Title card (Claude makes) | "Your best tech retires next year. What leaves with him?" on ink background, Field Instrument style | Cold open, no logo yet |
| 2 | 6s | Phone | PilotHome | Slow scroll: hero line, the three action buttons, **Pilot progress** tiles showing real counts. Don't tap anything yet |
| 3 | 10s | Phone | CaptureJob | Tap **Record senior tech** → consent selector visible (pause 1s on it — trust shot) → start recording pointed at your furnace / water heater closet |
| 4 | 6s | Phone | CaptureJob, recording | Camera on the unit, then thumb taps **MARK** once. Hold 2s after the tap so the confirmation registers on screen |
| 5 | 4s | Phone | CaptureJob | Stop recording → upload indicator / queue visible. JUMP CUT here over processing time |
| 6 | 12s | Web (Claude captures) | Admin **moments** queue | The new moment with extracted frames + transcript snippet → click approve → the generated debrief question visible ("What told you to check there first?") |
| 7 | 8s | Web (Claude captures) | Admin moment detail | The expert's answer present → compiled card preview: clip, expert why, novice trap, safety boundary, quiz → click publish |
| 8 | 10s | Phone | Learn tab | Open the published card as the apprentice: scroll the why / trap / safety, tap into the quiz, answer one question |
| 9 | 5s | Phone | PilotHome | Back to home: **Pilot progress** tiles — cards-published count is now one higher. The loop, closed |
| 10 | 6s | End card (Claude makes) | One-liner + "60-day pilot · evode@…" from the one-pager, Field Instrument style | Hold 3s, fade |

Total ≈ 71s of footage + transitions ≈ 80s final.

## Who does what

**Evode (~15 min):**
1. Phone footage for shots 2–5, 8–9. iPhone via cable → QuickTime → File → New Movie Recording → camera dropdown → select iPhone → record. Phone on Do Not Disturb, brightness max, portrait. Do each shot 2–3 times; send all takes.
2. Voiceover (Voice Memos, script above).
3. The "job": your water heater / furnace closet is fine. You're demoing the *interaction*, not HVAC skill.

**Claude:**
1. Seed demo data so no screen shows zero (recording with marks, approved moment with answered question, published card, dashboard counts).
2. Capture shots 6–7 from the admin app (headless browser tooling, clean 1280×800, cursor visible).
3. Make title/end cards (shots 1, 10) in Field Instrument style.
4. Assemble: ffmpeg trim/stitch/captions; export 1080p MP4 + a square crop for DMs.

## Honest-demo rule

Everything on screen must be real product behavior. Jump cuts over processing time: fine, standard. Mocked screens or fabricated dashboard numbers: not fine. If a screen looks empty, we seed real data through the real API rather than faking the UI.
