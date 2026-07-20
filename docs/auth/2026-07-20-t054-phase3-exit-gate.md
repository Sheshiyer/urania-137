# T-054 — Phase-3 exit gate: per-user D1 persistence + Folio round-trip + import (runnable)

**Date:** 2026-07-20 · **Branch:** `feat/cf-auth` · **Issue:** #145
**Runner:** `bash scripts/verify/phase3-exit-gate.sh` — single consolidated gate, exit 0 = PASS.

The gate executes every sub-gate live (green ≠ done — everything below ran in
one invocation, mark `GATE-1784573046`, head `c4de517`-ish after T-053 commit):

| # | Sub-gate | Result | Evidence |
|---|---|---|---|
| 0 | `npm test` (vitest) | **23 files / 202 tests green** | gate step 0 |
| 0 | `npx tsc --noEmit` (SPA + shared contract) | green | gate step 0 |
| 0 | `npm run typecheck:functions` (Worker) | green | gate step 0 |
| 1 | `npx vite build` + `wrangler d1 migrations apply DB --local` | green | gate step 1 |
| 2 | T-049 round-trip: save→list→search→favorite→delete through real routes | PASS | [t049 proof](2026-07-20-t049-folio-roundtrip-proof.md) |
| 2 | T-049 durability: survivor intact after FULL server restart (same id + createdAt) + D1 row assertion | PASS (`4e8bdd6c-…` ts `1784573055562`) | gate step 2 |
| 3 | T-050 V3: B never lists A's rows; cross-user GET/PATCH/DELETE → uniform 404 NOT_FOUND; unknown-id byte-identical; A row unchanged in D1 (`favorite: 0` after B's PATCH) | PASS | [t050 proof](2026-07-20-t050-v3-isolation-proof.md) |
| 4 | T-051 V6: double import → `{imported:0}`, A row count stable at 4; B importing the same payload → `{imported:4}` with disjoint `imp_` ids | PASS | [t051 proof](2026-07-20-t051-v6-import-idempotency-proof.md) |
| 5 | T-053 contract conformance (runtime half): exact key sets, uniform 404, field-named 400s, drift injection bites — 17/17 | PASS | issue #144 + `functions/__tests__/folio-contract.test.ts` |
| 6 | Hygiene: port 8789 free, zero gate processes survive | PASS | gate step 6 |

## Captured terminal output (2026-07-20T18:44Z run)

```
=== GATE 0/6 static gates — vitest + tsc (SPA + functions) ===
 Test Files  23 passed (23)   ·   Tests  202 passed (202)
  ✓ root tsc (SPA + shared contract types) green
  ✓ typecheck:functions (Worker) green
=== GATE 1/6 build + local D1 migration ===
  ✓ vite build green   ✓ migrations applied (0001_init)
=== GATE 2/6 folio round-trip + restart durability (T-049) ===
SURVIVOR 4e8bdd6c-aef7-4b1f-922b-ee00bd381c5c 1784573055562
T-049 ROUND-TRIP: PASS
  ✓ D1 row persisted (id=4e8bdd6c-aef7-4b1f-922b-ee00bd381c5c)
T-049 DURABILITY (reload/restart): PASS
=== GATE 3/6 V3 per-user isolation (T-050) ===
  ✓ seeded as A: b30c9988-5467-4072-8d7b-ad68780f1b65
cross-user GET/PATCH/DELETE → uniform 404 NOT_FOUND; unknown-id indistinguishable; search isolated
T-050 AS-B: PASS
  ✓ A row provably unchanged in D1 after B tamper attempts
T-050 VERIFY-A: PASS
=== GATE 4/6 V6 import idempotency (T-051) ===
T-051 AS-A: PASS
  ✓ A row count stable at 4 after double import
T-051 AS-B: PASS
  ✓ B got own 4 rows (per-user namespace)
=== GATE 5/6 contract conformance (T-053, runtime half) ===
      Tests  17 passed (17)
=== GATE 6/6 hygiene ===
  ✓ port 8789 free, no gate processes survive
========================================
 PHASE-3 EXIT GATE: PASS  (mark GATE-1784573046)
 persist+durability ✓ round-trip ✓ V3 ✓ V6 ✓ contract ✓ tsc ✓ vitest ✓
========================================
```

## Gate mechanics (for reruns)

- Two dev identities: A = `DEV_IDENTITY_EMAIL` from `.dev.vars` (gitignored),
  B = `--binding DEV_IDENTITY_EMAIL=dev-b@urania.local` CLI override — `.dev.vars`
  is never edited or committed.
- Servers run only on port 8789 (`--inspector-port 19230` avoids the shared
  default inspector port 9230); a `trap … EXIT` kills by port on every path,
  and step 6 hard-fails if anything survives.
- D1 assertions use `wrangler d1 execute DB --local` scoped to the exact ids /
  markers the run created — safe in the shared local D1 (no blanket deletes).

## Acceptance checklist (plan, T-054)

- [x] Single runnable checklist passes end-to-end locally (`phase3-exit-gate.sh`, exit 0)
- [x] persist+reload durability · round-trip · V3 · V6 · contract-conformance · tsc · vitest — every sub-gate green with evidence linked above
- [x] Evidence archived (this file + the three per-task proofs + issue comments #140–#144)
- [ ] Live V1–V4 — Phase-5 scope (T-069+), unchanged by this gate

Phase 3 is complete locally; Phase 4 (Vercel delink) is unblocked.
