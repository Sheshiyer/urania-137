# Deep Pass — Urania 137 Production-Readiness → Release

> Phase 3 of the corpus-browser effort. Corpus browser (T-079) is **built, data-ingested,
> verified locally — but NOT deployed.** This deep pass plans the production-readiness →
> release path that ships it.
>
> Last verified state: commit `799534c` (2 ahead of `origin/main` `b6b0cd1`), live prod source
> `c34a70f` (not an ancestor of HEAD).

## Objective

Ship the corpus admin browser (T-079) — and the production-readiness surface it rides on — to
Cloudflare Pages through the governed immutable release path, with the Selemene engine remaining
on Railway as the upstream report source.

Topology (confirmed by owner 2026-08-13):

- **Engine (upstream):** Selemene `noesis-api` on Railway, public base `selemene.tryambakam.space`,
  authenticated via `x-api-key`. Source of witness/reading reports.
- **Backend (this repo's edge):** Cloudflare Thoughtseed Labs account (team `red-queen-4dfa`) —
  Pages (`urania-137` protected app + `urania-137-landing`), Functions, D1, R2, Vectorize, Workers AI,
  Access (AUD `df8a00b1…b6b4`).

## Corpus truth (723 → 53 resolved)

- `/723/` was the **local archive directory name**, not a reading count. Owner: "it was just the
  name of the folder called 723 and we dont have so much data or readings yet."
- Actual corpus ingested: **53 readings = 51 Solo + 2 Synastry**, verified across all three layers:
  - D1 `catalogue_readings`: 53 rows (`SELECT COUNT(*) = 53`)
  - R2 `urania-137-corpus`: 53 objects under `corpus/readings/{sha256}/reading.html`
  - Vectorize `urania-137-corpus-index`: 53 vectors (384-dim, owner-filter query verified, zero leak)
- All docs currently saying "723 corpus" must be corrected to "53 readings (51 Solo + 2 Synastry)."

## Macro Map

### Surfaces
1. `#/admin-data` SPA — `AdminDataBrowserPage.tsx` (corpus / patterns sub-routes)
2. API `functions/api/[[path]].ts` — `GET /api/corpus`, `GET /api/corpus/:sha256`, `GET /api/patterns/search?q=`
3. Data layer — D1 `catalogue_readings`, R2 `corpus/readings/*`, Vectorize `PATTERN_INDEX`, Workers AI `AI`
4. Release surface — `release.yml` (only deploy path) → `scripts/ops/*`, `scripts/d1/*`, `scripts/data/*`, `scripts/verify/split-host-gates.mjs`

### Control flow (deploy)
`git push main` → CI (`ci.yml`: vitest + node-test + typecheck/build + D1-migration-smoke + security audit) → manual `release.yml` dispatch (exact SHA + version + readiness_run_id, `production` Environment approval) → preflight → backup/restore → migrate → cutover app+landing → smoke → attestation → tag/release.

### Data flow
SPA → `authenticate()`/`requireUser()` (CF Access JWT) → owner-scoped `WHERE user_id=?` → D1/R2/Vectorize. Engine (Railway) is upstream only.

## Deep Pass — 3 Layers

### Layer 1 — UI / Settings
`AdminDataBrowserPage` wired, routed (`useHashRoute.ts`, `App.tsx`, `SettingsPage` nav). 802 SPA tests
pass locally. **Gap:** no production deployment → no live browser evidence.

### Layer 2 — Routing / Combos
3 corpus routes owner-scoped, fail-closed, 15/15 function tests pass. **Gap:** the release combo
chain cannot execute — `release.yml` references **six missing scripts** and a missing readiness
workflow. `release-preflight.mjs` validates backup receipts but does not assert the ops scripts exist.

### Layer 3 — PAI / Agent Workflow
Project ISA is at `phase: complete` for the landing deploy (32/32). Corpus-browser ISCs (132–140) are
`[x]`; open gates ISC-143/144/145/146 and `DEFERRED-VERIFY` ISC-188/189 remain. **Gap:** release-phase
ISA criteria pending/deferred; corpus-browser plan doc still says "ingestion pending" (stale).

## Critical findings (blockers)

1. **No deployable path.** `release.yml` calls 6 scripts that do not exist:
   `scripts/ops/validate-targets.mjs`, `scripts/ops/cutover.mjs`, `scripts/ops/alert-probe.mjs`,
   `scripts/d1/backup.mjs`, `scripts/data/mark-subjects-for-review.mjs`,
   `scripts/verify/split-host-gates.mjs`. No readiness workflow emits the artifacts release.yml downloads.
2. **Unshipped corpus work.** `9ad4f0b` + `799534c` are 2 ahead of `origin/main`, plus uncommitted
   384-dim fixes, docs sync, and 4 ingestion scripts.
3. **Stale docs.** D-004 (DEPENDENCY-GRAPH) marked complete but graph has 0 `AdminDataBrowserPage`/readings refs
   (auto-gen timestamp 2026-08-12T05:04 predates the work). corpus-browser plan says "ingestion pending."
4. **Doc-count drift.** "723 corpus" everywhere = folder name, reality is 53 readings.

## Task Graph

| ID | Task | Acceptance | Combo | Priority |
|---|---|---|---|---|
| H-1 | Commit + push pending corpus work | `main == origin/main`; CI green | te-swarm-s | high |
| H-2 | Fix stale docs + 723→53 truth + regen DEPENDENCY-GRAPH | docs reflect 53 readings; graph includes AdminDataBrowserPage | te-swarm-s | high |
| R-1 | `scripts/d1/backup.mjs` + restore-drill + isolation verifier | `node --test scripts/d1/*.test.mjs` green; preview≠prod ID | te-dispatch-paid | high |
| R-2 | `scripts/ops/validate-targets.mjs` + `cutover.mjs` | dry-run exit 0; `--confirm` required for prod mutation | te-dispatch-paid | high |
| R-3 | `scripts/verify/split-host-gates.mjs` + `scripts/ops/alert-probe.mjs` | read-only smoke + alert probes run | te-dispatch-paid | high |
| R-4 | `scripts/data/mark-subjects-for-review.mjs` | idempotent, `--apply` guarded | te-dispatch-paid | high |
| R-5 | `release-preflight.mjs` asserts new scripts exist | fails-closed on any missing ops script | te-dispatch-paid | high |
| R-6 | Readiness workflow emitting production-targets/backup-receipt/preview-proofs/governance-snapshot | workflow yields all 4 artifacts | te-dispatch-paid | high |
| R-7 | Bind preview D1 `urania-137-db-preview` + non-prod secrets | isolation verifier passes | te-swarm-s | medium |
| R-8 | Live proofs FV-188 (admin session) + FV-189 (two-account synastry) | both produce live JSON evidence | te-dispatch-paid | medium |
| R-9 | Close ISA gates ISC-143/144/145/146 | statuses transition with evidence | te-dispatch-paid | medium |
| R-10 | `npm run verify:ci` on merged release-candidate SHA | canonical CI green from clean clone | te-validate | high |
| R-11 | `release.mjs --prepare minor --dry-run` → commit metadata | version bump deterministic, no tag/deploy | te-plan | medium |
| R-12 | `release.mjs --dry-run` preflight | passes all fail-closed guards | te-validate | high |
| R-13 | Dispatch `release.yml` (production Environment approval) | attestation subject SHA == deployed SHA | te-dispatch-paid (approval-gated) | high |
| R-14 | Verify corpus browser live behind Access | live curl returns owner-scoped 53/53 | te-validate | high |
| R-15 | Mark ISA + `_PROJECT-STATUS` operationally_ready | register updated with attestation receipt | te-validate | medium |
| R-16 | Learn: append Changelog/Decisions via ISA skill + doc-sync | canonical conjecture/refutation/learning entries | te-reason | low |

## Skill Gaps

| Skill | Why | Resolve | Status |
|---|---|---|---|
| Cloudflare D1/R2/Pages ops | backup/cutover/validate scripts | `cloudflare-core` + `cloudflare-orchestrator` (active hubs, local) | resolved |
| Release orchestration | conductor loop for R-1→R-16 | `conductor-orchestrator` (active, local) | resolved |

No marketplace installs required.

## Handoff

- **te-swarm-s** (cheap parallel): H-1, H-2, R-7
- **te-dispatch-paid** (ranked B-tier, sequential non-conflicting): R-1→R-6, R-8, R-9
- **te-validate**: R-10, R-12, R-14, R-15
- **te-plan**: R-11
- **te-reason**: R-16
- **Human approval**: R-13 (release dispatch) + `merge`/`deploy`/`credential_change` per approval policy v1

## Decisions

- 2026-08-13 | Scope = full production-readiness → release path (H-1, H-2, R-1→R-16), not a narrower
  "six missing scripts" cut.
- 2026-08-13 | "723" is the archive directory name, not a reading count. Corpus = 53 readings
  (51 Solo + 2 Synastry). H-2 corrects docs to "53 readings" with `/723/` noted as directory label only.
