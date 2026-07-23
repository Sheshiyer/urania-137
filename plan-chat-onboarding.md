# Plan — Narrative Agentic Chat Onboarding (replacing the node modal)

**Date:** 2026-07-23 · **Repo:** urania-137 (frontend) · **Builds on:** Selemene-engine (upstream, `../Selemene-engine`)
**Skills applied:** `pai` (phase gates) · `selemene-core` / `selemene-report` (intake contract + tone) · `somatic-canticles-narrative-weaver` (voice/persona) · `witnessos-logic-extractor` (vocabulary, anti-dependency) · `temperance-parallel-dispatch` (rail-split execution)

---

## 1. What changes (one sentence)

Clicking a node no longer opens a modal form; it opens a **chat-based, single-item-at-a-time, narrative-driven onboarding flow** — a persona guides the user through a story that collects exactly one `ReportGenerationRequest` slot per turn, then hands off to the existing witness/deterministic pipeline and archives the result to the Folio as today.

## 2. What we already verified (swarm review, 2026-07-23)

| Layer | Finding | Consequence |
|---|---|---|
| Frontend swap point | `NodePage.openChild()` (`src/pages/NodePage.tsx:53-62`) is a single 5-branch dispatch onto `modalView`; 5 `Modal` instances share `src/components/Modal.tsx` | Replace the modal layer wholesale at one seam; graph, routing, chrome untouched |
| Submit/save pipeline | `useReportGenerator` / `useDeterministicRun` / `useDailyReading` → `/api/selemene/*` proxy → Folio `saveReport` | **Zero changes needed** — the chat flow just calls the same submit functions once intake is complete |
| No chat UI exists | No chat/message/streaming components anywhere in `src/` or `functions/` | Chat surface is new code; closest precedent is the daily panel's progressive disclosure (`DailyReadingPanel.tsx:48-61`) |
| Streaming | Engine proxy forwards unbuffered (`functions/lib/engine-proxy.ts:92-99`); SPA has no stream reader | SSE is viable end-to-end; need a ReadableStream consumer client-side |
| Intake state machine | `packages/witness-pipeline/src/intake/questions.ts` + `isCompleteReportRequest()` + `selemene-report` skill's 8-step one-box-at-a-time flow | The onboarding logic **already exists as data/spec**; chat is a state machine walking it conversationally |
| Personas | `crates/noesis-witness/src/interpret.rs` — Aletheios/Pichet/Synthesis system prompts, production | Reuse as chat personas; dyad = Aletheia (contract integrity) + Pichet (narrative vitality) |
| Inference | `workers/llm-proxy` (OpenAI-compatible, KV secrets, provider failover) + Rust tier routing | Chat orchestrator rides the same path; llm-proxy needs an auth check before public chat use |
| Memory plumbing | `patterns/cloudflare-vectorize.ts` (Workers AI embeddings + Vectorize + privacy scrub) | Template for optional semantic "story so far" memory — phase 4+, not v1 |
| Gaps | No conversation/session store anywhere; no SSE server; `packages/dyad-ui` is an empty stub | Must build: session persistence, streaming endpoint, chat orchestrator agent, chat UI |

**UI-honesty constraint (from the temperance case study):** only 3 real witness families + 6 workflows + 18 engines + 2 live witness modes exist. The chat flow derives its offered capabilities **only** from `SELEMENE_NODES` / `ChildRun` — never from the wider `WitnessMode` union, never resurrecting alias modes.

## 3. Architecture — AgentScope patterns, not the AgentScope framework

AgentScope is Python-only at runtime; Cloudflare Pages/Workers cannot host it, and we already have agents + inference upstream. We adopt its ~6 core patterns as small TS modules:

| AgentScope pattern | Our implementation |
|---|---|
| `Msg` + typed content blocks | `ChatMsg` schema (`text` / `intake_field` / `tool_result` / `stage_direction` blocks) shared SPA↔Functions |
| Event stream (`start → delta → end`, one reply = one Msg) | SSE protocol on `POST /api/chat/turn`; client accumulates events into one message — reconnect/replay for free |
| Router / `SwitchPipeline` over chapter agents | Story state machine: chapters = Awakening → Surface → Subjects (loop) → Relationship → Language/Level → Mode → Assembly → Handoff; router picks next chapter from collected state |
| `WhileLoopPipeline` gate | Each chapter loops Ask → validate (tool-call schema + `intake/location.ts` geocoding) → advance; invalid input re-asked in persona |
| HITL pause/resume | Natural fit for Workers: each user message resumes the loop; no long-lived process |
| Tool calls for structured intake | Narrator LLM emits `record_intake(field, value)` calls; intake lands as schema-validated data, never parsed prose |
| `AgentState` + Session | `chat_sessions` + `chat_turns` D1 tables (DB binding already exists); session state = partially-filled `ReportGenerationRequest` + chapter cursor, resumable across devices |
| Inbox / HintBlocks | Stage-direction beats injected into narrator context (e.g. "user just provided birth time — acknowledge, shift register") |
| SequentialPipeline handoff | Terminal chapter → existing submit hooks → `IntegratedReadingOrchestrator` upstream |

**Dyad as chat architecture** (per narrative-weaver + skills extraction): Aletheia-agent holds contract integrity (schema, taxonomy, guardrails, "facts only, no prediction, no diagnosis"); Pichet-agent holds narrative vitality (voice, rhythm, register arc Systems → Resonance → Perception). Contract integrity overrides prose beauty. Register progression mirrors the intake arc: precise/clinical early (birth data), warm-sensory for relationship context, luminous-witness at assembly/handoff.

