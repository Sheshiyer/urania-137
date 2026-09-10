> **Status: SHIPPED — historical record.** Threshold + subjects profile shipped (migrations 0004/0005, `#/threshold`, delta-collection). Forward ladder: `goal.md` + `.planning/ROADMAP.md`.

# Plan — The Threshold: pre-graph onboarding & persistent subject profiles

**Date:** 2026-07-25 · **Repo:** urania-137 (frontend) · **Builds on:** chat narrator stack (Phases 0–3 shipped), `docs/onboarding-threshold-ideation.md` (concept), `prototypes/threshold.html` (owner-approved scroll-scrub POC)
**Skills applied:** `pai` (phase gates) · `selemene-core` / `selemene-report` (intake contract) · `somatic-canticles-narrative-weaver` (dyad voice) · `temperance-parallel-dispatch` (rail-split execution)

---

## 1. What changes (one sentence)

Birth fundamentals stop being re-collected at every node: a one-time, scroll-scrubbed **Threshold** scene (7 scenes, POC-proven) runs after first login and writes a persistent `subjects` profile; every doorway chat from then on **prefills from the profile and collects only deltas** (a synastry partner, an intention, a place).

## 2. Verified seams (codebase review, 2026-07-24/25)

| Layer | Finding | Consequence |
|---|---|---|
| The flaw | Birth data lives only in `chat_sessions.intake.subjects` (per-session); `users` table (`migrations/0001_init.sql`) holds identity only | One new D1 table + prefill wiring removes the re-interview |
| Intake contract | `SubjectInput` (`src/types/index.ts`) is already the exact persistent shape; `isCompleteIntake` gates on it | The `subjects` table stores `SubjectInput` rows verbatim + role — zero contract invention |
| State machine | Canonical `src/lib/chat/stateMachine.ts` + line-for-line Functions port; `initialSessionState(seed, ids)` pre-creates an empty `primary` slot | Additive: optional `prefilledSubjects` param + `threshold` seed kind; parity rule (`chat.test.ts` mirror suite) enforced |
| Scrub engine | `gsap` + `ScrollTrigger` already bundled (`vite.config.ts` optimizeDeps); POC proved the 7-scene map, hard gate clamp, clip-path crossing | No new deps; POC code ports into React components scene-by-scene |
| Routing | Hash router (`useHashRoute`): `#/` home, `#/node/:id` | Threshold is `#/threshold` — a third view in `App.tsx`; first-login redirect = `GET /api/subjects` empty → `#/threshold` |
| Auth/identity | CF Access + `useMe` → `GET /api/me` upserts the user row | Subjects routes ride the same identity seam as `/api/folio` (user_id scoping, no new auth) |
| Dyad prompts | `functions/lib/chat/prompts.ts` — persona + 8 guardrails + register arc + per-chapter stage directions | Add `threshold` register + stage directions; the fourth-wall reconciliation (§5 of the ideation brief) is a persona amendment, not a guardrail change |
| Submit pipeline | `useReportGenerator` / `useDeterministicRun` / `useDailyReading` → Folio | **Zero changes** — prefilled intake flows through the same `toSubmitPayload` |

## 3. Architecture

```
first login ──▶ GET /api/subjects (empty) ──▶ #/threshold
                                                │  7 scroll-scrubbed scenes (POC grammar)
                                                │  gates: name → moment → place → dedication
                                                ▼
                                     POST /api/subjects (role 'self')
                                                │  scene 007 crossing reveal
                                                ▼
                                     #/  constellation graph
node click ──▶ chat session seeded with prefilled self subject
             ──▶ solo flows: subjects chapter skipped (straight to intention/mode)
             ──▶ 2+ subject flows: subjects chapter opens at add_another
                   └─ "someone new" → mini-loop → "hold in your circle?" (opt-in persist)
```

**The `threshold` seed kind** (`StorySeed` union + `isStorySeed` guard): chapter walk `awakening → subjects → assembly → handoff → complete`, where `handoff` writes the profile instead of firing a report. Its `toSubmitPayload` returns the `self` `SubjectInput`. Solo-guardrail: `relationship_context` always null.

**Delta-collection** (state machine, additive): `initialSessionState(seed, ids, prefilled?: SubjectInput[])` — prefilled-complete slots are skipped by the `subjectsTurn` cursor; witness seeds with `minSubjects ≥ 2` open at the `add_another` gate; `workflow`/`engine` seeds skip `subjects` entirely when a self profile is present. The `add_another` loop gains a third exit: after a fresh subject completes, `persist_offer` beat — affirmative → `POST /api/subjects` (role from relationship context), negative → session-only.

## 4. Non-negotiable guardrails (unchanged + two additions)

All eight narrator guardrails and the recording discipline carry over verbatim (see `prompts.ts` / plan-chat-onboarding §4). Additions for this surface:

9. **The machinery stays sealed; the character may be self-aware.** Fourth-wall narration punches at the fiction, never exposes slots/schema, never touches the user's sovereignty (ideation §5).
10. **Profile writes are always opt-in and revocable.** The `self` profile is collected once at the Threshold with the compact stated in scene 002; circle subjects persist only after an explicit "hold for next time?" affirmative. No silent accumulation.

## 5. Phases & waves (PAI-gated, temperance rail-split)

