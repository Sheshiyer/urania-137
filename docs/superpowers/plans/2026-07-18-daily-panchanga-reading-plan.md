# Urania 137 — Daily Panchanga Reading — Swarm Delivery Plan

**Date:** 2026-07-18
**Status:** plan — awaiting review before execution
**Spec:** [docs/superpowers/specs/2026-07-18-daily-panchanga-reading-design.md](../specs/2026-07-18-daily-panchanga-reading-design.md)
**Method:** swarm-architect (phase → wave → swarm, contract-first parallelism)
**Scale:** 79 tasks · ~249.5h · 5 phases · 18 lock-zone (serialized) tasks

> This plan was decomposed by 5 parallel phase-agents and hardened by an adversarial
> completeness critic that verified coverage against the spec **and against the live
> repo** (ChildRun union, AssetGenerateResponse, saveReport, the transit node's
> children, and mode-gates.mjs's existing gate-1/gate-2 were all confirmed real). The
> critic found the plan content-complete but not yet executable as a DAG; every fix it
> named is applied here — see §11 (Reconciliation).

---

## 1. Discovery summary

| Dimension | Value |
|---|---|
| Planning depth | deeply detailed (schema-complete tasks, dependency-aware) |
| Delivery mode | production (ships ① live; ③ dormant-ready) |
| Release model | phased rollout — Phase 0 gates all; ① usable after Phase 3; ③ flips later |
| Quality bar | behavior-proving gates (green ≠ done), determinism, privacy, non-prescriptive voice |
| Team topology | solo human + 4 agent roles (Claude / Codex / Copilot / Gemini) |
| Constraints | React 19 + Vite + Tailwind SPA; public Selemene API only; **no Selemene backend change in this repo**; graph-is-the-interface; SVG-only |
| External | engine (③) work executed on the Selemene repo by the user, tracked via the ledger — out of this repo's scope |

## 2. Assumptions & constraints

**Frozen constraints (from the ISA + product-map):**
- Only the public Selemene engine API (`/api/selemene/*`). No new engine mode ships from this repo; ③ is unlocked by the ledger, executed on Selemene.
- The seven home nodes stay fixed; the daily reading is a **child of Sky Weather** (`transit`).
- Never send a mode the engine doesn't resolve; never offer a surface whose input we can't gather; never link to something that doesn't exist.
- SVG-only, static build, hash routing unchanged.

**Assumptions (each retired by a Phase-0 task, not trusted):**
- A1 — the panchanga engine can produce "today at location L" **without birth data** (via `current_time`/date + location). *Proven by T-003; if false → R1 fallback.*
- A2 — the engine's limb enum spellings are stable enough to key a lexicon against. *Pinned by T-001; drift caught by G2/SCHEMA-1.*
- A3 — `DailyReading` reuses the `{passes, assembled}` **shape** of `AssetGenerateResponse`, but is rendered by a new `DailyReadingBody` (T-053), **not** by `useReportGenerator`. It intentionally omits the `register` field that `AssetGenerateResponse` requires; "render-pipe reuse" means shape-parity, not type-assignability. *(Reconciliation of the critic's minor finding — no forced cast, no `register undefined` in a footer.)*
- A4 — **`vedicClock` is out of slice 1.** The interpreter bundle keeps `vedicClock?` optional, but no task probes or consumes it. A vedic-clock probe + pass is an explicit fast-follow, recorded here so the omission is a decision, not a silent drop.
- A5 — the personal overlay is the **lean first cut** (moon-through-houses + vara-ruler-to-natal); full transit-aspect interpretation is a fast-follow (spec §11 Q3).

## 3. Agent ownership model

| Concern | Primary owner | Reviewer | Tasks (representative) |
|---|---|---|---|
| Orchestration · contracts · rubric guide · ISA · docs | **Claude** (planner) | human lead | T-006, T-007, T-029, T-084, T-098, T-099 |
| Interpreter · lexicon · panel · dispatch · hooks | **Codex** (UI/app) | Claude | T-020–T-041, T-050–T-059, T-056/57/58 |
| Engine-contract · ledger · witness adapter | **Copilot** (cloud/backend) | Claude | T-008, T-012, T-090–T-093, T-095 |
| Probe · gates · tests · exit gates | **Gemini** (validation) | Claude | T-001–T-005, T-013, T-037, T-049, T-070–T-086, T-094–T-097 |

Baseline is the swarm-architect default split; every task carries an explicit `owner_agent`.

## 4. Phase map

| Phase | Title | Tasks | Gate (exit) | Unlocks |
|---|---|---|---|---|
| **0** | Discovery & Contracts | T-001…T-013 | **T-013** (`verify:daily-contracts`) | all parallel Phase-1 work |
| **1** | Interpretation spine ① | T-020…T-049 | **T-049** (`verify:daily-phase1`) | Phases 2/3/4 |
| **2** | Surface & integration | T-050…T-062 | **T-062** (Phase-2 sign-off) | Phase-3 gates |
| **3** | Verification & hardening | T-070…T-086 | **T-086** (consolidated evidence) | Phase-4 readiness |
| **4** | Engine route readiness ③ | T-090…T-099 | **T-099** (handoff reconciliation) | the ①→③ flip (on Selemene) |

Every phase ends in a **runnable exit gate**, mirroring the product-map's law: the exit contract is executable, not asserted.

## 5. Detailed Phase 0 & Phase 1 layout

### Phase 0 — Discovery & Contracts *(everything downstream depends on T-013)*
- **Wave 0-A — Probe reality & bootstrap harness**
  - *P0-A1 [Gemini]* Live engine probe: `panchanga` + `transits` schema (T-001, T-002), resolve "today, no birth data" (T-003), capture the frozen fixture bundle spanning Nanda/Rikta · waxing/waning · overlay/none (T-004).
  - *P0-A2 [Gemini]* Bootstrap the vitest unit/snapshot runner as a frozen tooling contract (T-005). 🔒 `package.json`.
- **Wave 0-B — Freeze the contracts** (parallel, no shared-file contention except T-010)
  - *P0-B1 [Claude]* Seam + I/O types + `DAILY_SOURCE` flag (T-006); pass model (T-007).
  - *P0-B2 [Copilot]* `engine-contract.ts` typed responses + `buildDailyRequest` (T-008).
  - *P0-B3 [Codex]* Six lexicon entry schemas + enum key-domains (T-009); **`{kind:'daily'}` ChildRun variant** (T-010, 🔒 `src/types/index.ts`); location resolution contract (T-011).
- **Wave 0-C — Ledger & exit gate**
  - *P0-C1 [Copilot]* Seed `docs/selemene-engine-requests.md` (T-012).
  - *P0-C2 [Gemini]* The runnable Phase-0 exit gate `daily-contracts.mjs` (T-013). 🔒 `package.json`.

### Phase 1 — Interpretation spine ① *(gates on T-013; internal parallelism)*
- **Wave A — Interpreter against frozen contracts**
  - *A1 [Codex]* `DeterministicInterpreter` shell + `interpret()` + meta (T-020); source registry + flag (T-021, 🔒 `registry.ts`); assembler + graceful closing (T-027).
  - *A2 [Codex]* Five pass-builders (T-022–T-026) + the contrasting-fixture unit suite (T-028), tested against a **stub lexicon** so Wave A runs parallel to Wave B.
- **Wave B — Lexicon authoring** (one swarm per limb, fully parallel)
  - *B0 [Claude]* Rubric-derived authoring guide (T-029); *B0 [Codex]* barrel + exhaustive accessors (T-036, 🔒 `lexicon/index.ts`); *B0 [Gemini]* authoring-time completeness+voice pre-check (T-037).
  - *B1–B6 [Codex]* vara (T-030) · tithi (T-031) · nakshatra (T-032) · yoga (T-033) · karana (T-034) · transit (T-035).
- **Wave C — Location, request builder, hook & exit**
  - *C1 [Codex/Gemini]* `location.ts` (T-039) + precedence/privacy tests (T-040).
  - *C2 [Codex]* request builder appended to `engine-contract.ts` (T-038, 🔒).
  - *C3 [Codex/Gemini]* `useDailyReading` hook (T-041) + mocked-engine integration test (T-042).
  - *C4 [Gemini]* end-to-end exit proof over the real lexicon (T-043); determinism/purity snapshot (T-044); **the consolidated Phase-1 exit gate (T-049)**.

*(Phases 2–4 wave/swarm layouts are in the spec §-mapping and the per-task `wave/swarm` fields in Appendix A.)*

## 6. Dependency rationale

- **Contracts freeze before any parallel build.** All of Phase 1's implementation gates on **T-013** (the Phase-0 exit gate), which itself requires every frozen artifact (seam, types, engine-contract, lexicon schemas, ChildRun variant, location contract, fixtures, ledger). Nothing downstream re-decides a contract.
- **Phase 1 fans out, then re-converges.** Wave A (interpreter, stub-lexicon-tested) and Wave B (lexicon authoring) run in parallel; they meet at **T-043** (interpret over the *real* lexicon) and close at **T-049**.
- **Independent tracks:** the six lexicon limbs (T-030–T-035), the five pass-builders (T-022–T-026), and location (T-039/T-040) have no cross-dependencies — ideal parallel swarm work.
- **Serialized lock zones (18 tasks).** One owner per shared file: `src/types/index.ts`→T-010; `src/data/selemeneNodes.ts`→T-056; `src/pages/NodePage.tsx`→T-057; `src/components/panels/FolioPanel.tsx`→T-058; `scripts/verify/taxonomy.mjs`→T-080; `src/lib/daily/source.ts`→T-021/T-091; `engine-contract.ts`→T-008/T-038; `lexicon/index.ts`→T-036; `package.json`→T-005/T-070/T-083; `ISA.md`→T-084/T-098/T-099; ledger→T-012/T-093/T-095; `registry.ts`→T-021. Edits to these serialize; contract-changing edits live in Phase 0.
- **Merges at wave boundaries**, not continuously — each wave ends in a gate or sign-off.
- **Phases 2/3/4 gate on T-049**; Phase 4's flip-safety (T-096) and the ledger acceptance (T-094) additionally gate on the Phase-3 exit (T-086).

## 7. Verification strategy

- **Eight behavioral gates**, each its own task and each shown **red at least once** by mutating its invariant: G1 taxonomy (T-080), G2 live-schema (T-081), G3 completeness (T-073), G4 determinism (T-074), G5 voice (T-075), G6 degradation (T-076), G7 behavioral-live (T-082), G8 seam-swap (T-077 + runnable T-096).
- **Five runnable phase exit gates:** T-013, T-049, T-062, T-086, T-099 — a green run means the surface actually behaves, not that a build compiled.
- **Aggregation:** `npm run verify:all` chains taxonomy + modes + daily and exits non-zero if any single gate fails (T-083); README + product-map command tables updated to match real output (T-085).
- **The product-map law throughout:** G7 cross-checks the rendered tithi against an independent live `panchanga` call; the ledger's REQ-2/REQ-3 reuse the existing `mode-gates.mjs` pass-plan comparison so acceptance can't false-PASS on time-seeded assembled text.

## 8. GitHub sync strategy

- **One task → one issue**, labelled `phase:N`, `wave:<id>`, `swarm:<id>`, `owner:<agent>`, `lock-zone` where applicable.
- Dependencies preserved as issue-body checklists (`depends on #…`); the 18 lock-zone issues carry a `serialize` note naming the shared file.
- **PR-per-task** on `feat/daily-panchanga-reading/<task-id>` branches (or per-swarm for tightly-coupled sets); **merge at wave boundaries** with a wave-summary comment.
- A lightweight **DAG validator** (added to CI as part of T-013's tooling) fails the plan build if any dependency ID is undefined — so the drift the critic caught can never silently return.
- CI is already active/green on PRs to `main`; each wave's merge runs `verify:all`.

## 9. Worker bootstrap packet strategy

Fresh Codex/Copilot/Gemini sessions launch from a scoped packet per swarm containing: (a) the **frozen Phase-0 contracts** (the only shared truth — seam, types, engine-contract, lexicon schemas, location contract, fixtures); (b) the swarm's task subset with acceptance commands; (c) the lock-zone rules naming any serialized file; (d) the relevant fixtures. Phase-0 must complete before any worker packet for Phase 1+ is issued — the packet's value is that the contracts are already frozen, so a worker never re-litigates them. (Template: swarm-architect `shared-contract-packet-template.md` + `cli-session-bootstrap-template.md`.)

## 10. Risks & fallback

| # | Risk | Trigger | Fallback |
|---|---|---|---|
| R1 | Panchanga can't do "today, no birth data" cleanly | T-003 can't get two-dates→two-tithi | Send a minimal date+location synthetic `birth_data`; if still blocked, key the base to the birth location and gate the universal-base claim |
| R2 | Engine enum spellings differ / drift | T-001 mismatch, or G2 red later | Pin lexicon keys to the probe; log any rename in SCHEMA-1; G2 fails loud rather than degrading |
| R3 | ③ engine work never lands | REQ harness (T-094) stays red indefinitely | ① ships and stands alone; dormant adapter + ledger keep the door open with **zero** user-facing dependency on ③ |
| R4 | Lexicon authoring volume (30+27+27+11+7) | Wave B slips | Six parallel swarms; G3 prevents gaps; lean transit overlay (A5) |
| R5 | `register`-field type friction | tsc error reusing the render path | `DailyReading` is rendered by `DailyReadingBody`, not `useReportGenerator` (A3) — shape-parity, no assignability requirement |
| R6 | Parallel-decomposition ID drift | (already occurred) | Reconciled in §11 + a DAG validator in CI (§8) so it can't recur |

## 11. Reconciliation applied (critic → fixes)

The completeness critic verdict was `needs-fixes`: **content-complete, not executable as a DAG.** All fixes applied:

**Critical — dangling cross-phase IDs (renumbering drift).** Seven IDs were referenced but never defined; each repointed to the real task:

| Dangling | → | Real task |
|---|---|---|
| T-014 (engine-contract + fixtures) | → | **T-008** |
| T-015 (request shape) | → | **T-003** |
| T-016 (location contract) | → | **T-011** |
| T-017 (seam + DailyReading + ChildRun) | → | **T-006** |
| T-019 (Phase-0 exit gate) | → | **T-013** |
| T-069 (Phase-2 exit gate) | → | **T-062** |
| T-089 (Phase-3 exit gate) | → | **T-086** |

**Major — missing Phase-1 exit gate.** `T-049` (referenced by 12 downstream tasks) had no referent — **authored** as the consolidated Phase-1 exit gate (deps T-036, T-037, T-040, T-042, T-043, T-044).

**Minor —** (a) `T-091` now explicitly depends on `T-021` (the source registry it extends); (b) the `register`-field seam resolved via A3 (no forced assignability); (c) `vedicClock` deferral recorded as A4; (d) `package.json` confirmed lock-zone on T-005/T-070/T-083 and named in §6's lock registry.

**Result:** 79 tasks, **0 dangling dependencies**, no cycles (all edges point to earlier tasks).

---

## Appendix A — Full task list (schema-complete)

### Master task table

_79 tasks. Reconciled: 7 dangling cross-phase IDs repointed, 1 missing exit gate (T-049) added, T-091→T-021 dep added. Dangling deps after reconcile: 0._

| ID | Ph | Wave/Swarm | Area | Agent | h | Lock | Deps | Title |
|---|---|---|---|---|---|---|---|---|
| T-001 | 0 | 0-A/P0-A1 | backend | Gemini | 4 |  | — | Probe live panchanga schema + freeze enum spellings |
| T-002 | 0 | 0-A/P0-A1 | backend | Gemini | 3.5 |  | — | Probe live transits schema for the overlay |
| T-003 | 0 | 0-A/P0-A1 | backend | Gemini | 3 |  | T-001 | Resolve the 'today at location L, no birth data' request shape |
| T-004 | 0 | 0-A/P0-A1 | qa | Gemini | 4 |  | T-001 T-002 T-003 | Capture the frozen fixture bundle (Nanda/Rikta, waxing/waning, overlay/none) |
| T-005 | 0 | 0-A/P0-A2 | infra | Gemini | 3 | 🔒 | — | Bootstrap the pure-interpreter test/snapshot harness |
| T-006 | 0 | 0-B/P0-B1 | frontend | Claude | 3 |  | — | Freeze the DailyReadingSource seam + output/input types |
| T-007 | 0 | 0-B/P0-B1 | frontend | Claude | 2 |  | T-006 | Freeze the interpreter pass model |
| T-008 | 0 | 0-B/P0-B2 | backend | Copilot | 4 |  | T-001 T-002 T-003 T-004 | Freeze engine-contract.ts (typed responses + request builder) |
| T-009 | 0 | 0-B/P0-B3 | data | Codex | 4 |  | T-001 | Freeze the six lexicon entry schemas + enum key-domains |
| T-010 | 0 | 0-B/P0-B3 | frontend | Codex | 1.5 | 🔒 | T-006 | Add the {kind:'daily'} ChildRun variant to the type model |
| T-011 | 0 | 0-B/P0-B3 | frontend | Codex | 2.5 |  | T-006 | Freeze the location resolution contract |
| T-012 | 0 | 0-C/P0-C1 | product | Copilot | 3 |  | T-001 T-008 | Seed the engine-request ledger |
| T-013 | 0 | 0-C/P0-C2 | qa | Gemini | 3 | 🔒 | T-004 T-005 T-006 T-007 T-008 T-009 T-010 T-011 T-012 | Author the Phase 0 exit-gate check |
| T-020 | 1 | P1-WA/A1 | frontend | Codex | 4 |  | T-008 T-006 T-013 | DeterministicInterpreter shell + interpret() contract + DailyReading meta assembly |
| T-021 | 1 | P1-WA/A1 | frontend | Codex | 2 | 🔒 | T-020 T-006 | Source registry + DAILY_SOURCE config flag (① now, ③ flip-point) |
| T-022 | 1 | P1-WA/A2 | frontend | Codex | 2 |  | T-020 T-013 T-008 | varaPass builder |
| T-023 | 1 | P1-WA/A2 | frontend | Codex | 3 |  | T-020 T-013 T-008 | tithiPass builder |
| T-024 | 1 | P1-WA/A2 | frontend | Codex | 3 |  | T-020 T-013 T-008 | nakshatraPass builder |
| T-025 | 1 | P1-WA/A2 | frontend | Codex | 3 |  | T-020 T-013 T-008 | conditionsPass builder (yoga + karana folded) |
| T-026 | 1 | P1-WA/A2 | frontend | Codex | 4 |  | T-020 T-013 T-008 | nativePass overlay builder (transit → natal) |
| T-027 | 1 | P1-WA/A1 | frontend | Codex | 4 |  | T-022 T-023 T-024 T-025 T-026 | Assembler + graceful closing invitation |
| T-028 | 1 | P1-WA/A2 | qa | Gemini | 4 |  | T-022 T-023 T-024 T-025 T-026 T-027 | Pass-builder + assembler unit suite (contrasting fixtures) |
| T-029 | 1 | P1-WB/B0 | product | Claude | 4 |  | T-013 | Rubric-derived lexicon authoring guide + per-limb templates |
| T-030 | 1 | P1-WB/B1 | data | Codex | 2 |  | T-029 T-013 T-008 | Author vara.ts (7 entries) |
| T-031 | 1 | P1-WB/B2 | data | Codex | 5 |  | T-029 T-013 T-008 | Author tithi.ts (30 entries) |
| T-032 | 1 | P1-WB/B3 | data | Codex | 5 |  | T-029 T-013 T-008 | Author nakshatra.ts (27 entries) |
| T-033 | 1 | P1-WB/B4 | data | Codex | 4 |  | T-029 T-013 T-008 | Author yoga.ts (27 entries) |
| T-034 | 1 | P1-WB/B5 | data | Codex | 2 |  | T-029 T-013 T-008 | Author karana.ts (11 entries) |
| T-035 | 1 | P1-WB/B6 | data | Codex | 5 |  | T-029 T-013 T-008 | Author transit.ts (aspect × planet-pair keynotes) |
| T-036 | 1 | P1-WB/B0 | data | Codex | 2 | 🔒 | T-030 T-031 T-032 T-033 T-034 T-035 | Lexicon barrel + typed exhaustive accessors |
| T-037 | 1 | P1-WB/B0 | qa | Gemini | 3 |  | T-030 T-031 T-032 T-033 T-034 T-035 T-036 | Lexicon completeness + voice pre-check (authoring-time) |
| T-038 | 1 | P1-WC/C2 | data | Codex | 4 | 🔒 | T-008 T-003 T-013 | Engine request builder — 'today at L, no birth data' |
| T-039 | 1 | P1-WC/C1 | frontend | Codex | 4 |  | T-011 | Location resolution module |
| T-040 | 1 | P1-WC/C1 | qa | Gemini | 3 |  | T-039 | Location resolution tests (precedence + privacy) |
| T-041 | 1 | P1-WC/C3 | frontend | Codex | 4 |  | T-021 T-027 T-038 T-039 | useDailyReading orchestration hook |
| T-042 | 1 | P1-WC/C3 | qa | Gemini | 3 |  | T-041 | useDailyReading integration test (mocked engine) |
| T-043 | 1 | P1-WC/C4 | qa | Gemini | 3 |  | T-027 T-028 T-036 T-037 | EXIT PROOF — end-to-end interpret over real lexicon + frozen bundle |
| T-044 | 1 | P1-WC/C4 | qa | Gemini | 2 |  | T-043 | Determinism / purity snapshot fixtures |
| T-049 | 1 | P1-WC/C4-exit | qa | Gemini | 2 |  | T-036 T-037 T-040 T-042 T-043 T-044 | Phase 1 consolidated exit gate |
| T-050 | P2 | W2A/S-2A1 | frontend | Codex | 4 |  | T-049 T-013 | DailyReadingPanel scaffold (Modal-mounted, hook-driven) |
| T-051 | P2 | W2A/S-2A1 | frontend | Codex | 3 |  | T-013 T-049 | Location/date/timezone header |
| T-052 | P2 | W2A/S-2A1 | frontend | Codex | 5 |  | T-049 T-013 | Location change affordance (geocode + opt-in geolocation) |
| T-053 | P2 | W2A/S-2A1 | frontend | Codex | 4 |  | T-013 | Layered reading body (base movements + optional overlay) |
| T-054 | P2 | W2B/S-2B1 | frontend | Codex | 4 |  | T-050 T-053 | Graceful-degradation affordance (no birth data -> invitation CTA) |
| T-055 | P2 | W2B/S-2B1 | frontend | Codex | 2 |  | T-050 | Panel loading / error / empty states |
| T-056 | P2 | W2B/S-2B2 | data | Codex | 2 | 🔒 | T-013 | Add 'panchanga-flow' "Today" child to Sky Weather |
| T-057 | P2 | W2B/S-2B3 | frontend | Codex | 5 | 🔒 | T-050 T-013 | NodePage/Modal dispatch for {kind:'daily'} |
| T-058 | P2 | W2C/S-2C1 | frontend | Codex | 3 | 🔒 | T-057 T-056 T-049 | Folio round-trip for the daily reading |
| T-059 | P2 | W2C/S-2C2 | frontend | Codex | 3 |  | T-057 T-052 T-056 | Location change -> re-run -> persist round-trip |
| T-060 | P2 | W2D/S-2D1 | qa | Gemini | 3 |  | T-057 T-056 T-058 T-054 | Behavioral live smoke — Sky Weather ▸ Today |
| T-061 | P2 | W2C/S-2C2 | frontend | Codex | 3 |  | T-057 T-050 | Responsive bottom-sheet + a11y for the daily panel |
| T-062 | P2 | W2E/S-2E1 | qa | Gemini | 2 |  | T-060 T-059 T-061 | Phase 2 exit-criteria sign-off |
| T-070 | P3 | P3-A/S3A-harness | infra | Gemini | 4 | 🔒 | T-049 | Stand up the vitest unit-test harness for the daily interpreter |
| T-071 | P3 | P3-A/S3A-harness | qa | Gemini | 3 |  | T-013 T-049 T-070 | Build the frozen snapshot corpus covering the G4 variance axes |
| T-072 | P3 | P3-A/S3A-harness | qa | Gemini | 2 |  | T-049 | Author the data-driven predictive/imperative rule-set for G5 |
| T-073 | P3 | P3-B/S3B-pure-gates | qa | Gemini | 3 |  | T-070 T-013 T-049 | G3 — lexicon completeness gate (full enum coverage) |
| T-074 | P3 | P3-B/S3B-pure-gates | qa | Gemini | 4 |  | T-070 T-071 | G4 — determinism / snapshot gate over the frozen corpus |
| T-075 | P3 | P3-B/S3B-pure-gates | qa | Gemini | 3 |  | T-070 T-072 T-071 | G5 — voice / rubric gate (no imperatives or predictions) |
| T-076 | P3 | P3-B/S3B-pure-gates | qa | Gemini | 3 |  | T-070 T-071 | G6 — graceful-degradation gate (interpreter half) |
| T-077 | P3 | P3-B/S3B-pure-gates | qa | Gemini | 3 |  | T-070 T-013 T-071 | G8 — seam-swap conformance gate |
| T-078 | P3 | P3-B/S3B-pure-gates | qa | Gemini | 2 |  | T-070 T-049 | Harden interpret() — purity audit (no clock/random leakage) |
| T-079 | P3 | P3-B/S3B-pure-gates | qa | Gemini | 3 |  | T-070 T-071 T-073 | Harden interpret() — schema-drift / negative-path robustness |
| T-080 | P3 | P3-C/S3C-live | qa | Gemini | 3 | 🔒 | T-062 | G1 — extend taxonomy.mjs to resolve {kind:'daily'} |
| T-081 | P3 | P3-C/S3C-live | qa | Gemini | 4 |  | T-013 T-062 | G2 — live schema-contract check in daily-gates.mjs |
| T-082 | P3 | P3-C/S3C-live | qa | Gemini | 5 |  | T-062 T-081 | G7 — behavioral gate against the running app |
| T-083 | P3 | P3-C/S3C-live | infra | Gemini | 3 | 🔒 | T-070 T-081 T-082 | Assemble daily-gates.mjs runner + verify scripts |
| T-084 | P3 | P3-C/S3C-docs | product | Claude | 2 | 🔒 | T-073 T-075 T-077 T-080 T-082 | Record G1..G8 as behavioral ISCs in ISA.md |
| T-085 | P3 | P3-C/S3C-docs | product | Claude | 2 |  | T-083 | Update verification-command docs (README + product map) |
| T-086 | P3 | P3-C/S3C-live | qa | Gemini | 3 |  | T-073 T-074 T-075 T-076 T-077 T-080 T-081 T-082 T-083 T-084 T-085 | Consolidated evidence run — Phase 3 exit gate |
| T-090 | P4 | W4A/S4A-1 | backend | Copilot | 4 |  | T-013 T-049 | Implement WitnessModeSource adapter (src/lib/daily/witness.ts), dormant |
| T-091 | P4 | W4A/S4A-1 | backend | Copilot | 2 | 🔒 | T-049 T-090 T-021 | Wire DAILY_SOURCE flag into the source factory to select ①/③ |
| T-092 | P4 | W4A/S4A-1 | backend | Copilot | 3 |  | T-013 T-090 | Build the witness request mapping so ③ narrates 'today' (REQ-5 alignment) |
| T-093 | P4 | W4A/S4A-2 | product | Copilot | 3 | 🔒 | T-013 | Finalize docs/selemene-engine-requests.md (REQ-1..5 + SCHEMA-1) |
| T-094 | P4 | W4B/S4B-1 | qa | Gemini | 4 |  | T-086 T-093 | Make ledger accept commands runnable (scripts/verify/engine-requests.mjs) |
| T-095 | P4 | W4B/S4B-3 | product | Copilot | 2 | 🔒 | T-091 T-093 | Document the ①→③ flip procedure (runbook) |
| T-096 | P4 | W4B/S4B-2 | qa | Gemini | 3 |  | T-049 T-086 T-090 T-091 | Seam-swap test — ① and ③ produce identical DailyReading shape (G8) |
| T-097 | P4 | W4B/S4B-2 | qa | Gemini | 2 |  | T-062 T-091 | Dormancy guard — ③ never activates under the default flag |
| T-098 | P4 | W4C/S4C-1 | product | Claude | 2 | 🔒 | T-093 T-095 T-096 | Record the ③ engine-route-readiness ISC(s) in ISA.md |
| T-099 | P4 | W4C/S4C-1 | qa | Claude | 3 | 🔒 | T-090 T-091 T-092 T-093 T-094 T-095 T-096 T-097 T-098 | Phase 4 exit reconciliation + Selemene-repo handoff summary |

_Total estimate: **249.5h** across 79 tasks. Lock-zone tasks (serialized): 18._

### Task detail


#### Phase 0 · Discovery & Contracts

**T-001 · Probe live panchanga schema + freeze enum spellings**  
`backend` · Validation Engineer (Gemini) · 4h · 0-A/P0-A1 · deps: none  
- **Deliverable:** Raw live capture src/lib/daily/__fixtures__/panchanga.today.json from POST /api/selemene/api/v1/engines/panchanga/calculate, plus docs/daily/engine-schema-notes.md documenting the exact key names and enum string spellings the engine returns for vara, tithi, nakshatra, yoga, karana, paksha, and transition timestamps.
- **Acceptance:** The captured fixture is a real live 200 response (not synthetic); the notes enumerate the engine's verbatim spellings for all five limbs + paksha + transition times, and a re-probe against the live engine reproduces the identical top-level key set. Every enum value the interpreter will key on appears exactly as the engine spells it.
- **Validation:** Re-run the probe against the live engine and diff its key set against the committed notes (identical); spot-check 3 enum spellings (a tithi, a nakshatra, a karana) against the raw fixture.
- **Notes:** Phase 0 Wave A. Interpreter input types are provisional until this lands (spec section 6). SCHEMA-1 baseline (T-012) and the lexicon key-domains (T-009) derive from these spellings.

**T-002 · Probe live transits schema for the overlay**  
`backend` · Validation Engineer (Gemini) · 3.5h · 0-A/P0-A1 · deps: none  
- **Deliverable:** Raw live capture src/lib/daily/__fixtures__/transits.today.json from POST /api/selemene/api/v1/engines/transits/calculate (birth data present), plus notes on the aspect + planet-pair field shape (which fields carry aspect type, the ordered planet pair, orb/applying).
- **Acceptance:** Fixture is a real live response containing today's transit aspects; the notes identify the exact fields the nativePass overlay + transit lexicon key will read (aspect enum + ordered planet pair), sufficient to derive a stable transit-lexicon key without re-probing.
- **Validation:** Live re-call; confirm the documented fields exist and carry the documented types in the raw fixture.
- **Notes:** Phase 0 Wave A. Overlay is conditional on birth data; feeds nativePass (Phase 1) and lexicon/transit.ts. Transit-aspect depth may be leaned per spec open-question 3.

**T-003 · Resolve the 'today at location L, no birth data' request shape**  
`backend` · Validation Engineer (Gemini) · 3h · 0-A/P0-A1 · deps: T-001  
- **Deliverable:** A verified decision recorded in docs/daily/engine-schema-notes.md (later encoded by T-008's buildDailyRequest) stating exactly how 'today at location L without birth data' is expressed to the panchanga engine — whether via birth_data.date/time = current local datetime + lat/long/timezone, or a current_time field — with the exact reproducing curl commands.
- **Acceptance:** The resolved shape, sent live for one location on two different calendar dates, returns two DIFFERENT tithi values (proving it narrates 'today', not a fixed moment); and timezone is demonstrably carried so tithi/nakshatra boundaries shift by locale. The decision is documented unambiguously enough to implement without re-probing.
- **Validation:** Two live calls (date A vs date B) at one location yield different tithi; a locale/timezone variation shows a boundary shift; recorded curl commands reproduce both.
- **Notes:** Phase 0 Wave A. Spec section 6's central open question; mirrors ledger REQ-5. DeterministicRequest already carries current_time? optionally (src/types/index.ts) — this pins which field the engine actually honors.

**T-004 · Capture the frozen fixture bundle (Nanda/Rikta, waxing/waning, overlay/none)**  
`qa` · Validation Engineer (Gemini) · 4h · 0-A/P0-A1 · deps: T-001, T-002, T-003  
- **Deliverable:** Committed raw fixtures under src/lib/daily/__fixtures__/ forming >=4 named bundles {panchanga, transits?, vedicClock?} spanning a Nanda-group vs Rikta-group tithi, a shukla (waxing) vs krishna (waning) paksha, and overlay-present (with transits) vs overlay-absent (base only), plus a bundles.manifest.json describing each.
- **Acceptance:** Each bundle is a real engine capture (obtained by pointing the T-003 request shape at the appropriate dates), all four variation axes are represented across the set, and every bundle carries the limb keys documented in T-001. Phase 1 pass-builder tests and Phase 3 G4 can load bundles by name.
- **Validation:** A loader asserts each named bundle exists and carries the required limbs; manual check that the tithi/paksha categories the manifest claims match the fixtures.
- **Notes:** Phase 0 Wave A. Typing of these fixtures against engine-contract is validated in T-008. Underpins Phase 1 exit ('interpret() from a fixture bundle') and Phase 3 G4 determinism/snapshot.

**T-005 · Bootstrap the pure-interpreter test/snapshot harness**  
`infra` · Validation Engineer (Gemini) · 3h · 0-A/P0-A2 · 🔒 lock-zone · deps: none  
- **Deliverable:** A unit/snapshot test runner (vitest) added and wired to `npm test`, with one placeholder snapshot test over a committed fixture proving the harness runs and asserts.
- **Acceptance:** `npm test` runs green on the placeholder; deliberately mutating the expected snapshot turns the run RED, and reverting restores green (the harness actually asserts, it does not merely exit 0). Invokable with a single command for CI/gates.
- **Validation:** Run `npm test` (green) -> mutate the snapshot (red) -> revert (green), with the transcript captured.
- **Notes:** Phase 0 Wave A, parallel infra (repo currently ships only Playwright, no unit runner). Frozen tooling contract so Phase 1 swarms do not each pick a different runner. Edits package.json -> lock zone with T-013.

**T-006 · Freeze the DailyReadingSource seam + output/input types**  
`frontend` · Planner/Orchestrator (Claude) · 3h · 0-B/P0-B1 · deps: none  
- **Deliverable:** src/lib/daily/source.ts exporting DailyReadingInput, DailyReading, DailyLocation, the DailyReadingSource interface, and the DAILY_SOURCE: 'deterministic' | 'witness' config flag (default 'deterministic').
- **Acceptance:** DailyReading is structurally AssetGenerateResponse's {passes,assembled,engines_used} plus mode:'daily-panchanga' and meta:{date,location,hasOverlay,source}; a value typed as DailyReading is accepted everywhere useReportGenerator reads passes/assembled/engines_used (render-pipe reuse compiles), and stub DeterministicInterpreter + WitnessModeSource both satisfy DailyReadingSource. tsc green.
- **Validation:** tsc; a compile-time assignability assertion (DailyReading -> the useReportGenerator read shape) plus two stub sources both typed as DailyReadingSource compile.
- **Notes:** Phase 0 Wave B. The anti-drift seam — the graph child, useDailyReading hook, Folio archiving, and every gate bind to this, never a concrete impl (spec section 3). Spec-derived, no probe needed. DailyLocation is defined here; T-011 layers the resolution contract on top.

**T-007 · Freeze the interpreter pass model**  
`frontend` · Planner/Orchestrator (Claude) · 2h · 0-B/P0-B1 · deps: T-006  
- **Deliverable:** A frozen PASS_MODEL (ordered pass ids + titles + base/overlay classification) in src/lib/daily/passModel.ts: vara, tithi, nakshatra, conditions (yoga+karana), native (overlay), assembled.
- **Acceptance:** The constant enumerates exactly the spec section 4 passes with base-vs-overlay flags; a test asserts the base subset excludes `native` and `native` is marked conditional; ledger REQ-4 ('pass titles map 1:1 to the interpreter's pass model') and Phase 3 G8 seam-swap can both reference it as the single source of pass identity for both source implementations.
- **Validation:** tsc; unit test on base vs overlay membership + count.
- **Notes:** Phase 0 Wave B. Anchors the source-1/source-3 'same shape' guarantee (Phase 4 witness adapter must emit the same pass ids) and ledger REQ-4 acceptance.

**T-008 · Freeze engine-contract.ts (typed responses + request builder)**  
`backend` · Cloud/Backend Engineer (Copilot) · 4h · 0-B/P0-B2 · deps: T-001, T-002, T-003, T-004  
- **Deliverable:** src/lib/daily/engine-contract.ts exporting typed PanchangaResponse and TransitsResponse matching the probe's exact keys, plus a pure buildDailyRequest(input: DailyReadingInput) that encodes the T-003-verified 'today, no birth data' body (and the birth-data-present overlay request).
- **Acceptance:** Every captured fixture (T-004) typechecks against these types with no `any` and no casts; buildDailyRequest output deep-equals the exact request body that produced the live panchanga fixture; renaming an engine key in a fixture makes tsc fail (types are tight, not Record<string,unknown>).
- **Validation:** tsc against all fixtures; unit test buildDailyRequest -> recorded request body; a negative test where a mutated fixture key produces a tsc error.
- **Notes:** Phase 0 Wave B. THE consumer->engine contract. Phase 3 G2 (live schema contract) asserts today's live panchanga still carries these keys; SCHEMA-1 in the ledger tracks any rename as a breaking change.

**T-009 · Freeze the six lexicon entry schemas + enum key-domains**  
`data` · UI/App Engineer (Codex) · 4h · 0-B/P0-B3 · deps: T-001  
- **Deliverable:** Typed entry interfaces VaraEntry/TithiEntry/NakshatraEntry/YogaEntry/KaranaEntry/TransitEntry (fields per spec section 4) under src/lib/daily/lexicon/, plus a frozen key-domain module listing every enum value the engine emits — 30 tithi, 27 nakshatra, 27 yoga, 11 karana, 7 vara — spelled exactly per T-001.
- **Acceptance:** Each entry interface carries the exact spec section 4 fields (every limb includes a keynote and an invitation clause); the key-domain arrays have lengths 30/27/27/11/7 and every value matches a spelling in the T-001 notes; an expectedKeys() helper enumerates them (precisely what Phase 3 G3 lexicon-completeness asserts against authored tables). Schemas + domains only — no authored content yet.
- **Validation:** tsc; unit test asserting the array lengths (30/27/27/11/7) and that each domain value appears verbatim in the probe notes.
- **Notes:** Phase 0 Wave B. Authoring the tables is Phase 1 Wave B (each limb a swarm); this freezes only their shape + the completeness target so G3 is well-defined. Imperative-avoidance lives in the data (invitation field), so tone cannot drift.

**T-010 · Add the {kind:'daily'} ChildRun variant to the type model**  
`frontend` · UI/App Engineer (Codex) · 1.5h · 0-B/P0-B3 · 🔒 lock-zone · deps: T-006  
- **Deliverable:** src/types/index.ts ChildRun union gains { kind: 'daily'; needsLocation: true } with a doc-comment pointing to DailyReadingSource (source-1 now / source-3 later).
- **Acceptance:** `npm run build` (tsc) is green with the variant present; the existing useDeterministicRun switch still typechecks (its workflow/engine handling is unaffected and `daily` is intentionally not yet dispatched — that is Phase 2); verify:taxonomy still passes unchanged; no node in selemeneNodes.ts uses the variant yet.
- **Validation:** `npm run build` green; grep confirms the variant; `npm run verify:taxonomy` output matches the pre-change baseline.
- **Notes:** Phase 0 Wave B. LOCK ZONE — shared src/types/index.ts. Contract-only change; dispatch wiring + the panchanga-flow 'Today' child are Phase 2 (T-050..T-069). Must land before parallel Phase 1/2 work touches the type.

**T-011 · Freeze the location resolution contract**  
`frontend` · UI/App Engineer (Codex) · 2.5h · 0-B/P0-B3 · deps: T-006  
- **Deliverable:** docs/daily/location-contract.md plus a typed stub header for src/lib/daily/location.ts: the DailyLocation shape (reused from source.ts), the default-precedence contract (1 birth normalized_location -> 2 localStorage['urania.daily.location'] -> 3 labeled neutral default), the frozen localStorage record shape, and an explicit privacy rule (never the URL).
- **Acceptance:** The precedence tiers + localStorage record shape + privacy rule are documented unambiguously; a resolveDefaultLocation(...) signature and the DailyLocation type compile; the contract forbids lat/long in URL/query strings and mandates carrying timezone. Resolution LOGIC is explicitly deferred to Phase 1 Wave C — only the contract is frozen here.
- **Validation:** tsc on the DailyLocation type + the signature stub; doc review confirming all three precedence tiers, the localStorage shape, and the privacy rule are stated.
- **Notes:** Phase 0 Wave B. Location is the only genuinely-new UX surface (spec section 5); the geocode path it will reuse lives inline in WitnessForm.tsx. Freezing the contract now lets Phase 1 Wave C implement without re-litigating precedence or privacy.

**T-012 · Seed the engine-request ledger**  
`product` · Cloud/Backend Engineer (Copilot) · 3h · 0-C/P0-C1 · deps: T-001, T-008  
- **Deliverable:** docs/selemene-engine-requests.md seeded with REQ-1..REQ-5 + SCHEMA-1 (per spec section 8), each carrying a runnable accept command; REQ-2/REQ-3 accept commands invoke the existing scripts/verify/mode-gates.mjs; SCHEMA-1's baseline lists the exact panchanga keys captured in T-001.
- **Acceptance:** Running each accept command today executes without error and reports the CURRENT (unserved) engine state — REQ-1 shows daily-panchanga still falling back to default:Reading, REQ-2 shows an unknown mode still returning 200 (gap documented), and SCHEMA-1 keys diff clean against the T-001 capture; every request row has what/why/accept/status/owner with status queued. No engine change is made in this repo.
- **Validation:** Execute the REQ-2/REQ-3 (mode-gates.mjs) command and one SCHEMA-1 key-diff live; confirm each REQ row is independently runnable.
- **Notes:** Phase 0 Wave C. Living consumer->producer contract driven on the Selemene repo. Phase 4 (T-090..T-099) finalizes REQ-1..5 + SCHEMA-1 with runnable accept commands and documents the source-1 -> source-3 flip. Engine REQ EXECUTION is out-of-repo.

**T-013 · Author the Phase 0 exit-gate check**  
`qa` · Validation Engineer (Gemini) · 3h · 0-C/P0-C2 · 🔒 lock-zone · deps: T-004, T-005, T-006, T-007, T-008, T-009, T-010, T-011, T-012  
- **Deliverable:** scripts/verify/daily-contracts.mjs + an `npm run verify:daily-contracts` script asserting the frozen-contract surface is real and complete.
- **Acceptance:** The gate passes today only when ALL hold — source.ts exports the seam + DailyReading/DailyReadingInput/DailyLocation + DAILY_SOURCE, PASS_MODEL present, engine-contract.ts + buildDailyRequest present, lexicon schemas + key-domains at 30/27/27/11/7, the location contract present, ChildRun carries {kind:'daily'}, the fixture bundle loads, tsc is green, and the ledger exists with SCHEMA-1 keys matching engine-contract. Renaming or removing any one frozen artifact makes the gate exit non-zero.
- **Validation:** Run the gate (exit 0); rename one frozen file -> non-zero; restore -> exit 0. Demonstrates the exit contract is executable, not merely asserted.
- **Notes:** Phase 0 Wave C. Makes the exit contract ('all interfaces + types frozen; fixtures captured') a runnable gate — green != done. Edits package.json -> lock zone with T-005. Everything in Phase 1..4 depends on this passing.


#### Phase 1 · Interpretation spine ①

**T-020 · DeterministicInterpreter shell + interpret() contract + DailyReading meta assembly**  
`frontend` · App Engineer (Codex) · 4h · P1-WA/A1 · deps: T-008, T-006, T-013  
- **Deliverable:** src/lib/daily/deterministic.ts exporting a DeterministicInterpreter that implements the frozen DailyReadingSource, with interpret(bundle, ctx) → DailyReading: a pass-builder registration seam, assembled placeholder, and fully-populated meta {date, location, hasOverlay, source:'deterministic'} + engines_used derivation.
- **Acceptance:** Calling interpret() on the Phase 0 no-birth fixture returns an object that type-checks as DailyReading with mode==='daily-panchanga', meta.source==='deterministic', meta.hasOverlay===false, engines_used includes 'panchanga', and date/location echo ctx — correct shape and meta even before pass bodies exist. A birth fixture flips meta.hasOverlay to true and adds 'transits' to engines_used.
- **Validation:** tsc clean + a vitest shape assertion over the Phase 0 fixture bundle (both branches); prove by running the suite, not by inspection.
- **Notes:** Consumes frozen types from T-017 and the fixture bundle from T-014; must not modify either. This is the shape spine every pass-builder plugs into.

**T-021 · Source registry + DAILY_SOURCE config flag (① now, ③ flip-point)**  
`frontend` · App Engineer (Codex) · 2h · P1-WA/A1 · 🔒 lock-zone · deps: T-020, T-006  
- **Deliverable:** src/lib/daily/registry.ts exposing getDailyReading(input) that reads DAILY_SOURCE (default 'deterministic'), returns the ① DeterministicInterpreter as a DailyReadingSource, and documents the single flip-point where Phase 4 registers ③.
- **Acceptance:** With the default flag, getDailyReading(input) routes to ① and returns a DailyReading whose meta.source==='deterministic'; setting the flag to 'witness' throws a clear 'witness source not yet registered' error rather than silently falling back to ①.
- **Validation:** Unit test toggles the flag and asserts source selection + the explicit throw; a grep confirms exactly one registration site.
- **Notes:** Shared with Phase 4 (T-090..T-099 registers ③ WitnessModeSource here) — serialize edits. No silent default is the anti-drift discipline mirrored from the mode-gates law.

**T-022 · varaPass builder**  
`frontend` · App Engineer (Codex) · 2h · P1-WA/A2 · deps: T-020, T-013, T-008  
- **Deliverable:** varaPass(bundle, ctx, lexicon) in deterministic.ts that reads the day's vara from the panchanga fixture and composes base pass {id:'vara', title, output} from the vara lexicon entry (ruler, keynote, field, invitation).
- **Acceptance:** Given a fixture whose vara resolves to a known key and a stub lexicon entry, varaPass emits a pass whose output contains the entry's keynote and invitation clause and no imperative; a fixture with a different vara yields materially different output driven by the key.
- **Validation:** Unit test with two contrasting fixtures + stub lexicon asserts key-driven divergence; mutating the read key makes the test fail.
- **Notes:** Depends on the lexicon SCHEMA (T-013), not authored content — tested with a stub so Wave A runs parallel to Wave B. Real-content proof is T-043.

**T-023 · tithiPass builder**  
`frontend` · App Engineer (Codex) · 3h · P1-WA/A2 · deps: T-020, T-013, T-008  
- **Deliverable:** tithiPass(bundle, ctx, lexicon) → {id:'tithi', title, output} reading lunar day · paksha (waxing/waning) · category · deity from the fixture and composing from the tithi lexicon entry.
- **Acceptance:** A waxing-paksha Nanda fixture and a waning Rikta fixture produce distinct outputs that correctly name each fixture's paksha and category and carry the entry keynote+invitation with no imperative.
- **Validation:** Unit test over ≥2 contrasting tithi fixtures + stub lexicon; asserts paksha/category read from the correct keys.
- **Notes:** Stub-lexicon tested; decoupled from B2 authoring.

**T-024 · nakshatraPass builder**  
`frontend` · App Engineer (Codex) · 3h · P1-WA/A2 · deps: T-020, T-013, T-008  
- **Deliverable:** nakshatraPass(bundle, ctx, lexicon) → {id:'nakshatra', title, output} reading the moon's mansion · ruler · symbol · guna and composing from the nakshatra lexicon entry.
- **Acceptance:** Two fixtures with different nakshatras yield outputs that name each mansion + ruler correctly and carry keynote+invitation, no imperative; a wrong-key read is caught by the test.
- **Validation:** Unit test over ≥2 nakshatra fixtures + stub lexicon.
- **Notes:** Stub-lexicon tested; decoupled from B3 authoring.

**T-025 · conditionsPass builder (yoga + karana folded)**  
`frontend` · App Engineer (Codex) · 3h · P1-WA/A2 · deps: T-020, T-013, T-008  
- **Deliverable:** conditionsPass(bundle, ctx, lexicon) → {id:'conditions', title, output} folding the day's yoga and karana into a single 'conditions of the day' movement composed from the yoga + karana lexicon entries.
- **Acceptance:** A fixture's yoga and karana both appear in the output with their keynotes+invitations woven into one coherent movement; changing either the yoga or karana key changes the output; no imperative constructs.
- **Validation:** Unit test asserting both limbs contribute and both keys are read; mutation spot-check.
- **Notes:** Stub-lexicon tested; consumes B4 (yoga) + B5 (karana) schemas.

**T-026 · nativePass overlay builder (transit → natal)**  
`frontend` · App Engineer (Codex) · 4h · P1-WA/A2 · deps: T-020, T-013, T-008  
- **Deliverable:** nativePass(bundle, ctx, lexicon) → {id:'native', title, output} | null that reads today's transits landing on the natal pattern (lean first cut: moon-through-houses + vara-ruler-to-natal) from the transit fixture and composes from the transit lexicon; returns null when ctx.hasBirthData is false.
- **Acceptance:** With a birth+transit fixture, nativePass emits an overlay pass that references the transiting contact and carries keynote+invitation (no imperative); with no birth data it returns null so the assembler omits it.
- **Validation:** Unit test over a birth fixture (overlay present) and a no-birth fixture (null), plus a wrong-key mutation check.
- **Notes:** Aspect depth deliberately lean per spec §11 Q3; full aspect interpretation is a fast-follow, not slice 1. Consumes B6 transit schema.

**T-027 · Assembler + graceful closing invitation**  
`frontend` · App Engineer (Codex) · 4h · P1-WA/A1 · deps: T-022, T-023, T-024, T-025, T-026  
- **Deliverable:** The assembler in deterministic.ts that weaves the base movements (vara→tithi→nakshatra→conditions) plus the optional native overlay into DailyReading.assembled, and — when no overlay — appends the closing invitation 'add your birth moment to see how today meets your pattern'.
- **Acceptance:** assembled from a base-only fixture contains all four base movements in order and ends with the closing invitation, overlay absent; assembled from an overlay fixture contains the native overlay after the base and omits the closing invitation.
- **Validation:** Unit test asserts ordering, presence/absence of the closing invitation per branch, and that assembled is non-empty for both.
- **Notes:** Graceful degradation lives here — the base is always complete; the invitation is a graph-native affordance, never an error.

**T-028 · Pass-builder + assembler unit suite (contrasting fixtures)**  
`qa` · Validation Engineer (Gemini) · 4h · P1-WA/A2 · deps: T-022, T-023, T-024, T-025, T-026, T-027  
- **Deliverable:** A vitest suite exercising every pass-builder and the assembler over ≥2 contrasting frozen fixtures (Nanda vs Rikta, waxing vs waning, overlay vs none) with a stub lexicon.
- **Acceptance:** Suite is green and each builder's output is proven key-driven: a fixture-key mutation (e.g. swap the tithi key) turns the relevant test red — 'green ≠ done' is demonstrated by the failing mutation, not just the passing run.
- **Validation:** Run the suite green, then run one deliberate key-mutation to show a red; capture both.
- **Notes:** Stub lexicon keeps this independent of Wave B; the real-lexicon proof is T-043.

**T-029 · Rubric-derived lexicon authoring guide + per-limb templates**  
`product` · Rubric Steward (Claude) · 4h · P1-WB/B0 · deps: T-013  
- **Deliverable:** docs/daily-lexicon-authoring.md derived from the selemene-report skill: the exact field template per limb (matching the frozen lexicon schema), the invitation-not-imperative rule, and an explicit banned-construct list ('you will', 'you must', imperatives/commands) with allowed invitation forms ('you might notice…').
- **Acceptance:** The guide enumerates field sets per limb that match T-013's frozen schema exactly and lists concrete banned vs allowed constructs; a limb author can produce a single conformant entry from it without ambiguity, and every limb file (T-030..T-035) cites it.
- **Validation:** Peer review against the frozen schema + confirmation that each limb PR references the guide as its authority.
- **Notes:** selemene-report is an offline authoring guide, NOT a runtime dependency (spec §2.6). This standard is why tone cannot drift — imperative-avoidance lives in the data.

**T-030 · Author vara.ts (7 entries)**  
`data` · Lexicon Author (Codex) · 2h · P1-WB/B1 · deps: T-029, T-013, T-008  
- **Deliverable:** src/lib/daily/lexicon/vara.ts — 7 entries {ruler, keynote, field, invitation} keyed to the engine's exact vara spellings captured in the T-014 fixtures.
- **Acceptance:** All 7 varas present and keyed to the live enum spellings; each has a defined ruler/keynote/field/invitation, invitation phrased as an observation ('you might notice…'), and a full-file scan finds zero imperative constructs.
- **Validation:** Count + shape + voice assertion in T-037; sample read against a known vara.
- **Notes:** Keys bind to the probed enum spellings (T-014), not assumptions — the product-map 'verify against the live system' law.

**T-031 · Author tithi.ts (30 entries)**  
`data` · Lexicon Author (Codex) · 5h · P1-WB/B2 · deps: T-029, T-013, T-008  
- **Deliverable:** src/lib/daily/lexicon/tithi.ts — 30 entries {name, paksha, category, deity, motion, keynote, invitation} keyed to the engine's tithi spellings.
- **Acceptance:** All 30 tithis present with correct paksha + category (Nanda/Bhadra/Jaya/Rikta/Purna) and defined deity/motion/keynote/invitation; no undefined field, no imperative in a full-file scan.
- **Validation:** Count + category-coverage + voice assertion in T-037; spot-read a Nanda and a Rikta entry.
- **Notes:** Largest limb; paksha/category correctness is what tithiPass (T-023) relies on.

**T-032 · Author nakshatra.ts (27 entries)**  
`data` · Lexicon Author (Codex) · 5h · P1-WB/B3 · deps: T-029, T-013, T-008  
- **Deliverable:** src/lib/daily/lexicon/nakshatra.ts — 27 entries {ruler, deity, symbol, guna, keynote, invitation} keyed to the engine's nakshatra spellings.
- **Acceptance:** All 27 nakshatras present with defined ruler/deity/symbol/guna/keynote/invitation; keys match the probed spellings; no undefined field, no imperative in a full-file scan.
- **Validation:** Count + shape + voice assertion in T-037; spot-read two mansions.
- **Notes:** guna/ruler feed nakshatraPass (T-024).

**T-033 · Author yoga.ts (27 entries)**  
`data` · Lexicon Author (Codex) · 4h · P1-WB/B4 · deps: T-029, T-013, T-008  
- **Deliverable:** src/lib/daily/lexicon/yoga.ts — 27 entries {quality, keynote, invitation} keyed to the engine's yoga spellings.
- **Acceptance:** All 27 yogas present with defined quality/keynote/invitation; keys match the probed spellings; no undefined field, no imperative in a full-file scan.
- **Validation:** Count + shape + voice assertion in T-037.
- **Notes:** Half of conditionsPass (T-025).

**T-034 · Author karana.ts (11 entries)**  
`data` · Lexicon Author (Codex) · 2h · P1-WB/B5 · deps: T-029, T-013, T-008  
- **Deliverable:** src/lib/daily/lexicon/karana.ts — 11 entries {type, keynote, invitation} keyed to the engine's karana spellings (4 fixed + 7 movable).
- **Acceptance:** All 11 karanas present with defined type/keynote/invitation; keys match the probed spellings; no undefined field, no imperative in a full-file scan.
- **Validation:** Count + shape + voice assertion in T-037.
- **Notes:** Other half of conditionsPass (T-025).

**T-035 · Author transit.ts (aspect × planet-pair keynotes)**  
`data` · Lexicon Author (Codex) · 5h · P1-WB/B6 · deps: T-029, T-013, T-008  
- **Deliverable:** src/lib/daily/lexicon/transit.ts — keynotes for the aspect × planet-pair set the overlay reads (lean first cut: moon-through-houses + vara-ruler-to-natal), each {keynote, invitation}.
- **Acceptance:** Every aspect/planet-pair combination that nativePass (T-026) can read has a defined keynote+invitation; a lookup for any combination the overlay produces returns a defined entry; no imperative in a full-file scan.
- **Validation:** Coverage assertion (every combination nativePass emits is covered) + voice scan in T-037.
- **Notes:** Scope is the lean overlay per spec §11 Q3; full aspect matrix is a fast-follow. Coverage is defined by what nativePass actually reads, not the full theoretical matrix.

**T-036 · Lexicon barrel + typed exhaustive accessors**  
`data` · App Engineer (Codex) · 2h · P1-WB/B0 · 🔒 lock-zone · deps: T-030, T-031, T-032, T-033, T-034, T-035  
- **Deliverable:** src/lib/daily/lexicon/index.ts exporting typed lookups over the six limb tables as exhaustive keyed maps, so a missing/unknown key is a compile-time or explicit-throw error rather than an undefined read.
- **Acceptance:** Importing the barrel and looking up every enum key returns a defined entry; an unknown key is rejected (type error where the key type allows, explicit throw otherwise); no pass-builder reaches a table except through the barrel.
- **Validation:** tsc clean + a smoke test iterating all enum keys through the barrel; grep confirms pass-builders import only the barrel.
- **Notes:** Shared aggregation point for all six limb outputs — serialize edits. Turns 'missing keynote' from a silent undefined into a loud failure, prerequisite for T-037/G3.

**T-037 · Lexicon completeness + voice pre-check (authoring-time)**  
`qa` · Validation Engineer (Gemini) · 3h · P1-WB/B0 · deps: T-030, T-031, T-032, T-033, T-034, T-035, T-036  
- **Deliverable:** A node check that scans all six lexicon tables and asserts exact counts (7 vara · 30 tithi · 27 nakshatra · 27 yoga · 11 karana + full transit coverage), no undefined keynote/invitation, and zero imperative constructs across every entry.
- **Acceptance:** Check passes on the authored tables and fails loud when an entry is removed, a keynote blanked, or an imperative is introduced — demonstrated by running it green, then against a deliberately-broken copy to show a red.
- **Validation:** Run green on real tables + red on a mutated copy; capture both outputs.
- **Notes:** Authoring-time PRE-CHECK only; the shipped G3 (completeness) and G5 (voice/rubric) gates are authored in Phase 3 (T-070..T-089) and wired into scripts/verify/daily-gates.mjs there. This de-risks that gate early.

**T-038 · Engine request builder — 'today at L, no birth data'**  
`data` · Contract Engineer (Codex) · 4h · P1-WC/C2 · 🔒 lock-zone · deps: T-008, T-003, T-013  
- **Deliverable:** buildPanchangaRequest(date, location) and buildTransitsRequest(date, location, birth) appended to src/lib/daily/engine-contract.ts, pinned to the Phase 0-resolved request shape (current_time/date + location for the base; birth_data only on the transits overlay).
- **Acceptance:** The base panchanga request carries location + today-in-tz current_time and NO birth_data; the transits request carries birth_data only when birth is present; issuing the built base request (live smoke or replayed fixture) returns a panchanga payload that carries every field the interpreter reads.
- **Validation:** Unit test against the frozen request shape (T-015) + one live/replayed smoke call asserting the read fields are present.
- **Notes:** Append-only to the Phase 0 frozen engine-contract module (T-014) — must not change frozen types; serialize with any Phase 0 follow-up. Resolves the spec §6 'birth_data.date/time=now vs current_time' question by consuming T-015, never re-deciding it.

**T-039 · Location resolution module**  
`frontend` · App Engineer (Codex) · 4h · P1-WC/C1 · deps: T-011  
- **Deliverable:** src/lib/daily/location.ts — default precedence (birth normalized_location → last chosen location in localStorage → labeled canonical default), geocode reuse yielding {lat, long, timezone} via the existing WitnessForm path, opt-in navigator.geolocation, and today-in-tz date derivation.
- **Acceptance:** With birth data present it returns the normalized birth location; with none but a stored choice it returns that stored location; with neither it returns the clearly-labeled canonical default (never blank); timezone is always populated; localStorage is the only persistence and the URL is never read or written; geolocation fires only after explicit opt-in.
- **Validation:** Unit tests (T-040) cover all branches; manual check that a fresh profile renders against the labeled default.
- **Notes:** The only genuinely new UX input. Timezone is carried, not dropped — tithi/nakshatra boundaries shift by locale (spec §5). Consumes the frozen location contract T-016.

**T-040 · Location resolution tests (precedence + privacy)**  
`qa` · Validation Engineer (Gemini) · 3h · P1-WC/C1 · deps: T-039  
- **Deliverable:** A vitest suite for location.ts covering the three precedence branches, timezone carry, today-in-tz date, and the privacy invariants.
- **Acceptance:** Tests assert each precedence branch resolves correctly, timezone is always set, geolocation is invoked only on opt-in, and there is zero URL read/write (privacy rule) — the URL-write assertion fails if location is ever serialized to the URL.
- **Validation:** Run suite green; include a deliberate URL-write to confirm the privacy assertion catches it.
- **Notes:** Encodes the spec §5 'never the URL' privacy rule as an executable guard.

**T-041 · useDailyReading orchestration hook**  
`frontend` · App Engineer (Codex) · 4h · P1-WC/C3 · deps: T-021, T-027, T-038, T-039  
- **Deliverable:** src/hooks/useDailyReading.ts (sibling to useDeterministicRun/useReportGenerator): resolve location → fetch today's panchanga (+transits when birth present) via the request builders → interpret via getDailyReading → expose the DailyReading → archive to the Folio via saveReport({nodeId, nodeLabel, mode:'daily-panchanga', title, content: assembled}).
- **Acceptance:** Against a mocked selemeneApi + frozen fixture, the hook drives busy→complete, exposes a complete DailyReading, and calls saveReport exactly once with mode 'daily-panchanga' and the assembled content; an engine error surfaces an error state and does NOT archive.
- **Validation:** Hook test (T-042) with a mocked engine + saveReport spy; assert the success and error paths.
- **Notes:** Reuses the exact saveReport signature confirmed in src/lib/folioStore.ts. Modal/NodePage dispatch of {kind:'daily'} to this hook is Phase 2 (T-050..T-069) — not in scope here.

**T-042 · useDailyReading integration test (mocked engine)**  
`qa` · Validation Engineer (Gemini) · 3h · P1-WC/C3 · deps: T-041  
- **Deliverable:** A vitest suite for useDailyReading with a mocked selemeneApi returning frozen fixtures and a saveReport spy.
- **Acceptance:** Test asserts the Folio saveReport payload (nodeId, nodeLabel, mode 'daily-panchanga', title, assembled content), the no-birth branch (overlay absent + closing invitation) vs the birth branch (overlay present), and that an engine error yields an error state with no saveReport call.
- **Validation:** Run suite green; assert the spy call-count is 1 on success and 0 on error.
- **Notes:** Verifies the full fetch→interpret→archive orchestration in isolation ahead of the Phase 2 UI wiring.

**T-043 · EXIT PROOF — end-to-end interpret over real lexicon + frozen bundle**  
`qa` · Validation Engineer (Gemini) · 3h · P1-WC/C4 · deps: T-027, T-028, T-036, T-037  
- **Deliverable:** A snapshot suite that runs interpret(frozenBundle, ctx) with the real authored lexicon (via the barrel) over ≥2 fixtures (no-birth and birth).
- **Acceptance:** interpret() returns a complete DailyReading: all four base passes non-empty and key-accurate to the fixture's actual tithi/nakshatra/yoga/karana/vara, assembled non-empty; the no-birth fixture ends with the closing invitation and has no overlay (meta.hasOverlay=false); the birth fixture has the native overlay and meta.hasOverlay=true — a manual read confirms the named limbs match the fixture's real values.
- **Validation:** Snapshot equality over both fixtures + a human spot-check that the reading names the fixture's actual limbs (the Phase 1 exit contract: 'interpret() produces a complete reading from a fixture bundle').
- **Notes:** This is the Phase 1 exit-contract proof. It joins Wave A (interpreter/assembler), Wave B (real lexicon), and the barrel — the first point everything is wired against authored content.

**T-044 · Determinism / purity snapshot fixtures**  
`qa` · Validation Engineer (Gemini) · 2h · P1-WC/C4 · deps: T-043  
- **Deliverable:** A determinism harness + committed snapshot fixtures asserting interpret() byte-stability across a repeated run and a fresh process.
- **Acceptance:** interpret() over the same frozen fixture produces byte-identical output on a second call and in a separate process invocation; the only observed variance across fixtures is the input itself — proving purity.
- **Validation:** Run the snapshot twice (same process + fresh process) and diff to zero; commit the fixtures.
- **Notes:** Purity proof feeding Phase 3 G4 (determinism/snapshot, T-070..T-089); the shipped G4 gate in scripts/verify/daily-gates.mjs is authored there, reusing these fixtures.

**T-049 · Phase 1 consolidated exit gate**  
`qa` · Validation Engineer (Gemini) · 2h · P1-WC/C4-exit · deps: T-036, T-037, T-040, T-042, T-043, T-044  
- **Deliverable:** scripts/verify/daily-phase1.mjs + `npm run verify:daily-phase1` — one consolidated gate asserting the whole interpretation spine is green together.
- **Acceptance:** Passes only when ALL hold at once: interpret() over the frozen bundle yields a complete DailyReading (T-043), determinism holds (T-044), all six lexicons pass completeness+voice (T-037), the barrel resolves every enum (T-036), useDailyReading archives exactly once and not on error (T-042), and location resolution passes precedence+privacy (T-040); tsc green. Removing any one turns it red naming which.
- **Validation:** Run the gate (exit 0); disable one upstream invariant (blank a lexicon keynote / inject a URL-write in location) and confirm non-zero naming the failure.
- **Notes:** ADDED IN RECONCILIATION — the single Phase-1 exit gate that Phases 2/3/4 (12 tasks) gate on. Mirrors the Phase-0 exit gate (T-013): the exit contract is executable, green != done.


#### Phase 2 · Surface & integration

**T-050 · DailyReadingPanel scaffold (Modal-mounted, hook-driven)**  
`frontend` · UI Engineer (Codex) · 4h · W2A/S-2A1 · deps: T-049, T-013  
- **Deliverable:** New src/components/panels/DailyReadingPanel.tsx that mounts inside the existing Modal, invokes the Phase-1 useDailyReading hook with a resolved DailyReadingInput, and composes LocationDateHeader + DailyReadingBody + the state views into one reading surface.
- **Acceptance:** Opening the Today child causes useDailyReading to be invoked exactly once; on resolve the panel renders a non-empty assembled narrative from the returned DailyReading with meta.source visible, and contains no raw JSON.stringify/<pre> block anywhere.
- **Validation:** RTL render with a mocked useDailyReading returning a fixture DailyReading asserts header+body present and no JSON code block; manual open in the running app confirms prose renders.
- **Notes:** Depends on Phase-1 exit (T-020..T-049: useDailyReading + interpret) and Phase-0 exit (T-001..T-019: frozen DailyReading type + DailyReadingSource). Seam discipline: import the hook only, never a concrete DailyReadingSource implementation.

**T-051 · Location/date/timezone header**  
`frontend` · UI Engineer (Codex) · 3h · W2A/S-2A1 · deps: T-013, T-049  
- **Deliverable:** New src/components/panels/daily/LocationDateHeader.tsx rendering the resolved location display name, the date computed in the location's timezone, the timezone label, and which precedence source was used (birth / remembered / neutral default).
- **Acceptance:** Header shows the exact DailyLocation.display and the date computed in location.timezone (not the browser tz); when the neutral fallback is used it is explicitly labelled as a changeable default; timezone is always shown, never dropped.
- **Validation:** Unit test feeding the three location sources asserts the label text and a timezone-correct date (e.g. an Asia/Kolkata location near a UTC-midnight boundary renders the local date, not the UTC date).
- **Notes:** Consumes the frozen location contract (DailyLocation) from Phase-0 (T-001..T-019). Date is display-only; the +/-1-day stepper is out of scope per spec section 5.

**T-052 · Location change affordance (geocode + opt-in geolocation)**  
`frontend` · UI Engineer (Codex) · 5h · W2A/S-2A1 · deps: T-049, T-013  
- **Deliverable:** New src/components/panels/daily/LocationPicker.tsx — a change affordance reusing the WitnessForm geocode path (place -> {lat,long,timezone}) plus an opt-in 'use my location' (navigator.geolocation), persisting the chosen location through the Phase-1 location.ts (localStorage).
- **Acceptance:** Entering a place resolves to {lat,long,timezone} and hands it back to the panel to re-run; the choice persists to localStorage and becomes the remembered default on next open; geolocation prompts the browser only after the button is pressed; no latitude/longitude ever appears in the URL/hash.
- **Validation:** Manual: pick a new city -> reading changes and header updates; reload -> remembered location used; inspect the hash to confirm no coordinates; the geolocation permission dialog fires only on click.
- **Notes:** Reuses geocode from src/components/forms/WitnessForm.tsx (~line 142). Privacy rule: coordinates live in localStorage, never the URL. Resolution logic itself is Phase-1 location.ts (T-020..T-049); this is the UI over it.

**T-053 · Layered reading body (base movements + optional overlay)**  
`frontend` · UI Engineer (Codex) · 4h · W2A/S-2A1 · deps: T-013  
- **Deliverable:** New src/components/panels/daily/DailyReadingBody.tsx rendering the layered reading: the four base passes (vara/tithi/nakshatra/conditions) always, the native overlay pass only when meta.hasOverlay, and the woven assembled narrative — styled consistently with the existing report render.
- **Acceptance:** For a base-only fixture the four base movements render as titled prose and no overlay section appears; for an overlay fixture the native section renders after the base; pass output renders as prose (not a JSON block) and the assembled text is shown as the headline narrative.
- **Validation:** Snapshot/RTL over a base-only and an overlay fixture asserts the overlay section toggles with meta.hasOverlay and that pass titles map 1:1 to the interpreter's pass model (varaPass/tithiPass/nakshatraPass/conditionsPass/nativePass).
- **Notes:** Renders the frozen DailyReading {passes,assembled,meta} shape from Phase-0 (T-001..T-019). Pass model per spec section 4.

**T-054 · Graceful-degradation affordance (no birth data -> invitation CTA)**  
`frontend` · UI Engineer (Codex) · 4h · W2B/S-2B1 · deps: T-050, T-053  
- **Deliverable:** The no-birth-data affordance in the panel: a complete base reading plus a graph-native 'add your birth moment to see how today meets your pattern' CTA that opens BirthDataForm; on submit, useDailyReading re-runs with birth present so the native overlay appends. With birth data present, the overlay renders and the CTA is absent.
- **Acceptance:** Opening Today with no birth data shows a complete base reading plus the closing invitation CTA (not an error or empty state); pressing it and entering birth data re-renders with the native overlay present; when birth data is already known the CTA never appears and the overlay is shown.
- **Validation:** Manual walk of both paths in the running app; RTL asserts the CTA is visible iff meta.hasOverlay===false and that submitting birth triggers a re-run with birth in the DailyReadingInput.
- **Notes:** Honors 'never offer a surface we can't feed' — the base is always gatherable. Reuses src/components/forms/BirthDataForm.tsx. interpret() supplies the closing-invitation text (Phase 1); this task owns the interactive CTA and overlay gating.

**T-055 · Panel loading / error / empty states**  
`frontend` · UI Engineer (Codex) · 2h · W2B/S-2B1 · deps: T-050  
- **Deliverable:** Loading, error, and degraded views for the daily panel: a non-blocking 'contacting the sky' loading affordance, an engine-error surface with a retry that re-invokes the hook, and a visible diagnostic if a resolved reading is unexpectedly empty.
- **Acceptance:** While useDailyReading is pending a non-blocking loading affordance shows; on hook error the message surfaces with a working retry; a resolved-but-empty reading cannot be reached silently — it renders a visible diagnostic rather than a blank body.
- **Validation:** RTL with the hook mocked in pending/error/success states asserts each view; manual error path by pointing the proxy base at an unreachable host.
- **Notes:** Mirrors the busy/error handling in src/components/panels/DeterministicResult.tsx.

**T-056 · Add 'panchanga-flow' "Today" child to Sky Weather**  
`data` · Data/Config Engineer (Codex) · 2h · W2B/S-2B2 · 🔒 lock-zone · deps: T-013  
- **Deliverable:** Add child { id:'panchanga-flow', label:'Today', run:{ kind:'daily', needsLocation:true } } to the transit ('Sky Weather') node in src/data/selemeneNodes.ts, leaving the existing panchanga and transits raw-engine leaves intact.
- **Acceptance:** getNodeById('transit').children includes exactly one {kind:'daily'} child labelled 'Today'; the existing panchanga and transits engine children remain byte-unchanged; the new orbital appears on the Sky Weather node page; the Phase-3 taxonomy parser can read the new child.
- **Validation:** Unit assertion over SELEMENE_NODES that transit has exactly one {kind:'daily'} child labelled Today and that the two raw engine leaves persist; visual confirmation of the new orbital in the running app.
- **Notes:** LOCK ZONE: src/data/selemeneNodes.ts is shared with scripts/verify/taxonomy.mjs (Phase 3) and other phases — serialize. Depends on the frozen ChildRun {kind:'daily'} variant from Phase-0 (T-001..T-019, added to src/types/index.ts as a contract-changing task there).

**T-057 · NodePage/Modal dispatch for {kind:'daily'}**  
`frontend` · UI Engineer (Codex) · 5h · W2B/S-2B3 · 🔒 lock-zone · deps: T-050, T-013  
- **Deliverable:** Extend the dispatch in src/pages/NodePage.tsx: add a 'daily' ModalView, route openChild when run.kind==='daily' to it, and mount DailyReadingPanel in a Modal — bypassing the birth/witness forms since location (not birth) is the entry input. One task owns all NodePage edits for this feature.
- **Acceptance:** Clicking the Today orbital opens a Modal rendering DailyReadingPanel (never the BirthDataForm or WitnessForm); closeModal resets selectedChild/view; every other child (witness/engine/workflow) opens exactly the modal it did before (no regression).
- **Validation:** Manual click-through of Today plus one witness and one engine child confirming the correct modal for each; RTL over openChild mapping run.kind -> ModalView including the new 'daily' branch.
- **Notes:** LOCK ZONE: src/pages/NodePage.tsx is the central shared dispatch — serialize; this single task owns all NodePage edits for the daily feature to avoid intra-file conflict. Needs frozen {kind:'daily'} from Phase-0 (T-001..T-019).

**T-058 · Folio round-trip for the daily reading**  
`frontend` · UI Engineer (Codex) · 3h · W2C/S-2C1 · 🔒 lock-zone · deps: T-057, T-056, T-049  
- **Deliverable:** Ensure the DailyReading archived by useDailyReading (via saveReport) surfaces in the Folio Archive with a distinguishable title/mode ('daily-panchanga') and re-opens rendering the assembled narrative; adjust FolioPanel rendering if it assumes raw-JSON content.
- **Acceptance:** After generating a Today reading it appears under Folio Archive -> Saved Reports titled with location/date and mode 'daily-panchanga'; re-opening it shows the assembled prose (not a JSON block); the entry survives a page reload (localStorage-backed).
- **Validation:** Manual generate -> open Folio -> reopen; assert the stored record's mode==='daily-panchanga' and its content is the assembled narrative, not JSON.stringify output.
- **Notes:** LOCK ZONE: src/components/panels/FolioPanel.tsx is a shared panel. The saveReport invocation lives in the Phase-1 hook (T-020..T-049); this task owns the Folio surface side (listing + reopen rendering).

**T-059 · Location change -> re-run -> persist round-trip**  
`frontend` · UI Engineer (Codex) · 3h · W2C/S-2C2 · deps: T-057, T-052, T-056  
- **Deliverable:** Wire LocationPicker into the mounted DailyReadingPanel so a location change re-invokes useDailyReading for the new place/timezone, updates the header, and persists the choice via location.ts.
- **Acceptance:** Changing location in an open Today panel produces a re-run whose reading can differ (tithi/nakshatra by locale/timezone) and updates the header's location + date; the new location is remembered on next open; the date recomputes in the new timezone.
- **Validation:** Manual: switch from a western to an eastern-timezone city near a tithi boundary and observe the reading and date change; reload confirms persistence of the chosen location.
- **Notes:** Exercises timezone-carrying (spec section 5) — tz is not dropped across the re-run.

**T-060 · Behavioral live smoke — Sky Weather ▸ Today**  
`qa` · Validation Engineer (Gemini) · 3h · W2D/S-2D1 · deps: T-057, T-056, T-058, T-054  
- **Deliverable:** An end-to-end behavioral check on the running app: open Sky Weather -> Today, confirm the reading names today's ACTUAL live tithi/nakshatra (not a fallback), the overlay toggles correctly with/without birth data, and the reading archives to the Folio.
- **Acceptance:** The rendered reading's tithi/nakshatra match the live panchanga engine's response for today at the resolved location (cross-checked against a direct engine call), meta.source is shown, base-only vs overlay behaves per birth data, and the reading is found in the Folio afterward.
- **Validation:** Call the panchanga engine directly for today+location and diff the tithi/nakshatra names against what the panel renders; walk the with/without-birth paths. Prefigures the formal Phase-3 G7 gate but is the Phase-2 integration smoke, not the gate itself.
- **Notes:** The runnable G7 gate (daily-gates.mjs) is authored in Phase 3 (T-070..T-089). This is a surface-integration smoke to catch fallback/no-op before Phase 3 hardening.

**T-061 · Responsive bottom-sheet + a11y for the daily panel**  
`frontend` · UI Engineer (Codex) · 3h · W2C/S-2C2 · deps: T-057, T-050  
- **Deliverable:** Make DailyReadingPanel correct as a mobile bottom-sheet and desktop panel — scrollable body, reachable actions, accessible header/landmarks, focus management, and keyboard/a11y on the location picker and birth CTA.
- **Acceptance:** On a 375px viewport the panel is a bottom-sheet with the reading fully scrollable and both the location-change and birth CTA reachable without page overflow; the header has an accessible name; keyboard reaches the picker and CTA; focus returns to the invoking orbital on close.
- **Validation:** Manual mobile + desktop pass; an axe/lighthouse a11y check on the open panel reports no critical violations.
- **Notes:** Reuses the Modal bottom-sheet shell (src/components/Modal.tsx); panel-internal edits only.

**T-062 · Phase 2 exit-criteria sign-off**  
`qa` · Validation Engineer (Gemini) · 2h · W2E/S-2E1 · deps: T-060, T-059, T-061  
- **Deliverable:** A consolidated Phase-2 acceptance pass verifying every exit criterion (Today child present, {kind:'daily'} dispatch routes, panel renders the layered reading, degradation affordance, location UX + persistence, Folio round-trip) against the running app, with recorded per-criterion evidence.
- **Acceptance:** Each Phase-2 exit criterion has a recorded observed-behavior evidence line (never 'code written'); any gap is filed against its owning T-05x task before Phase 3 (T-070..) begins.
- **Validation:** Checklist executed against the running app with per-item behavioral evidence, handed to Phase 3 as the verification baseline. Green != done — evidence is behavioral.
- **Notes:** Feeds the Phase-3 gate suite (T-070..T-089) and ISA ISC updates. No shared-file edits.


#### Phase 3 · Verification & hardening

**T-070 · Stand up the vitest unit-test harness for the daily interpreter**  
`infra` · Validation (Gemini) · 4h · P3-A/S3A-harness · 🔒 lock-zone · deps: T-049  
- **Deliverable:** vitest added as a devDependency + vitest.config.ts (Vite-native, node environment, no jsdom), package.json scripts `test` and `test:daily`, and a smoke spec that imports interpret() from src/lib/daily/deterministic.ts and runs it over a Phase-0 fixture.
- **Acceptance:** `npm run test:daily` executes a TS spec that imports and calls interpret() on a frozen fixture bundle and asserts a non-empty assembled string; deliberately flipping that assertion to expect the wrong value makes the run exit 1 — proving the runner actually evaluates assertions rather than only discovering files.
- **Validation:** Run `npm run test:daily` (exit 0 on the smoke spec); invert one assertion and confirm exit 1 and a failing-test line in the output.
- **Notes:** Unblocks every Wave-B unit gate (G3/G4/G6/G8) that must import the TS interpreter and lexicon — node .mjs cannot import .ts directly, and vitest handles TS+ESM natively over the existing Vite stack. Edits package.json (shared across phases → lock_zone). Depends on Phase 1 exit (T-020..T-049): interpret() + lexicon must exist to import.

**T-071 · Build the frozen snapshot corpus covering the G4 variance axes**  
`qa` · Validation (Gemini) · 3h · P3-A/S3A-harness · deps: T-013, T-049, T-070  
- **Deliverable:** src/lib/daily/__fixtures__/ holding at least four literal engine bundles — Nanda vs Rikta tithi, shukla (waxing) vs krishna (waning) paksha, overlay (birth present) vs base-only — derived deterministically from the Phase-0 live-captured fixture, plus a manifest mapping each bundle to the axis it exercises.
- **Acceptance:** At least four distinct frozen JSON bundles exist, each tagged to a named axis; interpret() run over each produces a complete reading; a corpus-coverage assertion fails if any of the four G4 axes has no representative bundle, and the fixtures are literal JSON (no live fetch at test time, confirmed by git diff).
- **Validation:** `npm run test:daily -- corpus-coverage` lists the four axes and goes red when a bundle is removed; grep the fixtures dir to confirm no network calls are embedded.
- **Notes:** G4 cannot prove purity without deliberately varied frozen inputs. Base fixture is sourced from the Phase-0 capture (T-001..T-019 exit: fixtures captured). Feeds G4 (T-074), G5 (T-075), G6 (T-076).

**T-072 · Author the data-driven predictive/imperative rule-set for G5**  
`qa` · Validation (Gemini) · 2h · P3-A/S3A-harness · deps: T-049  
- **Deliverable:** scripts/verify/rubric-rules.mjs exporting the banned-construct patterns (predictive futures like 'you will', prescriptions like 'must'/'should'/'need to', bare second-person imperatives, fortune-telling) with the sanctioned-invitation exceptions ('you might notice…'), consumable by both node and vitest, plus a labeled self-test fixture.
- **Acceptance:** The rule-set flags every sentence in a ~20-line curated known-bad set and passes every known-good invitation line; deliberately mislabeling one fixture line makes the rule-set's own self-test fail, proving the classifier is exercised.
- **Validation:** `node scripts/verify/rubric-rules.selftest.mjs` classifies all labeled samples correctly (exit 0); swap one label → exit 1.
- **Notes:** Authored FROM the selemene-report guide offline (design decision 6 — the skill is an authoring guide, not a runtime dep). Keeping the banned list as importable data means G5 (T-075) cannot drift from the rubric. Depends on Phase 1 lexicon/rubric authoring (T-020..T-049).

**T-073 · G3 — lexicon completeness gate (full enum coverage)**  
`qa` · Validation (Gemini) · 3h · P3-B/S3B-pure-gates · deps: T-070, T-013, T-049  
- **Deliverable:** src/lib/daily/__tests__/lexicon-completeness.test.ts asserting the authored tables cover the entire enum universe declared by the frozen engine-contract.
- **Acceptance:** Test asserts exactly 30 tithi, 27 nakshatra, 27 yoga, 11 karana and 7 vara entries, each with a non-empty keynote and invitation and no undefined field; deleting or nulling any single entry turns the gate red and names the missing key. Coverage is checked against the engine-contract enum list, not a hardcoded copy, so an added enum value also fails until authored.
- **Validation:** `npm run test:daily -- lexicon-completeness` exits 0; remove one nakshatra entry → exit 1 citing the offending key.
- **Notes:** Enum universe is frozen in Phase 0 (T-001..T-019 engine-contract); lexicon tables land in Phase 1 (T-020..T-049). Enforces 'the reading must be complete for every possible day.'

**T-074 · G4 — determinism / snapshot gate over the frozen corpus**  
`qa` · Validation (Gemini) · 4h · P3-B/S3B-pure-gates · deps: T-070, T-071  
- **Deliverable:** src/lib/daily/__tests__/determinism.test.ts with committed snapshots for each corpus bundle.
- **Acceptance:** interpret(frozenBundle) is byte-identical across two calls in one process and across a re-invocation; the four corpus bundles yield four DISTINCT committed snapshots (proving the input, not the code, is the only variance); editing a single lexicon keynote updates exactly the one snapshot region that cites it — not the whole corpus — proving the keynote→output mapping.
- **Validation:** `npm run test:daily -- determinism` green on two consecutive runs; after a one-keynote edit, `--update` shows a single-region diff, not global churn.
- **Notes:** Pairs with the purity audit (T-078): snapshots stay stable only if interpret() has no clock/random leakage. Corpus from T-071.

**T-075 · G5 — voice / rubric gate (no imperatives or predictions)**  
`qa` · Validation (Gemini) · 3h · P3-B/S3B-pure-gates · deps: T-070, T-072, T-071  
- **Deliverable:** src/lib/daily/__tests__/voice-rubric.test.ts running the T-072 rule-set over every pass output and the assembled string produced from each corpus bundle.
- **Acceptance:** Zero rule-set matches across all corpus-produced readings, explicitly including the base-only closing invitation; injecting an imperative ('you must …') into any lexicon entry or assembler template makes the gate red and names the offending pass id.
- **Validation:** `npm run test:daily -- voice-rubric` exits 0; inject one imperative into a lexicon entry → exit 1 naming the pass.
- **Notes:** Mechanically enforces selemene-core's non-prescriptive law at the OUTPUT level, not just at authoring time. Depends on the rule-set (T-072) and corpus (T-071).

**T-076 · G6 — graceful-degradation gate (interpreter half)**  
`qa` · Validation (Gemini) · 3h · P3-B/S3B-pure-gates · deps: T-070, T-071  
- **Deliverable:** src/lib/daily/__tests__/degradation.test.ts asserting the layered-reading contract structurally.
- **Acceptance:** interpret() on a base-only bundle (no birth) yields the four base passes (vara/tithi/nakshatra/conditions), NO nativePass, and an assembled string that ends with the 'add your birth moment…' invitation; interpret() on an overlay bundle yields nativePass present and no closing invitation. Assertions key on pass ids and meta.hasOverlay, not substring alone, so a reworded invitation still passes and a dropped base pass fails.
- **Validation:** `npm run test:daily -- degradation` exits 0 with both branches asserted; delete the closing invitation from the base path → exit 1.
- **Notes:** Honors 'never offer a surface we can't feed.' The in-app degradation UX is built in Phase 2 (T-050..T-069); this gate proves the interpreter's contract. The live/DOM half is covered by G7 (T-082).

**T-077 · G8 — seam-swap conformance gate**  
`qa` · Validation (Gemini) · 3h · P3-B/S3B-pure-gates · deps: T-070, T-013, T-071  
- **Deliverable:** src/lib/daily/__tests__/seam-swap.test.ts with a fixture-backed fake WitnessModeSource returning the Phase-0-frozen witness response shape.
- **Acceptance:** The DeterministicInterpreter and the fake WitnessModeSource both satisfy DailyReadingSource; run against one DailyReadingInput they return DailyReading objects with an identical key set and an identical pass id/title set, differing only in meta.source ('deterministic' vs 'witness'); a shape divergence in the fake turns the gate red. The test is authored so Phase 4 (T-090..T-099) can swap the real ③ in and re-run unchanged.
- **Validation:** `npm run test:daily -- seam-swap` exits 0; mutate the fake's returned shape → exit 1.
- **Notes:** Proves the ①→③ flip is shape-safe BEFORE the engine route exists — the real ③ is dormant until Phase 4. DailyReadingSource is frozen in Phase 0 (T-001..T-019).

**T-078 · Harden interpret() — purity audit (no clock/random leakage)**  
`qa` · Validation (Gemini) · 2h · P3-B/S3B-pure-gates · deps: T-070, T-049  
- **Deliverable:** src/lib/daily/__tests__/purity.test.ts combining a static source scan of src/lib/daily/deterministic.ts + pass-builders with a runtime double-call equality check.
- **Acceptance:** interpret() and all pass-builders contain no Date.now/new Date()/Math.random/now-based Intl calls — clock and timezone must arrive via ctx; calling interpret() twice on the same frozen bundle returns deep-equal output; introducing a `new Date()` into a pass-builder turns the audit red.
- **Validation:** `npm run test:daily -- purity` exits 0; add a nondeterministic call to a pass-builder → exit 1 naming the file.
- **Notes:** The mode-gates.mjs lesson (assembled witness text embeds time-varying seeds, defeating a text-hash gate) must not recur in the daily interpreter, or G4 snapshots would flake. Guards the determinism contract at the source.

**T-079 · Harden interpret() — schema-drift / negative-path robustness**  
`qa` · Validation (Gemini) · 3h · P3-B/S3B-pure-gates · deps: T-070, T-071, T-073  
- **Deliverable:** src/lib/daily/__tests__/drift.test.ts with malformed fixtures — a missing tithi key, a renamed nakshatra key, and an out-of-range enum value.
- **Acceptance:** A missing or renamed contract key makes interpret() throw a typed, named error rather than emitting a reading with an undefined keynote; an unknown enum value follows the documented fallback with no `undefined` or `[object Object]` reaching the output. This is the exact failure mode the live G2 (T-081) and G3 (T-073) are built to catch, proven here at the interpreter boundary.
- **Validation:** `npm run test:daily -- drift` exits 0 (each malformed input produces its expected typed failure/fallback); remove the guard → exit 1.
- **Notes:** Makes 'schema drift fails loud' concrete at the boundary and complements the live G2. Depends on G3 (T-073) for the enum universe.

**T-080 · G1 — extend taxonomy.mjs to resolve {kind:'daily'}**  
`qa` · Validation (Gemini) · 3h · P3-C/S3C-live · 🔒 lock-zone · deps: T-062  
- **Deliverable:** Extended scripts/verify/taxonomy.mjs: the childRe (currently matching only workflow|engine|witness) parses {kind:'daily'} children, and the check asserts the panchanga-flow daily child resolves to the DailyReadingSource seam whose underlying panchanga + transits engines each return 200 with non-empty result fields against the live proxy.
- **Acceptance:** `node scripts/verify/taxonomy.mjs <base>` lists the panchanga-flow child as PASS with detail like 'seam → panchanga+transits live'; all pre-existing children still PASS (no regression in the count line); temporarily repointing the daily child at a dead engine turns that row red.
- **Validation:** Run against the local proxy and prod; capture the PASS row and the unchanged total; force a dead engine to observe the red row.
- **Notes:** lock_zone — taxonomy.mjs is shared with Phase 4 and other verify work, so this serializes. Depends on Phase 2 (T-050..T-069) adding {kind:'daily'} to src/data/selemeneNodes.ts and the panchanga-flow child. 'No dangling capability.'

**T-081 · G2 — live schema-contract check in daily-gates.mjs**  
`qa` · Validation (Gemini) · 4h · P3-C/S3C-live · deps: T-013, T-062  
- **Deliverable:** scripts/verify/daily-gates.mjs G2 stage — POST today's live panchanga (and transits) for a fixture location and assert every key interpret() reads (per the frozen engine-contract: tithi, nakshatra, yoga, karana, vara, paksha, transition times) is present and non-null.
- **Acceptance:** `node scripts/verify/daily-gates.mjs <base>` prints a G2 PASS line naming the fields verified against the live proxy; a fixture-injected key rename makes G2 FAIL loud, citing the missing key and pointing to SCHEMA-1 in docs/selemene-engine-requests.md.
- **Validation:** Run live (G2 PASS); force a renamed-key fixture and observe a loud FAIL naming the key.
- **Notes:** Our own anti-'silent 200' — schema drift must fail, not silently degrade. Engine-contract keys are frozen in Phase 0 (T-001..T-019); the ledger SCHEMA-1 baseline is seeded there too.

**T-082 · G7 — behavioral gate against the running app**  
`qa` · Validation (Gemini) · 5h · P3-C/S3C-live · deps: T-062, T-081  
- **Deliverable:** A Playwright-driven behavioral check (playwright is already in devDeps) that boots the app, opens Sky Weather ▸ 'Today', and reads the rendered reading plus the Folio Archive.
- **Acceptance:** The rendered daily reading names the SAME tithi/nakshatra that a direct live panchanga call returns for today at the resolved location (not a hardcoded fallback), AND after generation a new row appears in the Folio Archive; stubbing an empty engine response makes the check red.
- **Validation:** `node scripts/verify/daily-gates.mjs --behavioral <url>` (or a playwright spec) drives the running app and diffs the rendered tithi against an independent live panchanga response; capture the transcript + a screenshot.
- **Notes:** THE real bar — verify the running service, not a mock (green ≠ done). Depends on the Phase-2 surface + Folio archiving (T-050..T-069) and reuses the live-call helper from G2 (T-081).

**T-083 · Assemble daily-gates.mjs runner + verify scripts**  
`infra` · Validation (Gemini) · 3h · P3-C/S3C-live · 🔒 lock-zone · deps: T-070, T-081, T-082  
- **Deliverable:** Finished scripts/verify/daily-gates.mjs that runs the live gates (G2/G5-over-live/G6/G7) as one node entrypoint and shells the vitest unit gates (G3/G4/G8/purity/drift), plus package.json scripts: verify:daily (live), test:daily (units), and verify:all (taxonomy + modes + daily).
- **Acceptance:** `npm run verify:all` runs every Phase-3 gate and exits non-zero if any single gate fails; `npm run verify:daily` prints a per-gate PASS/FAIL table; breaking exactly one gate (e.g. removing a lexicon entry) makes verify:all exit 1 and the table shows which gate caught it.
- **Validation:** Run verify:all green on a healthy tree; introduce one break per gate and confirm each is caught with a distinct FAIL line.
- **Notes:** lock_zone — edits package.json (shared across phases). Central aggregation point named as a deliverable in the design spec §9. Depends on the vitest harness (T-070) and the live gates (T-081, T-082).

**T-084 · Record G1..G8 as behavioral ISCs in ISA.md**  
`product` · Planner (Claude) · 2h · P3-C/S3C-docs · 🔒 lock-zone · deps: T-073, T-075, T-077, T-080, T-082  
- **Deliverable:** New ISC entries in ISA.md — one per gate G1..G8 — plus a Verification/Decisions note referencing docs/selemene-engine-requests.md as the ①→③ unlock ledger.
- **Acceptance:** ISA.md carries one checkable, behaviorally-phrased ISC per gate (e.g. 'ISC-x: the running app names the live tithi and archives it — G7'), each naming the runnable command that proves it; none reads 'code written'; the engine-request ledger is referenced from the Verification section.
- **Validation:** ISA CheckCompleteness (or manual review) confirms every gate has an ISC with an attached command and behavioral phrasing.
- **Notes:** lock_zone — ISA.md is shared across all phases. Owned by the planner (docs/orchestration). Depends on the gate set being concretely defined (representative gate tasks across the waves).

**T-085 · Update verification-command docs (README + product map)**  
`product` · Planner (Claude) · 2h · P3-C/S3C-docs · deps: T-083  
- **Deliverable:** Updated README + docs/integrated-product-map.md 'Verification commands' section listing the daily gates (verify:daily, verify:all, test:daily) alongside taxonomy/modes, with a one-line statement of what each proves.
- **Acceptance:** The product-map command table lists the daily gates with a 'verified' outcome column matching real output; a reader can copy-paste each documented command and it runs and produces the stated result.
- **Validation:** Copy each documented command and run it; confirm the output matches the doc's claim (the map's law: every claim has a check next to it).
- **Notes:** Distinct doc files from T-084's ISA.md, so no lock contention within the docs swarm. Depends on the verify scripts existing (T-083).

**T-086 · Consolidated evidence run — Phase 3 exit gate**  
`qa` · Validation (Gemini) · 3h · P3-C/S3C-live · deps: T-073, T-074, T-075, T-076, T-077, T-080, T-081, T-082, T-083, T-084, T-085  
- **Deliverable:** A captured evidence artifact — the verify:all transcript plus the running-app capture (screenshot/log) naming today's actual tithi + the Folio row — proving all eight gates hold together.
- **Acceptance:** All 8 gates run green in one session against the live proxy + running app; the evidence shows the ACTUAL current tithi/nakshatra (cross-checked against an independent live panchanga call, not a fixture), a Folio archive entry, AND a mutation log demonstrating each gate was shown red at least once — so a green run is meaningful, not vacuous.
- **Validation:** Single `npm run verify:all` transcript + behavioral capture reviewed and cross-checked against a direct live panchanga response; the attached red-state log lists one caught break per gate.
- **Notes:** Phase 3 exit contract — every gate runnable and behavior-proving, 'green' demonstrably meaning the running app names the real day and archives it. Gates Phase 4 (T-090..T-099) readiness work. Depends on every other Phase-3 task.


#### Phase 4 · Engine route readiness ③

**T-090 · Implement WitnessModeSource adapter (src/lib/daily/witness.ts), dormant**  
`backend` · Cloud/backend (Copilot) · 4h · W4A/S4A-1 · deps: T-013, T-049  
- **Deliverable:** src/lib/daily/witness.ts — a WitnessModeSource class implementing the frozen DailyReadingSource interface. getDailyReading() calls generateAsset({mode:'daily-panchanga', ...}) via lib/selemeneApi and maps the AssetGenerateResponse {passes,assembled,engines_used} onto a DailyReading, stamping meta.source='witness' and meta.hasOverlay from birth presence. No engine backend change; adapter is not wired into the default factory path.
- **Acceptance:** With generateAsset stubbed to return a multi-pass AssetGenerateResponse, WitnessModeSource.getDailyReading(input) returns a DailyReading whose passes/assembled/engines_used are populated from the response, meta.source==='witness', and meta.hasOverlay reflects input.birth — structurally the same DailyReading shape DeterministicInterpreter returns for the same input. Under default config the adapter is never constructed/invoked.
- **Validation:** Node check with generateAsset mocked asserts the mapped DailyReading fields + meta.source; `tsc` confirms the class satisfies DailyReadingSource (assignable to the seam type); grep confirms no default-path import wires it in.
- **Notes:** Depends on Phase 0 exit (T-019: frozen DailyReadingSource + DailyReading + AssetGenerateResponse reuse + engine-contract) and Phase 1 exit (T-049: interpret()'s DailyReading output shape the adapter must mirror to be a drop-in). Reuses the existing render pipe per spec §2.4.

**T-091 · Wire DAILY_SOURCE flag into the source factory to select ①/③**  
`backend` · Cloud/backend (Copilot) · 2h · W4A/S4A-1 · 🔒 lock-zone · deps: T-049, T-090, T-021  
- **Deliverable:** Extend the source factory in src/lib/daily/source.ts so DAILY_SOURCE='witness' returns WitnessModeSource and 'deterministic' (default) returns DeterministicInterpreter, selected at one call site with no other code change.
- **Acceptance:** With the flag unset or 'deterministic' the factory returns the DeterministicInterpreter (readings carry meta.source 'deterministic'); setting DAILY_SOURCE='witness' returns WitnessModeSource (readings carry meta.source 'witness') — same call site consumed by the Phase 2 useDailyReading hook, no UX/dispatch change. Toggling the flag in a harness observably changes which concrete source is returned.
- **Validation:** Node check toggles DAILY_SOURCE and asserts the returned source identity + resulting meta.source both directions; `tsc` green; confirm the Phase 2 default-path selection is unchanged (still deterministic).
- **Notes:** lock_zone: src/lib/daily/source.ts is the shared seam file authored in Phase 1 Wave A — serialize edits. This is the config-flip-not-rewrite lever of spec §3.

**T-092 · Build the witness request mapping so ③ narrates 'today' (REQ-5 alignment)**  
`backend` · Cloud/backend (Copilot) · 3h · W4A/S4A-1 · deps: T-013, T-090  
- **Deliverable:** Request builder inside witness.ts mapping DailyReadingInput → AssetGenerateRequest: mode 'daily-panchanga', location + date carried, the current_time/date field the engine reads set from input.date so it narrates today, and a birth subject appended only when input.birth is present (driving hasOverlay).
- **Acceptance:** For input with date D1 the built request carries D1 in the current-date field; two inputs with different dates produce requests differing only in that field; input without birth builds a base-only request (no subject) and input with birth appends exactly the subject — mirroring the deterministic base/overlay layering. Field names match the Phase 0 engine-contract.
- **Validation:** Node check inspects the built AssetGenerateRequest object (without calling the live engine) for date propagation and the conditional subject; cross-checks key names against src/lib/daily/engine-contract.ts (Phase 0). This is the in-repo mirror of ledger REQ-5, proven later live by T-094.
- **Notes:** Depends on Phase 0 exit (T-019: resolved 'today at location L, no birth data' request shape + engine-contract + location contract).

**T-093 · Finalize docs/selemene-engine-requests.md (REQ-1..5 + SCHEMA-1)**  
`product` · Cloud/backend (Copilot) · 3h · W4A/S4A-2 · 🔒 lock-zone · deps: T-013  
- **Deliverable:** Fully populate the Phase-0-seeded docs/selemene-engine-requests.md per spec §8: the daily-panchanga capability with REQ-1..REQ-5 and the schema-stability SCHEMA-1, each entry carrying what / why-urania-needs-it / a concrete accept command / status marker / owner.
- **Acceptance:** The doc contains all six entries; each REQ's accept line is a concrete runnable command or assertion targeting the live engine (not prose); REQ-2/REQ-3 accept lines correspond 1:1 to mode-gates.mjs gate-1 (unknown→400 UNKNOWN_MODE) and gate-2 (distinct pass plans); REQ-4 maps pass titles to the interpreter's pass model; REQ-5 asserts different-date→different-tithi; all statuses are ⬜ queued (no engine work claimed done in-repo).
- **Validation:** Reviewer + a lint pass asserting every REQ block has an `accept:` line and a ⬜/🔄/✅ status marker; wording of REQ-2/REQ-3 cross-referenced against scripts/verify/mode-gates.mjs so the ledger's acceptance is already grounded in existing runnable gates.
- **Notes:** lock_zone: docs/selemene-engine-requests.md is seeded in Phase 0 and also edited by T-095 — serialize. The ledger is a first-class deliverable (spec §2.3, §8); the consumer→producer contract the user drives on the Selemene repo.

**T-094 · Make ledger accept commands runnable (scripts/verify/engine-requests.mjs)**  
`qa` · Validation (Gemini) · 4h · W4B/S4B-1 · deps: T-086, T-093  
- **Deliverable:** scripts/verify/engine-requests.mjs + a verify:engine-requests npm script that executes the REQ-1..5 + SCHEMA-1 accept checks against a target engine base URL, printing per-REQ PASS/FAIL and returning a non-zero exit when the capability is absent.
- **Acceptance:** Run against the CURRENT live engine (which does not yet serve daily-panchanga) the harness reports REQ-1 FAIL (falls back to the undifferentiated default pass plan), REQ-3/REQ-5 detail accordingly, and exits non-zero — correctly reporting the capability as not-yet-landed rather than a false green. It would go green only once the engine serves a distinct daily-panchanga pass plan and date-varying tithi.
- **Validation:** Execute `node scripts/verify/engine-requests.mjs <live-base>`; observe REQ-1..5 FAIL + non-zero exit today; confirm it reuses the mode-gates pass-plan comparison (by pass id/title, NOT assembled text, which embeds time-seeds) so it cannot false-PASS.
- **Notes:** Depends on Phase 3 exit (T-089: mode-gates/daily-gates patterns to extend). Realizes the spec §8 claim that the ledger's acceptance tests are already runnable. New script — no shared lock zone.

**T-095 · Document the ①→③ flip procedure (runbook)**  
`product` · Cloud/backend (Copilot) · 2h · W4B/S4B-3 · 🔒 lock-zone · deps: T-091, T-093  
- **Deliverable:** A 'Flip procedure' section in docs/selemene-engine-requests.md giving the exact ①→③ steps: confirm all REQ ✅ live (run engine-requests.mjs), set DAILY_SOURCE='witness' in src/lib/daily/source.ts, run daily-seam-swap.mjs, run the G7 behavioral check from daily-gates.mjs, confirm no UX change.
- **Acceptance:** The runbook names the precise flag value + file, lists the exact verify commands in order with each pass condition, and states the flip is gated on the acceptance harness going green LIVE (not on a claim); a reader can execute the flip end-to-end without consulting other docs and without any in-repo engine change.
- **Validation:** Dry-run walkthrough — every referenced command exists and is runnable, the flag name matches source.ts, and no step requires a Selemene backend change in this repo; reviewer sign-off.
- **Notes:** lock_zone: edits docs/selemene-engine-requests.md (shared with T-093, prior wave). References engine-requests.mjs (T-094) and daily-seam-swap.mjs (T-096) by command; does not depend on their completion to be authored.

**T-096 · Seam-swap test — ① and ③ produce identical DailyReading shape (G8)**  
`qa` · Validation (Gemini) · 3h · W4B/S4B-2 · deps: T-049, T-086, T-090, T-091  
- **Deliverable:** scripts/verify/daily-seam-swap.mjs + a verify:seam-swap npm script that feeds one DailyReadingInput (from the Phase 0 fixture bundle) through DeterministicInterpreter and through WitnessModeSource (against a recorded daily-panchanga response fixture) and asserts both yield a schema-valid DailyReading with identical top-level shape, differing only in meta.source.
- **Acceptance:** The check passes today with ① real and ③ against the recorded fixture, proving both satisfy DailyReadingSource and the ①→③ flip is shape-safe; deliberately dropping any DailyReading field (passes/assembled/engines_used/meta) from either source makes the check FAIL loudly. This is gate G8 made runnable.
- **Validation:** Run `node scripts/verify/daily-seam-swap.mjs`; observe both sources validated and the shape-diff limited to meta.source; break a field in a scratch copy to confirm the failure path fires.
- **Notes:** Depends on Phase 3 exit (T-089: the G8 gate scaffold / daily-gates harness) and Phase 1 exit (T-049: interpret() as the ① reference). Uses the Phase 0 frozen fixture bundle.

**T-097 · Dormancy guard — ③ never activates under the default flag**  
`qa` · Validation (Gemini) · 2h · W4B/S4B-2 · deps: T-062, T-091  
- **Deliverable:** A runnable assertion (within daily-seam-swap.mjs or a sibling check) that under default config the daily surface takes zero witness/assets-generate path.
- **Acceptance:** With DAILY_SOURCE at default, exercising the source factory + the Phase 2 useDailyReading path performs zero generateAsset (/assets/generate) calls (witness adapter uninvoked) and yields meta.source 'deterministic'; only flipping the flag activates ③ (>0 calls). Guards against premature ③ activation before the ledger is ✅.
- **Validation:** Node check spies on generateAsset; asserts call-count 0 under default and >0 only after flipping the flag; `tsc` green.
- **Notes:** Depends on Phase 2 exit (T-069: useDailyReading hook consuming the config-selected source). Enforces spec §2.2/§3: default 'deterministic' until the ledger's requests are all ✅.

**T-098 · Record the ③ engine-route-readiness ISC(s) in ISA.md**  
`product` · Planner/orchestrator (Claude) · 2h · W4C/S4C-1 · 🔒 lock-zone · deps: T-093, T-095, T-096  
- **Deliverable:** ISA.md — new stable-ID ISC(s) for the ③ route: the dormant WitnessModeSource, the DAILY_SOURCE flip gated on the ledger, and the seam-swap verification; link docs/selemene-engine-requests.md; verification criteria name the concrete commands.
- **Acceptance:** ISA carries a stable-ID ISC for the ③ route whose verification column names runnable commands (engine-requests.mjs, daily-seam-swap.mjs) and states the flip is gated on all REQ ✅ live; the ledger is linked; no ISC claims Selemene engine work is done in this repo (it is marked out-of-repo/handoff).
- **Validation:** ISA reconcile / CheckCompleteness passes; reviewer confirms ISC IDs are stable and the verification commands are runnable; cross-links resolve.
- **Notes:** lock_zone: ISA.md is a shared file touched across phases — serialize. Uses the ISA skill's reconcile keyed on stable ISC IDs.

**T-099 · Phase 4 exit reconciliation + Selemene-repo handoff summary**  
`qa` · Planner/orchestrator (Claude) · 3h · W4C/S4C-1 · 🔒 lock-zone · deps: T-090, T-091, T-092, T-093, T-094, T-095, T-096, T-097, T-098  
- **Deliverable:** Run the full Phase 4 check suite (witness adapter tsc, verify:seam-swap, dormancy guard, verify:engine-requests against live) and produce the Selemene-repo handoff summary enumerating REQ-1..5 + SCHEMA-1 with their runnable accept commands and the flip trigger — recorded in the ISA verification/changelog section.
- **Acceptance:** A single reconciliation run shows: the dormant adapter typechecks and satisfies DailyReadingSource (seam-swap green), the default remains deterministic (dormancy green), the engine-requests harness runs and reports the daily-panchanga capability as NOT-yet-landed against the live engine, and the flip runbook + ledger are complete — establishing the Phase 4 exit: '③ is drop-in ready and dormant; engine execution is handed off, not done here.' The handoff summary lists every REQ with its accept command.
- **Validation:** Execute all Phase 4 verify scripts in sequence and capture output; confirm the handoff summary enumerates REQ-1..5 + SCHEMA-1 with runnable accept commands; grep confirms no Selemene backend code lives in this repo (engine work is out-of-repo).
- **Notes:** lock_zone: writes the ISA verification/changelog record (ISA.md), serialized after T-098 in the same Claude swarm. Closes the phase; the actual REQ execution happens on the Selemene repo, tracked here not performed.

