# Chat Protocol — Narrative Onboarding SSE Contract

**Canonical types:** `src/types/chat.ts` (SPA) · mirror: `functions/lib/chat/types.ts` (Pages Functions).
**Endpoint (Phase 1):** `POST /api/chat/turn` — user message in, narrator reply streamed out as SSE.

## SSE event lifecycle

One user turn produces **one narrator reply**, streamed as Server-Sent Events:

```
reply_start → ( block_start → block_delta* → block_end )*
            → intake_recorded? → chapter_advanced?
            → reply_end | error
```

| Event | Payload | Meaning |
|---|---|---|
| `reply_start` | `msgId`, `chapter` | A new narrator reply begins; allocate the target `ChatMsg` shell. |
| `block_start` | `blockIndex`, `blockKind` | A new content block begins (`text` / `stage_direction` / `intake_field` / `tool_result`). |
| `block_delta` | `blockIndex`, `text` | Incremental text for the current block (0+ times). |
| `block_end` | `blockIndex` | The block is complete. |
| `intake_recorded` | `field`, `value` | A schema-validated `record_intake` payload landed in the session's intake slots (0+ times, after the block that carried it). |
| `chapter_advanced` | `chapter` | The story state machine moved to a new chapter this turn (0 or 1 times). |
| `reply_end` | `msg` | The fully-assembled `ChatMsg`; the stream terminates normally. |
| `error` | `message` | Terminal failure for this reply; no `reply_end` will follow. |

### Invariant: one reply ⇒ exactly one `ChatMsg`

All events between `reply_start` and `reply_end` accumulate into **exactly one
`ChatMsg`** (delivered verbatim in `reply_end.msg`). Clients MUST NOT render
deltas as separate messages: deltas update the in-progress message identified
by `reply_start.msgId`; on `reply_end` the accumulated client-side copy is
replaced by the authoritative server message. This makes reconnect/replay
trivial — a replayed stream rebuilds the same single message. `error`
discards the in-progress reply; no partial `ChatMsg` is persisted.

## Event ids, replay, and disconnect semantics (Phase 1 W2)

### Event ids

Every frame of a **fully-persisted** reply carries an `id:` line:

```
id: 42
event: block_delta
data: {"type":"block_delta","blockIndex":0,"text":"…"}
```

The id is the event's **1-based ordinal in the session's persisted event
stream** — the concatenation of every narrator turn's emitted
`reply_start … reply_end` sequence, in turn order. The exact sequence each
turn emitted is persisted on its `chat_turns` row (migration 0003), so the
id space is derived, never stored, and live streams and replay always agree.
Ids are monotonic per session and contiguous across turns (gaps are possible
only if a narrator turn row persisted while its session-state save failed —
an orphaned, never-completed reply; monotonicity and resume correctness are
unaffected).

Frames of a turn that **failed** to persist (terminal `error`) carry **no
`id:` line**. Such a turn consumed no ids; the next successful turn continues
the sequence exactly where the last good one ended.

### Replay endpoint

```
GET /api/chat/session/:id/events?after=<n>
GET /api/chat/session/:id/events          (with Last-Event-ID: <n> header)
```

Ownership-guarded like the sibling routes (unknown ≡ cross-user ≡ 404).
`after` must be a non-negative integer event id (default `0` = full replay);
a non-integer value is a 400. The response is a **finite**
`text/event-stream` body: the persisted frames with `id` > `after`, in order,
identical bytes to what the live streams emitted. `after >= N` replays
nothing (client is caught up).

Reconnect recipe: track the last received `id` per session (EventSource does
this natively as `Last-Event-ID`); on reconnect, GET the replay endpoint with
it, apply the frames with the same accumulation rules as a live stream
(deltas onto the `reply_start.msgId` shell, authoritative `ChatMsg` from
`reply_end`, intake slots from `intake_recorded`, cursor from
`chapter_advanced`), then resume POSTing turns. `GET /api/chat/session/:id`
remains the authoritative snapshot for a full reload.

