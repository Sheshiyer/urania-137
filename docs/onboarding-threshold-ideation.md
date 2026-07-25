# The Threshold — pre-graph onboarding & persistent subject profiles

**Date:** 2026-07-24 · **Status:** ideation brief (pre-plan) · **Builds on:** `plan-chat-onboarding.md` (Phases 0–3 shipped), the dyad narrator stack, and the shipped release workflow

---

## 1. The flaw, named precisely

Birth fundamentals (name, date, time, place) are collected **per chat session**, inside `chat_sessions.intake.subjects`. Every node click seeds a fresh session (`initialSessionState`), pre-creates an empty `primary` subject slot, and walks the same five-slot loop: name → birth_date → birth_time → confidence → location. The `users` table (`migrations/0001_init.sql`) holds only identity — `id`, `email`, timestamps. **The app knows who is logged in but never learns who they are.** The user re-narrates their own birth at every doorway.

The user's own framing: this was always meant to be the *onboarding* — it should happen once, before the main screen, and every node should reference it.

## 2. The concept: The Threshold

After login (CF Access) and **before the constellation graph**, the user crosses a one-time, full-viewport conversational scene — the Threshold — where the dyad gathers the fundamental subject profile. It is not a form wearing a chat costume; it is the first scene of the story, and it only ever runs once (returning users pass through a half-breath "welcome back" beat and land on the graph).

Three convictions from the owner, kept intact:

