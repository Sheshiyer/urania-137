# Urania 137 — Project Status

**Updated:** 2026-09-21

## Launch Decision

**GO for the attested v0.6.3 production surface** behind Cloudflare Access for the admin / operator identity. Broad multi-user launch is still gated by remaining product milestones (M2–M7) and open ISA residues (ISC-143/145/146, ISC-189 deferred, engine REQ-1/3).

Urania is now `operationally_ready` for the **admin E2E + governed release path** on SHA `93f69e975eb12d5f941af4cfc57ae96b45298237` (tag `v0.6.3`). Receipt: `docs/operations/2026-09-11-admin-e2e.md`.

## State Vocabulary

- `implemented`: code exists on a branch or commit.
- `verified`: required automated/manual evidence passes for that exact commit.
- `deployed`: that exact commit/artifact is live on the named target.
- `operationally_ready`: backup/restore, monitoring, rollback, privacy, security, governance snapshot, and post-deploy gates pass for the deployed commit.

These states are cumulative only with evidence; none is inferred from another.

## Current State

| Area | State | Evidence / gap |
|---|---|---|
| Authenticated app | deployed + verified | Pages production `93caeef7-2566-49c7-94f8-e328c0be266b`, source `93f69e9`, host `app.urania.tryambakam.space` |
| Public landing | deployed | Pages `4850894c-16c7-46bd-9c85-9f800a0bd890`, host `urania.tryambakam.space` |
| v0.6.3 tag | deployed + attested | Attestation verify `ok: true`, issues `[]`; release run `34581173011` |
| Admin Access session | verified | `/api/me` + `/api/admin/session` → `platform-admin` for `sheshnarayan.iyer@gmail.com` |
| Corpus admin browser | deployed + verified | `#/admin-data` 53/53, R2 body, Vectorize hits |
| WitnessRun / narrator | verified on production | non-degraded L1; `reading_interpretations` 0→2 |
| Selemene proxy | verified | `/api/selemene/health` 200 · engine `3.3.1` · 19 engines |
| D1 backup/restore drill | verified | sqlite3 restore-drill (no SQLITE_TOOBIG) during release |
| Alert probe | verified | destination bound; `--expect-delivery` → delivered |
| Release/CI path | verified | readiness.yml → release.yml governed path |
| Branch protection / env reviewers | snapshot: unprotected | still 0 required reviewers; governance records the gap |
| Relationship product journey | blocked | Secure generation API has no production UI caller (M3) |
| Canonical 723 import | blocked | Catalogue of 53 ingested; consented historical import not (M4) |
| Vectorize continuous learning | blocked | One-shot ingest only (M5) |
| Engine `daily-panchanga` | blocked | REQ-1/REQ-3 — Selemene repo |
| Broad consumer launch | not claimed | M2–M7 product work remains |
| Instrument-shell redesign | merged to main | 7 phases complete on `main`; 978 tests (118 files) pass; bundle 574,793 B (budget 575,000); dead code cleaned (`PageTabs`, `HomeJourneyRail`); Starfield scroll owner fixed to `[data-route-field]`; `docs/ui/2026-09-19-instrument-shell-redesign-ledger.md` |
| TypeSafe Jev integration | implemented + verified | Phases A-E on `main` @ `77bccd6`; client, quality assessment, interpretation routing, transit significance scoring; 33 Jev-specific tests |

## Active Work

- Branch: `main` @ `1bd63da` (redesign merged + Jev phases A-E + residual cleanup)
- Production: `main` @ `93f69e9` / tag `v0.6.3` (deploy pending)
- North star: `goal.md`
- Live receipt: `docs/operations/2026-09-11-admin-e2e.md`
- Redesign ledger: `docs/ui/2026-09-19-instrument-shell-redesign-ledger.md`
- Planning spine: `.planning/STATE.md`, `.planning/tasks.md`, `.planning/NEXT-WAVE.json`
- Baseline: `docs/operations/production-baseline.md`
- Rollback matrix: `docs/operations/rollback-matrix.md`

## Next Gate

1. Deploy `main` @ `1bd63da` to production (instrument-shell redesign + Jev integration).
2. Either close R-9 residues (ISC-143/145/146) or consciously park them.
3. Start M2 landing polish / funnel copy (split-host already deployed).
4. Wire `FolioSkeleton` into `AsyncBoundary` loading state for Folio page.
5. `AsyncBoundary` sweep: `NativeRunDialog`, `EngineStatusPanel`, `PatternSection`, `ChatSheet` boot state (deferred from Phase 6).
