# Project State — Urania 137

## Project Reference

See: `goal.md` (end goal) and `.planning/PROJECT.md` (what this is).

**Core value:** A person enters through conversation, receives a reading without losing the thread, reopens the same material as a legible folio that names exactly which systems and sources support it, and understands where computation ends and witness interpretation begins.

Current focus: Production readiness → release (milestone M1).

## Current Position

Phase: M1 — Production readiness → release (wave 2 of 5)
Plan: `.planning/phases/02-live-proofs-gates/02-01-PLAN.md`
Status: Blocked — wave 2 needs human-gated inputs (fresh admin login for FV-188; permissioned admin query surface + Access-write credential for R-9)
Last activity: 2026-08-14 — wave 1 (R-1→R-6) shipped; FV-189 deferred; wave 2 blocked on human-gated inputs.

## Accumulated Context

### Decisions

Logged in `.planning/PROJECT.md` Key Decisions; ISA.md Decisions per iteration.

- M1 (release path) is the top milestone; M2–M7 are backlog, ordered backward from the end state.
- Corpus = 53 readings (51 Solo + 2 Synastry); `/723/` is a directory name, not a count.
- Pages preview env stays fail-closed (no engine secrets) — accepted posture.
- FV-189 (two-account synastry) deferred; R-8 covers FV-188 only. ISC-189 stays open-deferred.

### Pending (M1 wave 2, human-gated)

- FV-188 fresh admin login → live `platform-admin` evidence (R-8).
- R-9 blocked: needs permissioned admin query surface (ISC-144), `selemene-admin` durable mapping + Access-write credential (ISC-145/146).

### Blockers / Concerns

- Release dispatch (R-13) requires production Environment approval (human).
- Engine-side REQ-1/REQ-3 (`daily-panchanga` distinct mode) are Selemene-repo, ledgered only.

## Session Continuity

Last session: 2026-08-14 (wave 1 R-1→R-6 done; FV-189 deferred)
Stopped at: wave 2 blocked on human-gated inputs.
Resume file: `.planning/phases/02-live-proofs-gates/02-01-PLAN.md`
Next command after unblock: `temperance-next-wave` (observes this spine) → execute wave-2 via `te-dispatch-paid`.