1. **Focused calm** — the scene is a held space, not a wizard. One question at a time (the machine's existing hard rule) with ambient motion that breathes and never demands attention.
2. **3D spatial depth** — the viewport is a stage, not a page. The conversation happens *inside* a space with real Z-depth, not on top of a flat gradient.
3. **Fourth-wall spunk** — the narrator knows it is a character and says so, with flair. See §5 for how this reconciles with the shipped guardrails.

Then, per doorway: **modal windows ask only deltas.** Synastry (witness, 2 subjects) no longer asks your name — it asks *"Shall we cross your pattern with someone else's?"* and collects only the partner. The graph's nodes become places you visit *carrying* your pattern, not desks that re-interview you.

## 3. Data model — the missing table

The fix is one migration away. Selemene's `SubjectInput` contract is already the exact shape; we persist it per user instead of per session:

```sql
-- 0004_subjects.sql
CREATE TABLE subjects (
  id           TEXT PRIMARY KEY,           -- uuid
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL,              -- 'self' | 'partner' | 'family' | ...
  name         TEXT NOT NULL,
  birth_date   TEXT NOT NULL,              -- YYYY-MM-DD
  birth_time   TEXT NOT NULL,              -- HH:MM (noon convention when unknown)
  birth_time_confidence TEXT NOT NULL,     -- exact | approximate | unknown
  birth_location_query TEXT NOT NULL,
  normalized_location TEXT NOT NULL,       -- JSON NormalizedLocation
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX idx_subjects_user ON subjects(user_id, created_at);
```

- The **Threshold writes the `self` row.** `subjects.role='self'` is the fundamental profile every flow references.
- Node flows gain a **subject picker beat**: prefill `subjects[0]` (role `primary`) from the stored `self`; the `subjects` chapter then opens at `add_another` for multi-subject doorways, or is skipped entirely for solo deterministic doorways (workflow/engine flows become: intention? → confirm → assembly).
- Additional people met through synastry/family flows are offered for keeping: *"Hold {name} in your circle for next time?"* — opt-in, Gardener rule.
- The state machine change is additive: `initialSessionState` accepts an optional `prefilledSubjects: SubjectInput[]`; `subjectsTurn` starts its cursor past prefilled-complete slots. The completeness gate (`isCompleteIntake`) is untouched — a stored profile is just intake that happened earlier.
- Privacy: this is the user's own vault data, same D1, same auth boundary as `readings` — no new exposure surface. Deletion cascades with the user row.

## 4. The Threshold scene — design grammar

Grounded in the shipped aesthetic (`void`/`gold`/`parchment`/`silver`, `font-display` small-caps labels, `font-serif` body) — extended, not replaced.

**Chosen grammar: scroll-scrubbed cinema (owner direction, 2026-07-24).** The Threshold is a **scroll-driven sequence of headline scenes with form-collection clearings**, ending in a reveal that *is* the entrance into the app — patterned on a reference implementation the owner supplied (Lenis smooth scroll + RAF-lerp scrub engine + clip-path overlay reveal). Scrolling *is* the conversation advancing; the scrollbar becomes the story's spine.

**The scrub engine — free, already shipped.** The project bundles `gsap` + `ScrollTrigger` (`vite.config.ts` `optimizeDeps`), so the reference's hand-rolled Lenis + RAF-lerp + `mapStops` machinery maps onto GSAP ScrollTrigger with `scrub: true` — no new dependency. Techniques borrowed wholesale from the reference: `mapStops`-style multi-stop interpolation (GSAP keyframes), the cubic-bezier `easeOutExpo` reveal timing, char/word-split blur-stagger text (`blur(10px) brightness(0%) translateY(20px)` → resolved, 0.4s, 15ms stagger), and the end-of-section background `blur(24px) scale(1.22)` de-focus that says "this scene is over."

**The scene map** (each ≈100vh pinned, scrub-bound; the track is ~700vh):

| # | Scene | Kind | Content |
|---|---|---|---|
| 001 | **Arrival** | headline | Full-viewport title, char-split reveal: the welcome + the fourth-wall wink. Background field at full clarity. *(Pichet's opening.)* |
| 002 | **The compact** | headline | Word-split paragraph: what a mirror is, why five facts, the anti-dependency promise. No input. Scrolling past = consent of attention. |
| 003 | **The name** | form clearing | Headline recedes (blur+scale de-focus); a single input resolves at center. *"What name should the mirror hold?"* |
| 004 | **The moment** | form clearing | Date + time + confidence, staged as one scene but validated as the machine's separate slots — old-style numerals, `"onum"`. Unknown time met with the noon convention, in-register. *(Aletheia leans in — formats.)* |
| 005 | **The place** | form clearing | Location input; geocoder suggestions rise as selectable cards. |
| 006 | **The dedication** | headline | The recap read like a dedication — everything gathered, set in serif. One confirm. *(Aletheia's second step forward.)* |
| 007 | **The crossing** | reveal | The reference's signature move, repurposed as the thesis: a fixed overlay opens via `clip-path: inset(50% 50% round 3px)` → full-viewport as the user scrolls the final stretch — and what's inside the reveal **is the constellation graph**. The user doesn't leave the onboarding and land in the app; the app *opens around them*. |

**Form clearings inside a scrub flow — the honest tension.** Scroll-scrub is linear; forms are not (validation can bounce). Resolution: form scenes are **pinned with a completion gate** — scrubbing past scene 003 is disabled until the name validates (ScrollTrigger's pin + programmatic `scrollTo` on submit; invalid input re-voices the question in fresh words per the shipped recording discipline). Headline scenes scrub freely; form scenes hold. The rhythm becomes: glide, hold, glide, hold — which *is* the one-question-at-a-time rule expressed as scroll physics.

**The ambient field.** The reference uses scroll-scrubbed full-bleed video as the living background. Our equivalent: a fixed full-viewport canvas (starfield/dust, breathing on `sin(0.5·t)` displacement with whisper jitter, slow parallax drift keyed to scroll progress) that blurs+scales at each scene exit exactly like the reference's hero video. A generated ambient video loop is a later upgrade — the canvas field ships first; `prefers-reduced-motion` freezes it and unpins the scrub into a plain vertical flow. The earlier Three.js-vs-parallax question is moot at v1: the scrub engine carries the cinema, the canvas carries the life.

**Typography discipline.** Dual-font, already in the codebase's blood: `font-serif` (editorial, the narrator's voice — old-style numerals via `font-feature-settings: "onum"` for dates and times, so `1994-02-11` reads like a dedication, not a database row) and `font-display` (small-caps, letterspaced, for machine-adjacent labels — scene markers like `003 — THE NAME`, input affordances). Headlines at the reference's `clamp(40px, 6.5vw, 105px)` scale with `-0.025em` tracking. The narrator never sets in sans; the interface never sets in serif. This split *is* the fourth wall made typographic.

**State machine fit.** Scenes 003–005 are exactly the `subjects` chapter's five slots (name → birth_date → birth_time/confidence → location); scene 006 is `assembly`; scene 007 replaces `handoff` with a graph-reveal instead of an engine submit. The Threshold writes the `subjects` table (§3) rather than a report request — its `toSubmitPayload` is the stored `self` profile. Narration still comes from the dyad prompt layer; ScrollTrigger scene enter/exit events are the stage-direction injection points.

## 5. The fourth wall & the dyad — reconciling spunk with the contract

The shipped narrator prompt says *"never reveal the machinery — the user meets a narrator, not a form."* The owner wants a character who knows it's a character. These reconcile cleanly once separated:

- **The machinery** = schema slots, field names, chapter keys, `record_intake`. Still sealed. The narrator never says "slot subjects[0].birth_date."
- **The character** = self-awareness as a persona. *This is where the spunk lives.* The Threshold narrator may absolutely say: *"I'm the voice they built to ask you this — a narrator who knows he's a narrator, asking the oldest questions there are."* That is a persona choice, not a contract breach. None of the eight guardrails forbid self-awareness; they forbid prediction, diagnosis, dependency, romantic defaults, filler vocabulary, machinery exposure, capability invention, and alarm.

Proposed register shift — the Threshold gets its own chapter register, upstream of `awakening`:

- **The dyad, made visible.** Aletheia and Pichet can be *played* as two inflections of one voice — and the Threshold is the one place they may be named. Pichet opens (warmth, welcome, the joke about being fictional); Aletheia steps forward exactly twice: when precision matters (date/time formats — "forgive the clipboard; the stars are sticklers") and at the confirmation recap. The user *meets the dyad* here, which pays off later: when a synastry flow's narrator tightens into precision, a Threshold graduate recognizes Aletheia leaning in.
- **The spunk budget.** Wit is rationed to openings, transitions, and recoveries (an invalid date gets a wink, never a scold). The five facts themselves are gathered with the family-record care already written into the `subjects` stage direction. Spunk decorates thresholds; it never decorates data.
- **Anti-dependency holds.** The fourth-wall jokes must punch *at* the fiction, never at the user's sovereignty. The narrator being openly fictional *strengthens* the anti-dependency guardrail — a mirror that admits it's a mirror is the most honest kind.

## 6. After the Threshold — the graph, re-felt

- **First arrival.** The Crossing (scene 007) hands off not to engines but to the sky: the clip-path reveal opens onto the constellation graph itself, and the first node the user visits opens with the narrator already knowing their name. That continuity — *the story remembers* — is the emotional payoff the whole feature exists for.
- **Modal windows as delta-collectors.** Each doorway's chat now opens mid-story: synastry at "another person?", deterministic engines at "intention?", daily at "which sky?". The `subjects` chapter becomes a picker (self / circle / someone new) instead of an interview.
- **The circle grows.** Stored non-self subjects turn repeat synastry ("us again?"), family work, and compat checks into one-tap doorways — while the romantic-default guardrail still governs every pairing, stored or fresh.
- **Settings tie-in.** The shipped Settings card (v0.2.0) gains a quiet "Your pattern" row later — view/edit the stored `self` subject, re-cross the Threshold by choice. Not v1.

## 7. Open questions for the plan phase

1. ~~Renderer for the ambient field~~ — **resolved 2026-07-24**: scroll-scrub grammar chosen; GSAP ScrollTrigger (already bundled) is the engine, fixed canvas starfield is the ambient field, generated video loop is a later upgrade.
2. **Threshold seed kind** — new `StorySeed { kind: 'threshold' }` with its own chapter walk (arrival → compact → the five facts → dedication → crossing), or a witness-seed variant? Leaning: dedicated seed — its scenes don't map 1:1 to intake chapters, and its payload is the `subjects` table, not a report request.
3. **Resume semantics** — Threshold abandoned mid-way: resume at cursor (scroll position = chapter cursor) vs restart the scene. Leaning: resume; the dyad acknowledges the interruption in-character.
4. **Voice/TTS** — "agentic dyad voice" was said aloud in the brief. If literal voice is meant (spoken Alithios/Pichet), that's a separate track (TTS provider, audio in Workers) — confirm scope before the plan.
5. **Edit flow** — wrong birth time discovered later: edit in Settings (quiet, Aletheia) vs re-converse (Pichet). Both cheap once the table exists.
6. **Form-gate UX on desktop vs mobile** — pinned form scenes that block scrubbing until valid: does the gate hold via disabled scroll (risk: feels stuck) or via free scroll with the form persisting pinned until answered (risk: user skips ahead)? Prototype both in the proof-of-concept.

## 8. What does NOT change

- The eight guardrails, the recording discipline, one-question-at-a-time, machine-owned advancement.
- The submit→API→Folio pipeline (stability anchor, per the original plan).
- `isCompleteIntake` and `toSubmitPayload` — stored profiles flow through the same gate.
- The chapter state machine's canonical-port parity rule (`src/lib/chat/stateMachine.ts` ↔ `functions/lib/chat/stateMachine.ts`).