**Node-click behavior after redesign:** `openChild(childId)` sets `chatView` seeded with the child's `ChildRun` (the capability card = pre-selected mode/workflow/engine) instead of `modalView`. The chat sheet opens as a full panel (mobile bottom-sheet styling already exists in `Modal.tsx` to reuse as a shell). The narrator's opening beat acknowledges the chosen doorway; the flow then only asks the questions that capability actually needs.

## 4. Non-negotiable guardrails (from skills, enforced in rubric/review)

- "Facts only. No prediction. No diagnosis." — narrator never promises outcomes, health, investments, life events.
- Vocabulary: witness / author / mirror / pattern — never observe / create / analysis / data.
- Never default two subjects to romantic framing; explicit roles + `relationship_context.type` from the exact taxonomy.
- `relationship_header` verbatim at top of assembled output (already enforced upstream).
- Anti-dependency: the story teaches the user to read their own patterns; friction moments (unknown birth time, high-sensitivity family readings) follow the Gardener rule — concern, not warnings.
- Opacity gate: never dumb down terminology; no red-flag filler words (energy/vibration/quantum/universe…).
- Narrative freedom lives in *how* questions are asked, never in *what* is collected — every turn resolves into exact `ReportGenerationRequest` fields.

## 5. Phases & waves (PAI-gated, temperance rail-split)

### Phase 0 — Contracts & state machine (foundation, 1 wave)
| Wave | Agent | Scope |
|---|---|---|
| W0-A | `coder` Contract_Scribe | `src/types/chat.ts`: `ChatMsg`/content blocks, SSE event types (`start/delta/end`), `ChatSessionState` (= partial `ReportGenerationRequest` + chapter cursor + `ChildRun` seed). Mirror in `functions/lib/chat/` |
| W0-B | `coder` Story_Machine | Pure TS state machine module (no React, no fetch): chapters, router, per-chapter ask/validate loop, validators wrapping `isCompleteReportRequest()` logic + date/time/location checks. Unit-tested with the 8-step selemene-report flow as fixtures |

**Exit gate:** state machine walks a scripted full intake for all 5 `ChildRun` kinds and emits a request that passes the completeness gate; tsc + vitest green.

### Phase 1 — Backend: session + streaming turn endpoint (2 waves)
| Wave | Agent | Scope |
|---|---|---|
| W1-A | `coder` Chat_Backend | D1 migration `chat_sessions`/`chat_turns`; routes in `functions/api/[[path]].ts`: `POST /api/chat/session` (create/resume, auth-gated like `/api/folio`), `POST /api/chat/turn` (user msg → narrator LLM call via engine proxy → SSE event stream → persist turn) |
| W1-B | `coder` Narrator_Prompts | Aletheia/Pichet narrator system prompts (adapted from `interpret.rs` personas + voice guides, guardrails baked in); `record_intake` tool schema; prompt-side chapter stage-directions |
| W2 | `coder` Stream_QA | SSE hardening: disconnect/replay, 30s proxy timeout behavior, auth on the LLM path, dev-identity local loop |

**Exit gate:** curl-driven scripted conversation completes a witness intake over SSE end-to-end locally; turns persist in D1; no intake field ever accepted outside schema validation.

### Phase 2 — Frontend: chat surface replacing the modal (2 waves)
| Wave | Agent | Scope |
|---|---|---|
| W3-A | `coder` Chat_UI | `ChatSheet` component (reuses `Modal.tsx` shell styling), message thread, streaming reader (ReadableStream consumer in `selemeneApi.ts` or new `chatApi.ts`), typing/stage-direction rendering, reduced-motion support |
| W3-B | `coder` Node_Splice | Rewire `openChild` → `chatView`; seed chapters from `ChildRun`; delete/retire the 5 modal instances after parity; keep `saveReport` path untouched |
| W4 | `coder` UX_QA | Playwright/manual passes: one-question-at-a-time discipline, persona voice consistency, guardrail probes (romantic-default trap, prediction bait), resume-after-reload |

**Exit gate:** every node child opens chat; a full reading can be produced and Folio-saved without touching a form; no modal remains on the node click path.

### Phase 3 — Payoff & polish (1 wave + inline)
- Result presentation inside the chat thread (passes rendered as narrative chapters — the existing pass model `{id,title,output}` maps naturally).
- Engine-Status and Folio nodes get read-only chat variants (narrator answers questions about live telemetry / past readings instead of collecting intake).
- Docs + ISA update.

### Phase 4 (deferred, optional) — Memory & depth
Semantic "story so far" recall via the Vectorize pattern plumbing; cross-session user memory; MsgHub-style second persona chiming in (Pichet observes and interjects). Requires Vectorize/Workers-AI bindings on this project — flag as account-level work.

## 6. Explicit non-goals / watch items

- **No Python/AgentScope runtime dependency** — patterns only.
- **No changes to the submit→API→Folio pipeline** — it is the stability anchor.
- llm-proxy endpoint currently has **no auth check** — must not be exposed to public chat traffic without one (W2).
- `nvidia-routing.ts` referenced in Rust comments doesn't exist upstream — note drift, don't depend on it.
- Blocked items from the auth plan (CF account tasks T-058+) remain independent; this plan assumes the existing local dev-identity loop for development.
