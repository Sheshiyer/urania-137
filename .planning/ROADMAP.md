# Roadmap — Urania 137 (M1→M7)

North star: `goal.md`. This roadmap orders the milestones **backwards from the end state**; M1 is the next step and the only milestone with active executable tasks (the live `.planning/tasks.md` waves).

## Overview

The end state is a graph-first console where chat thresholds a reading and the Folio/library renders it as a source-honest, provenance-complete document — consent-complete relationships, a canonical consented corpus, subordinate synthesis memory, and one governed release path. M1 ships the release path so every subsequent milestone lands through the same immutable gate.

## Milestones

> Milestone status lives in the Progress table below (not checkboxes — the executable queue is `.planning/tasks.md` + `.planning/NEXT-WAVE.json`, observed by `temperance-next-wave`).

- **M1 — Production readiness → release** (ACTIVE): ship the corpus admin browser through the governed immutable release path; reach `operationally_ready`.
- **M2 — Public landing (split-host)**: correct two-artifact build (unauthenticated landing + protected app), replacing the rejected prototype.
- **M3 — Relationship journey UI**: consent-complete synastry/dyad/family with a production UI caller.
- **M4 — 723 → canonical archive**: catalogue → consent gate → provenance-preserving import; pilot importer exists.
- **M5 — Vectorize continuous-learning loop**: extract → approve → anonymized pattern → retrieval with visible provenance + deletion-propagation proof.
- **M6 — AgentScope context orchestration**: post-result Dyad interpretation, AgentScope behind the executor port only.
- **M7 — Boundary fast-follows**: `birth_profiles`, calculation correctness, engine `daily-panchanga` mode, Mirror/Sankalpa doors.

## Milestone details

### M1 — Production readiness → release
**Goal:** Ship the corpus admin browser (T-079) through the governed immutable release path; the deployed commit is `operationally_ready` with attestation `subject SHA == deployed SHA`.
**Depends on:** nothing (in-flight).
**Requirements:** REQ-M1-01..10.
**Canonical refs:** `.planning/DEEP-PASS.md`, `docs/corpus-browser-2026-08-12-plan.md`, `docs/plans/2026-08-01-urania-production-readiness.md`.
**Success criteria (must be TRUE):**
1. Corpus routes owner-scoped 53/53 live behind Access.
2. Six release scripts exist and are preflight-asserted; readiness workflow emits all 5 artifacts.
3. `npm run verify:ci` green from clean clone on the release-candidate SHA.
4. `release.yml` dispatched with production Environment approval; attestation matches deployed SHA.
5. ISA + `_PROJECT-STATUS` record `operationally_ready` with an attestation receipt.
**Plans:** waves 2–5 of `.planning/tasks.md` (R-8 → R-16).

### M2 — Public landing (split-host)
**Goal:** An unauthenticated visitor reaches a discoverable landing; the protected app is a separate artifact with no prototype remnants.
**Depends on:** M1 (release path exists to deploy it).
**Requirements:** REQ-M2-01..02.

### M3 — Relationship journey UI
**Goal:** The secure generation API has a production UI caller; consent-complete relationship lifecycle proven live.
**Depends on:** M1; subject-profile seam (shipped).
**Requirements:** REQ-M3-01..02.

### M4 — 723 → canonical archive
**Goal:** The historical archive becomes a canonical, consented, provenance-preserving corpus.
**Depends on:** M1 (admin query surface + release path).
**Requirements:** REQ-M4-01..03.

### M5 — Vectorize continuous-learning loop
**Goal:** Anonymized approved patterns reach retrieval with visible provenance and are subordinate to deterministic facts.
**Depends on:** M4.
**Requirements:** REQ-M5-01..03.

### M6 — AgentScope context orchestration
**Goal:** Post-result Dyad interpretation with replayable provenance; AgentScope is a replaceable executor adapter only.
**Depends on:** M5 (synthesis context exists).
**Requirements:** REQ-M6-01.

### M7 — Boundary fast-follows
**Goal:** Close the tracked fast-follows and sibling doors.
**Depends on:** M1 (and sibling-repo work for engine items).
**Requirements:** REQ-M7-01..04.

## Progress

| Milestone | State | Evidence |
|---|---|---|
| M1 | waves 0–1 done; wave 2 blocked (human-gated FV-188 + admin surface) | `.planning/NEXT-WAVE.json` |
| M2 | prototype checkpointed, architecture rejected | `_PROJECT-STATUS.md` |
| M3 | API + migrations done; no production UI caller | `_PROJECT-STATUS.md` |
| M4 | catalogue + 53-reading admin browser done; canonical import pending | `docs/living-readings-ecosystem.md` |
| M5 | future-state, explicitly unevidenced | `docs/living-readings-ecosystem.md` |
| M6 | decided, unimplemented | `docs/plans/2026-07-28-agentscope-*` |
| M7 | tracked/ledgered, not started | `ISA.md` ISC-31, `docs/selemene-engine-requests.md` |
