# Task Graph — Urania 137 Production-Readiness → Release

> Ships the corpus admin browser (T-079) through the governed immutable release path.
> Scope confirmed 2026-08-13: full path (H-1, H-2, R-1→R-16).

## Wave 0 — Hygiene (parallel — te-swarm-s)

| ID | Task | Acceptance Criteria | Combo | Status |
|---|---|---|---|---|
| H-1 | Commit + push pending corpus work (9ad4f0b, 799534c + 384-dim/docs/ingestion scripts) | `main == origin/main`; CI green for that SHA | te-swarm-s | done (4bad753 — CI green 2026-08-13) |
| H-2 | Correct 723→53 doc truth + regen DEPENDENCY-GRAPH (D-004 actually done) | docs say "53 readings (51 Solo + 2 Synastry)"; graph includes AdminDataBrowserPage + readings-ecosystem | te-swarm-s | done (cab60b1) |
| R-7 | Bind preview D1 `urania-137-db-preview` + non-prod secrets | isolation verifier passes (preview ≠ prod ID) | te-swarm-s | done — Pages preview `DB` → `6b90d773…`; live `--api` PASS; preview fail-closed (no engine secrets) |

## Wave 1 — Release-path build (parallel — te-dispatch-paid)

| ID | Task | Acceptance Criteria | Combo | Status |
|---|---|---|---|---|
| R-1 | `scripts/d1/backup.mjs` + restore-drill + isolation verifier | `node --test scripts/d1/*.test.mjs` green | te-dispatch-paid | done — 8 tests green; frozen `--production --targets --output` path + `validateBackupReceipt` shape |
| R-2 | `scripts/ops/validate-targets.mjs` + `cutover.mjs` | dry-run exit 0; `--confirm` required for prod mutation | te-dispatch-paid | done — 11 tests green; top-level targets shape; deploy receipts emit `sourceSha`/`deploymentId` |
| R-3 | `scripts/verify/split-host-gates.mjs` + `scripts/ops/alert-probe.mjs` | read-only smoke + alert delivery probes run | te-dispatch-paid | done — 6 tests green; `--deny-mutations` read-only; alert-probe fails closed pending auth layer |
| R-4 | `scripts/data/mark-subjects-for-review.mjs` | idempotent; `--apply` guarded | te-dispatch-paid | done — 5 tests green; content-hash match; migrations 0010+0011 applied (chain 11/11) |
| R-5 | `release-preflight.mjs` asserts new ops scripts exist | fails-closed on any missing ops script | te-dispatch-paid | done — `missingReleasePathScripts` in `release.mjs`; 21 vitest green |
| R-6 | Readiness workflow emitting the **5** artifacts release.yml downloads | workflow yields production-targets/backup-receipt/preview-proofs/location-remediation-manifest/governance-snapshot | te-dispatch-paid | done — `readiness.yml` + `scripts/verify/readiness.mjs` + 6 tests green |

## Wave 2 — Live proofs + gates (parallel — te-dispatch-paid)

| ID | Task | Acceptance Criteria | Combo | Status |
|---|---|---|---|---|
| R-8 | Live proof FV-188 (admin session) only | live JSON evidence | te-dispatch-paid | pending (human-gated fresh login) |
| R-9 | Close ISA gates ISC-143/144/145/146 | statuses transition with evidence | te-dispatch-paid | blocked (needs admin query surface + Access-write cred + fresh login) |

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

- Wave 0: done
- Wave 1: **done** (R-1→R-6)
- Wave 2: **blocked** (FV-189 deferred; FV-188 + R-9 need human-gated inputs)
- Wave 3: pending
- Wave 4: pending
- Wave 5: pending

## Notes

- Corpus = 53 readings (51 Solo + 2 Synastry). `/723/` is the archive directory name, not a count.
- Six release scripts are missing from `release.yml`'s execution path; they are the Wave 1 core.
- Release dispatch (R-13) requires human approval per approval policy v1 (`merge`/`deploy`/`credential_change`).
- Decision B (2026-08-14): Pages **preview** env stays **fail-closed** — no `SELEMENE_API_KEY` / `CHAT_PROXY_TOKEN`, so preview cannot call the Selemene engine. Accepted posture; revisit only if preview must exercise live engine calls.
- **R-6 correction (2026-08-14):** `release.yml` downloads **five** readiness files, not four — `backup-receipt.json`, `preview-proofs.json`, `production-targets.json`, `location-remediation-manifest.json`, `governance-snapshot.json`. The earlier "4 artifacts" wording in tasks.json/DEEP-PASS.md omitted the remediation manifest. `readiness.yml` emits all five.
- **FV-189 deferred + deleted (2026-08-14):** two-account synastry live proof removed from scope. A second real Access identity (and its participant-owned subject) is required; the system refuses to fabricate consent or substitute admin authority for it. ISA `ISC-189` remains open as a deferred (not falsified) gate; `.planning/tasks.md` R-8 now covers FV-188 only.
- **Local-only drift (2026-08-14):** `scripts/readings/engine-output-atlas.test.mjs` fails 2 tests when sibling repos (`/723`, `Selemene-engine`) exist locally with drift (Selemene `SUPPORTED_ENGINE_IDS` grew 18→19, workflow description changed). Both auto-skip in CI (clean checkout has no sibling dirs), so the canonical gate stays green. Out of Wave-1 scope.
