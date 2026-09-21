# Project State — Urania 137

## Project Reference

See: `goal.md` (end goal) and `.planning/PROJECT.md` (what this is).

**Core value:** A person enters through conversation, receives a reading without losing the thread, reopens the same material as a legible folio that names exactly which systems and sources support it, and understands where computation ends and witness interpretation begins.

Current focus: v0.7.1 deployed with instrument-shell redesign + Jev integration. Next: R-9 residues, M2 landing polish, deferred UX wiring.

## Current Position

Phase: Post-M1 — Production v0.7.1 deployed + verified
Plan: `.planning/phases/05-verify-learn/05-01-PLAN.md`
Status: **v0.7.1 released and verified on production.** Instrument-shell redesign (7 phases) and TypeSafe Jev integration (phases A-E) deployed. 978 tests pass across 118 files. Bundle 574,865 B (budget 575,000).
Last activity: 2026-09-21 — Readiness run `35547295339` → release run `35547386273`. Attestation verified (`ok: true`, `issues: []`). Post-deploy: landing bundle `index-BjFRmXZG.js` confirmed, CF Access gate active, probes ok.

## Accumulated Context

### Decisions

Logged in `.planning/PROJECT.md` Key Decisions; ISA.md Decisions per iteration.

- M1 (release path) is the top milestone; M2–M7 are backlog, ordered backward from the end state.
- Corpus = 53 readings (51 Solo + 2 Synastry); `/723/` is a directory name, not a count.
- Pages preview env stays fail-closed (no engine secrets) — accepted posture.
- FV-189 (two-account synastry) deferred; R-8 covers FV-188 only. ISC-189 stays open-deferred.
- **2026-09-11:** Runtime `platform-admin` elevation is `CF_PLATFORM_ADMIN_EMAILS` (proven). Access group `selemene-admin` is not the live authority path.
- **2026-09-19:** Instrument-shell redesign merged — 7 phases (foundation → capsule masthead → URL-is-state → folio gallery → threshold in-shell → settings sections → evidence re-baseline). Dead code removed (`PageTabs`, `HomeJourneyRail`). Starfield scroll owner fixed to `[data-route-field]`. Design ledger: `docs/ui/2026-09-19-instrument-shell-redesign-ledger.md`.
- **2026-09-21:** v0.7.1 deployed to production. Supersedes v0.6.3. Bundle budget held (574,865 < 575,000). ReadingActionBar deduplication deferred — inline version stays because shared `ACTION_BTN` constant makes it smaller than the separate component import.

### Deployed in v0.7.1

- Instrument-shell redesign: capsule masthead, command palette, URL-driven routing, folio gallery + filters, threshold in-shell, settings sections, view transitions, 3-radius/7-step type scale.
- TypeSafe Jev integration: phases A-E (client, validation endpoint, quality assessment, interpretation routing, transit significance scoring). 33 Jev-specific tests.
- Residual cleanup: dead code removal (`PageTabs.tsx`, `HomeJourneyRail.tsx`), Starfield scroll owner bug fix, `FolioFilters.test.ts` added, `ui-home-contracts.test.mjs` PageTabs reference removed.

### Still open

- R-9 residues: ISC-143 (deletion audit), ISC-145/146 (Access-group durability / write credential). ISC-144 corpus query surface is now live-proven.
- Engine REQ-1/REQ-3 (`daily-panchanga`) — Selemene repo.
- M2–M7 backlog (landing polish, relationship UI, canonical 723 import, Vectorize write loop, AgentScope, fast-follows).
- Governance: no branch protection on `main`; production Environment required reviewers = 0.
- Wire `FolioSkeleton` into `AsyncBoundary` loading state for Folio page.
- `AsyncBoundary` sweep: `NativeRunDialog`, `EngineStatusPanel`, `PatternSection`, `ChatSheet` boot state.

## Session Continuity

Last session: 2026-09-21 (deploy v0.7.1 + post-deploy verification)
Stopped at: project status + planning state updated after verified deploy.
Resume file: `_PROJECT-STATUS.md`
Next: R-9 residues (ISC-143/145/146), M2 landing polish/funnel copy, FolioSkeleton wiring, AsyncBoundary sweep.

### M2 landing (local → deploy, 2026-09-11)

In-repo Motionsites craft rewrite of `src/landing/*` (static, no hydrate). Ledger: `docs/ui/2026-09-11-m2-landing-design-ledger.md`. Evidence: `docs/ui/evidence/2026-09-11-m2-landing/`.
