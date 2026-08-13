# Task Graph — Urania 137 Production-Readiness → Release

> Ships the corpus admin browser (T-079) through the governed immutable release path.
> Scope confirmed 2026-08-13: full path (H-1, H-2, R-1→R-16).

## Wave 0 — Hygiene (parallel — te-swarm-s)

| ID | Task | Acceptance Criteria | Combo | Status |
|---|---|---|---|---|
| H-1 | Commit + push pending corpus work (9ad4f0b, 799534c + 384-dim/docs/ingestion scripts) | `main == origin/main`; CI green for that SHA | te-swarm-s | pending |
| H-2 | Correct 723→53 doc truth + regen DEPENDENCY-GRAPH (D-004 actually done) | docs say "53 readings (51 Solo + 2 Synastry)"; graph includes AdminDataBrowserPage + readings-ecosystem | te-swarm-s | pending |
| R-7 | Bind preview D1 `urania-137-db-preview` + non-prod secrets | isolation verifier passes (preview ≠ prod ID) | te-swarm-s | pending |

## Wave 1 — Release-path build (parallel — te-dispatch-paid)

| ID | Task | Acceptance Criteria | Combo | Status |
|---|---|---|---|---|
| R-1 | `scripts/d1/backup.mjs` + restore-drill + isolation verifier | `node --test scripts/d1/*.test.mjs` green | te-dispatch-paid | pending |
| R-2 | `scripts/ops/validate-targets.mjs` + `cutover.mjs` | dry-run exit 0; `--confirm` required for prod mutation | te-dispatch-paid | pending |
| R-3 | `scripts/verify/split-host-gates.mjs` + `scripts/ops/alert-probe.mjs` | read-only smoke + alert delivery probes run | te-dispatch-paid | pending |
| R-4 | `scripts/data/mark-subjects-for-review.mjs` | idempotent; `--apply` guarded | te-dispatch-paid | pending |
| R-5 | `release-preflight.mjs` asserts new ops scripts exist | fails-closed on any missing ops script | te-dispatch-paid | pending |
| R-6 | Readiness workflow emitting the 4 artifacts release.yml downloads | workflow yields production-targets/backup-receipt/preview-proofs/governance-snapshot | te-dispatch-paid | pending |

## Wave 2 — Live proofs + gates (parallel — te-dispatch-paid)

| ID | Task | Acceptance Criteria | Combo | Status |
|---|---|---|---|---|
| R-8 | Live proofs FV-188 (admin session) + FV-189 (two-account synastry) | both produce live JSON evidence | te-dispatch-paid | pending |
| R-9 | Close ISA gates ISC-143/144/145/146 | statuses transition with evidence | te-dispatch-paid | pending |

## Wave 3 — Verify + prepare (sequential — te-validate / te-plan)

| ID | Task | Acceptance Criteria | Combo | Status |
|---|---|---|---|---|
| R-10 | `npm run verify:ci` on merged release-candidate SHA | canonical CI green from clean clone | te-validate | pending |
| R-11 | `release.mjs --prepare minor --dry-run` → commit metadata | version bump deterministic, no tag/deploy | te-plan | pending |
| R-12 | `release.mjs --dry-run` preflight | passes all fail-closed guards | te-validate | pending |

## Wave 4 — Release (human approval-gated)

| ID | Task | Acceptance Criteria | Combo | Status |
|---|---|---|---|---|
| R-13 | Dispatch `release.yml` (production Environment approval) | attestation subject SHA == deployed SHA | te-dispatch-paid (approval-gated) | pending |

## Wave 5 — Verify + learn

| ID | Task | Acceptance Criteria | Combo | Status |
|---|---|---|---|---|
| R-14 | Verify corpus browser live behind Access | live curl returns owner-scoped 53/53 | te-validate | pending |
| R-15 | Mark ISA + `_PROJECT-STATUS` operationally_ready | register updated with attestation receipt | te-validate | pending |
| R-16 | Learn: Changelog/Decisions via ISA skill + doc-sync | canonical C/R/L entries | te-reason | pending |

## Status

- Wave 0: pending
- Wave 1: pending
- Wave 2: pending
- Wave 3: pending
- Wave 4: pending
- Wave 5: pending

## Notes

- Corpus = 53 readings (51 Solo + 2 Synastry). `/723/` is the archive directory name, not a count.
- Six release scripts are missing from `release.yml`'s execution path; they are the Wave 1 core.
- Release dispatch (R-13) requires human approval per approval policy v1 (`merge`/`deploy`/`credential_change`).
