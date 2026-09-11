# Project State — Urania 137

## Project Reference

See: `goal.md` (end goal) and `.planning/PROJECT.md` (what this is).

**Core value:** A person enters through conversation, receives a reading without losing the thread, reopens the same material as a legible folio that names exactly which systems and sources support it, and understands where computation ends and witness interpretation begins.

Current focus: Close remaining M1 paper/ISA residues after live admin E2E on v0.6.3; then M2–M7 backlog.

## Current Position

Phase: M1 — Production readiness → release (wave 5 of 5 — verify + learn)
Plan: `.planning/phases/05-verify-learn/05-01-PLAN.md`
Status: **Release shipped. Admin E2E proven live on production.** Planning spine refreshed 2026-09-11 to match tag `v0.6.3` / SHA `93f69e975eb12d5f941af4cfc57ae96b45298237`.
Last activity: 2026-09-11 — Access OTP → platform-admin; `#/admin-data` 53/53 + R2 body + Vectorize; WitnessRun non-degraded; `reading_interpretations` 0→2; attestation verified. Receipt: `docs/operations/2026-09-11-admin-e2e.md`.

## Accumulated Context

### Decisions

Logged in `.planning/PROJECT.md` Key Decisions; ISA.md Decisions per iteration.

- M1 (release path) is the top milestone; M2–M7 are backlog, ordered backward from the end state.
- Corpus = 53 readings (51 Solo + 2 Synastry); `/723/` is a directory name, not a count.
- Pages preview env stays fail-closed (no engine secrets) — accepted posture.
- FV-189 (two-account synastry) deferred; R-8 covers FV-188 only. ISC-189 stays open-deferred.
- **2026-09-11:** Wave 2 was never the release blocker. `release.yml` already cut v0.6.3. Remaining work was prove admin can see/run the live stack, then tell planning files the truth.
- **2026-09-11:** Runtime `platform-admin` elevation is `CF_PLATFORM_ADMIN_EMAILS` (proven). Access group `selemene-admin` is not the live authority path (`functions/lib/authorization.ts`).

### Closed this session (live)

- R-8 / ISC-188 — fresh Access login → `platform-admin` + `admin:analytics`.
- R-10–R-13 — governed release path + attestation for v0.6.3 (already shipped earlier 2026-09-11).
- R-14 — corpus browser live behind Access: 53/53, R2 body, Vectorize hits, Folio 25.
- WitnessRun production path — non-degraded narrator via `selemene-llm-proxy`; D1 `reading_interpretations` incremented.
- Production `SELEMENE_API_KEY` valid through `/api/selemene/*` (health + engines 200).

### Still open

- R-9 residues: ISC-143 (deletion audit), ISC-145/146 (Access-group durability / write credential). ISC-144 corpus query surface is now live-proven.
- Engine REQ-1/REQ-3 (`daily-panchanga`) — Selemene repo.
- M2–M7 backlog (landing polish, relationship UI, canonical 723 import, Vectorize write loop, AgentScope, fast-follows).
- Governance: no branch protection on `main`; production Environment required reviewers = 0.

## Session Continuity

Last session: 2026-09-11 (admin E2E on production v0.6.3)
Stopped at: planning spine + ISA/_PROJECT-STATUS refreshed after live proofs.
Resume file: `docs/operations/2026-09-11-admin-e2e.md`
Next: M2 landing polish/funnel copy, or R-9 residues (ISC-143/145/146).

### M2 landing (local → deploy, 2026-09-11)

In-repo Motionsites craft rewrite of `src/landing/*` (static, no hydrate). Ledger: `docs/ui/2026-09-11-m2-landing-design-ledger.md`. Evidence: `docs/ui/evidence/2026-09-11-m2-landing/`.

