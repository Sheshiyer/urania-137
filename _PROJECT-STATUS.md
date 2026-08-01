# Urania 137 — Project Status

**Updated:** 2026-08-01

## Launch Decision

**NO-GO for broad production launch.** The deployed v0.6 pilot remains available behind Cloudflare Access, but Urania is not `operationally_ready`.

## State Vocabulary

- `implemented`: code exists on a branch or commit.
- `verified`: required automated/manual evidence passes for that exact commit.
- `deployed`: that exact commit/artifact is live on the named target.
- `operationally_ready`: backup/restore, monitoring, rollback, privacy, security, governance, and post-deploy gates pass for the deployed commit.

These states are cumulative only with evidence; none is inferred from another.

## Current State

| Area | State | Evidence / gap |
|---|---|---|
| Authenticated pilot | deployed | Pages production deployment `1e269b23-8ef8-4a45-90fb-50074355ab5`, source `4bc3632` |
| v0.6.0 tag | deployed metadata | Tag resolves to `a988fcd`; it is not the latest deployed source SHA |
| Production-readiness design/plan | implemented | Commit `8fae4b23473ada926a266bb36848e4eca29641dc` |
| Landing prototype | implemented, unverified | Recovery checkpoint `5972ac6a2382180875817ebeb3240a6f9804ed49`; route test fails and architecture is rejected |
| Calculation correctness | blocked | Manual `(0,0,Asia/Kolkata)` and longitude timezone approximation remain |
| Relationship product journey | blocked | Secure generation API has no production UI caller |
| Release/CI/governance | blocked | Fail-closed immutable workflow and branch rules not yet implemented |
| D1 recovery/isolation | blocked | Preview binding/schema and restore drill not proven |
| Security/privacy/observability | blocked | Request limits, CSRF, export/delete, alert delivery, and production attestations incomplete |
| Broad launch | not operationally ready | Launch-critical ISA criteria remain pending/deferred |

## Active Work

- Branch: `codex/urania-production-readiness`
- Plan: `docs/plans/2026-08-01-urania-production-readiness.md`
- Design: `docs/plans/2026-08-01-urania-production-readiness-design.md`
- Baseline: `docs/operations/production-baseline.md`
- Rollback matrix: `docs/operations/rollback-matrix.md`

## Next Gate

Complete Batch 1: restore the protected-app baseline, implement fail-closed release preparation/workflow, and establish the canonical required CI gate. Production state must not change during this batch.