### Phase 0 — Contracts, migration, state machine (1 wave)
| Wave | Agent | Scope |
|---|---|---|
| W0-A | `coder` Contract_Scribe | `migrations/0004_subjects.sql` (per ideation §3); `SubjectProfile` type in `src/types/chat.ts` + Functions mirror; `threshold` added to `StorySeed`/`isStorySeed`; `prefilledSubjects` threading + `threshold` chapter walk in canonical `stateMachine.ts`, ported line-for-line; unit tests: threshold walk emits a valid self profile; prefilled witness opens at `add_another`; solo deterministic skips subjects; parity suite updated |

**Exit gate:** scripted walks for all seed kinds green in both mirrors; tsc + vitest green; migration applies cleanly to local D1.

### Phase 1 — Backend: subjects API + threshold session (2 waves)
| Wave | Agent | Scope |
|---|---|---|
| W1-A | `coder` Subjects_API | Routes in `functions/api/[[path]].ts`: `GET /api/subjects` (list caller's), `POST /api/subjects` (schema-validated `SubjectInput` + role, geocoding reuse from chat turn handler), `PATCH/DELETE /api/subjects/:id` (owner-only); user scoping identical to `/api/folio` |
| W1-B | `coder` Threshold_Session | `POST /api/chat/session` accepts `threshold` seed; turn handler's `handoff` for threshold writes `subjects` (role `self`) instead of a report; `seed.prefilledSubjects` injected server-side from the table (never trusted from the client) |

**Exit gate:** curl-driven threshold session completes over SSE and lands a `self` row; CRUD round-trip passes; a witness session started server-side with a stored profile never re-asks the five slots (negative-test evidence).

### Phase 2 — Frontend: the Threshold scene (2 waves)
| Wave | Agent | Scope |
|---|---|---|
| W2-A | `coder` Threshold_UI | `#/threshold` route + `ThresholdPage`: 7-scene scroll-scrub (GSAP ScrollTrigger, POC grammar ported to components — Arrival / Compact / Name / Moment / Place / Dedication / Crossing); hard-gate clamp; breathing starfield canvas; `prefers-reduced-motion` collapse; form scenes drive the threshold chat session over SSE (narrator voice) with local validation mirroring the machine |
| W2-B | `coder` FirstRun_Splice | `App.tsx`: after `useMe` resolves, `GET /api/subjects` → empty → replace to `#/threshold`; the Crossing reveal hands off to `#/` (graph fades in inside the clip-path opening); returning users with a profile never see the redirect |

**Exit gate:** fresh account (empty subjects) lands on the Threshold, completes it, profile persists, graph opens in the reveal; reload → straight to graph; reduced-motion path completable with keyboard only.

### Phase 3 — Delta-collection in doorways (1 wave + QA)
| Wave | Agent | Scope |
|---|---|---|
| W3-A | `coder` Picker_Splice | Chat opening beat uses the stored name; subject picker (self / circle / someone new) for multi-subject doorways; `persist_offer` beat + UI affordance; circle subjects selectable in later sessions |
| W3-B | `coder` UX_QA | Playwright passes: synastry never asks the user's own five facts; "hold in your circle?" opt-in/out; resume-after-reload mid-Threshold; romantic-default and prediction-bait probes on the new beats |

**Exit gate:** full synastry from profile + one fresh partner, Folio-saved, no re-interview; circle persistence verified across reload; guardrail probes logged.

### Phase 4 — Voice & polish (1 wave)
- Threshold register + stage directions in `prompts.ts` (Pichet's opening, Aletheia's two steps forward, spunk budget per ideation §5); the dyad-naming beat.
- Settings card: "Your pattern" row — view/edit `self` (PATCH), re-cross the Threshold by choice.
- Docs: `docs/threshold-onboarding.md`; ISA entry; README flow diagram update.

## 6. Decisions locked (from ideation + POC)

- Scroll-scrub grammar with hard-gate form scenes (POC-approved); GSAP ScrollTrigger, no new deps.
- The Crossing reveal **is** the graph entrance (clip-path opening), not a redirect-with-spinner.
- The narrator may be named/self-aware at the Threshold only; doorway chats keep the shipped persona.
- Canvas starfield ships first; generated ambient video loop is a later upgrade.

## 7. Open questions carried (owner to rule before W0-A)

1. **Resume semantics** — Threshold abandoned mid-way: resume at chapter cursor (leaning) vs restart scene.
2. **Voice/TTS** — literal spoken dyad is a separate track (TTS provider + audio in Workers); confirm out of scope for this plan.
3. **Edit flow** — Settings PATCH (quiet, leaning) vs re-converse.

## 8. Explicit non-goals / watch items

- **No changes to the submit→API→Folio pipeline** (stability anchor).
- **No romantic-default relaxation** for stored circle subjects — taxonomy enforced on every pairing, stored or fresh.
- **No Three.js** at v1; bundle-size gate stays.
- Canonical-port parity: any state machine behavior change lands in `src/lib/chat/stateMachine.ts` first and is ported; the mirror test suites must stay 1:1.
- llm-proxy auth posture unchanged; threshold sessions ride the existing authenticated chat path.
- Migration is additive; existing `chat_sessions` history untouched.