### Disconnect & timeout semantics

`POST /api/chat/turn` drives the turn generator to **completion before any
frame is written**: user msg, narrator msg, session state, and the emitted
event sequence are all durable before the client sees the first byte of
event data. A client disconnect — at any point, including mid-stream — can
never lose or truncate a turn; the client replays (above) to catch up. The
narrator await already dominated time-to-first-event, so buffering changes
nothing perceptible.

While the turn computes, the stream stays alive via `: heartbeat` comment
frames every 15 s, which also keeps intermediary idle timeouts (e.g. a 30 s
proxy) from killing the connection. The narrator LLM call itself aborts at
25 s and degrades to the deterministic fallback, so a first event always
arrives well inside a 30 s proxy window; the upstream selemene proxy's own
30 s timeout is unaffected by this path.

### LLM-path auth

When `CHAT_PROXY_TOKEN` is configured on the Pages side, the narrator fetch
to the upstream llm-proxy sends it as the `x-chat-key` header; the proxy
enforces the same secret (401 on mismatch) only when it has
`CHAT_PROXY_TOKEN` configured. When either side is unconfigured the behavior
is exactly the pre-W2 behavior (inert by default).

### LLM path (live since 2026-07-24)

The narrator's upstream base is `NARRATOR_LLM_URL` (wrangler.toml `[vars]`,
non-secret), pointing at the **selemene-llm-proxy** Worker
(`Selemene-engine/workers/llm-proxy`). When unset, the seam falls back to
`SELEMENE_API_URL` (legacy engine path); when neither is configured the
narrator speaks the deterministic `key :: template` prompts. The request
omits `model` — the proxy applies per-provider defaults:

| order | provider | endpoint | default model |
|---|---|---|---|
| 1 | command-code | `api.commandcode.ai/provider/v1/chat/completions` | `deepseek/deepseek-v4-pro` |
| 2 | nvidia | `integrate.api.nvidia.com/v1/chat/completions` | `nvidia/llama-3.3-nemotron-super-49b-v1.5` |
| 3 | openrouter | `openrouter.ai/api/v1/chat/completions` | `anthropic/claude-sonnet-4` |
| 4 | openai | `api.openai.com/v1/chat/completions` | `gpt-4o-mini` |

Command Code is called through its official **Provider API** (OpenAI-compatible
shape) — never the CLI-only `/alpha/generate` route, whose TOS forbids
non-CLI use. The owner's preferred narrator model `claude-sonnet-5` exists in
the Provider catalog but (a) requires the Anthropic Messages shape
(`/provider/v1/messages`) and (b) returned `PREMIUM_CREDITS_EXHAUSTED` on
2026-07-24 — hence the verified-working open model as the default. Provider
API keys live in the proxy's `LLM_SECRETS` KV; the shared-secret gate is
`CHAT_PROXY_TOKEN` (worker secret + Pages secret). If every provider fails,
the turn degrades to the deterministic fallback — a turn never 500s over the
LLM.

## Chapters

The session's `chapter` cursor (`ChatSessionState.chapter`) is owned by the
pure story state machine; the narrator LLM speaks only within the current
chapter and never advances it directly — advancement is emitted as
`chapter_advanced` after validation succeeds.

| Chapter | Purpose |
|---|---|
| `awakening` | Opening beat seeded by the clicked node; acknowledges the chosen doorway. |
| `surface` | Confirm witness vs deterministic vs daily (usually pre-seeded by `ChildRun`). |
| `subjects` | One-subject-at-a-time loop: name → birth_date → birth_time → time_confidence → location; loops per subject up to the seed's `maxSubjects`. |
| `relationship` | Collect `relationship_context` when 2+ subjects; skipped for solo flows (solo ⇒ `relationship_context === null`). |
| `language_level` | Collect `language` + `report_level` + `consciousness_level`. |
| `mode` | Confirm mode/workflow/engine (pre-seeded by `ChildRun`; never offers unverified modes). |
| `assembly` | Recap of all collected slots + explicit FINAL ASSEMBLED REQUEST confirmation. |
| `handoff` | Fire the existing submit hooks (`useReportGenerator` / `useDeterministicRun` / `useDailyReading`). The session stays resumable at `handoff` until the client confirms consumption (below). |
| `complete` | Terminal state. Entered from `handoff` either by a further turn (state machine) or — the normal path — by `POST …/complete` after the client consumes the handoff payload. Excluded from create-or-resume. |

## Handoff completion (advance-on-consume, Phase 2 W4)

```
POST /api/chat/session/:id/complete
```

When the chapter reaches `handoff`, the client refetches the authoritative
session, builds the submit payload, fires the existing submit hooks — and
then calls this endpoint to advance the session to `complete`. This closes
the duplicate-handoff hole: while a session sits at `handoff`, create-or-resume
still returns it, so every remount of the chat sheet would re-fire the handoff
(duplicate engine submit + duplicate Folio save). Once completed, the resume
query excludes the session (`chapter != 'complete'`), so reopening the same
node child starts a fresh session instead of re-handing-off the old one.

Semantics:

- Ownership-guarded like the sibling routes (unknown ≡ cross-user ≡ 404).
- `handoff → complete`: persisted, returns `{ session }` (200).
- Already `complete`: idempotent 200 (retry-safe).
- Any earlier chapter: **400** — no handoff was ever delivered, so there is
  nothing to complete. A crash between handoff and completion leaves the
  session at `handoff`, where a remount retries the handoff exactly once
  more; the client's once-per-mount guard remains as defense-in-depth.

## Result delivery (Phase 3)

The chat no longer closes at handoff. The run's result renders **in the
thread**, derived client-side from the submit hook's state — it is never
persisted as a chat turn and never touches the SSE contract above.

```
handoff → onHandoff(payload) → existing submit hook fires (unchanged)
        → ChatSheet receives the hook's state as a `ThreadResult` prop
        → composing beat → narrator chapters → Folio closing beat
```

- **Mapping** (`src/lib/chat/resultMessages.ts`): witness and daily readings
  render ONE chapter per pass of the `{id, title, output}` pass model (pass
  title as a small chapter heading, output as the body); deterministic
  results render one chapter carrying the same fenced-json markdown the
  Folio archive stores (`deterministicMarkdown`, byte-identical).
- **Composing beat**: while the hook is in flight, a narrator-typed
  stage-direction line ("The witness takes the pattern…") plus the typing
  dots — luminous-witness register, reduced-motion honored.
- **Errors**: hook failures (engine error, or a Folio save failure folded
  into the deterministic hook's `error`) render an in-thread error block
  with the exact error text and a retry affordance that re-fires the SAME
  hook call with the SAME arguments. A witness Folio save failure after a
  complete reading surfaces as `saveError` on the complete result — the
  reading stays whole; never silent.
- **Durability**: the Folio row saved inside the hook is the reading's
  durable copy. Result chapters are presentation only; the session is
  already `complete` after advance-on-consume, so reopening the doorway
  starts a fresh story and the closing beat names the Folio archive as the
  reading's home.
- **Retry vs. handoff**: retry re-fires the submit hook only — it never
  re-fires `onHandoff` and never posts another chat turn, so the
  advance-on-consume guarantees (no duplicate handoff) are untouched.

## Guardrails (contract level)

- Narrative freedom lives in **how** questions are asked, never **what** is
  collected — every turn resolves into exact `AssetGenerateRequest` fields.
- Capabilities derive only from `ChildRun` / `SELEMENE_NODES`; unverified
  modes are never offered.
- `birth_date` is strictly `YYYY-MM-DD`; `birth_time` strictly `HH:MM`;
  `birth_time_confidence ∈ exact | approximate | unknown`. Validation happens
  in the state machine before any `intake_recorded` event is emitted — intake
  is schema-validated data, never parsed prose.
