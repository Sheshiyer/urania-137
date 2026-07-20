# T-051 — V6 import idempotency verification

**Date:** 2026-07-20 · **Branch:** `feat/cf-auth` · **Env:** `wrangler pages dev dist --port 8789` (`--inspector-port 19230`), local D1 · **Issue:** #142

The same legacy payload (4 valid entries — 3 with legacy ids, 1 content-hash —
plus 3 malformed entries that must be skipped) is imported **twice as user A**,
then **once as user B** (`dev-b@urania.local`, `--binding` override). Server
dedupe ids are `imp_<sha256(user_id + '\n' + dedupeKey)>` — per-user
namespaced, never equal to legacy client ids.

## Procedure (runnable)

```bash
npx wrangler pages dev dist --port 8789 --inspector-port 19230 &      # as A
node scripts/verify/t051-import-idempotency.mjs http://localhost:8789 --as-a T051-<ts>
npx wrangler d1 execute DB --local --command "SELECT COUNT(*) ... WHERE user_id='dev:dev@urania.local';"
kill $(lsof -tiTCP:8789)
npx wrangler pages dev dist --port 8789 --inspector-port 19230 --binding DEV_IDENTITY_EMAIL=dev-b@urania.local &
node scripts/verify/t051-import-idempotency.mjs http://localhost:8789 --as-b T051-<ts> <aIdsCsv>
```

## Evidence (captured 2026-07-20T18:3xZ, head after T-050 commit)

### (a) User A — double import + edge cases — PASS

```
D1 rows for A before import: 2
$ node scripts/verify/t051-import-idempotency.mjs http://localhost:8789 --as-a T051-1784572074
edge cases: empty/missing/non-array/all-malformed all handled
AIMP imp_065747c8f75f151c86e5031ee143bce07b29de8e154f5ed4ce0d15f9bccacd3d
AIMP imp_12469d9114645b1647134bc11f74343df1a94ac594d0c079e24c022878ef7445
AIMP imp_6b8bd68b44622264bd5e2ac7181ffac74441782aed83e14c67e0c15c3a2dc0bb
AIMP imp_5e178b75e3191ef24f12c8fb133dcdea1326313df07217ca5701eda75ffb25b4
T-051 AS-A: PASS
D1 rows for A after double import: 6   (2 + exactly 4; stable across 2nd AND 3rd import)
```

Script-enforced: first import `{imported:4}` with response key set EXACTLY
`{imported}` · second import `{imported:0}` · third import `{imported:0}` ·
`{entries:[]}` → `{imported:0}` · `{}` → 400 `BAD_REQUEST` with `entries` in
the message · `{entries:'nope'}` → 400 with field name · all-malformed array →
`{imported:0}` (skipped, never fatal) · list shows exactly 4 rows (no
duplicates) · every row id `imp_`-prefixed and ≠ any legacy client id · legacy
`favorite` flags preserved (2 of 4).

### (b) User B — same payload — PASS

```
$ node scripts/verify/t051-import-idempotency.mjs http://localhost:8789 --as-b T051-1784572074 <A ids>
B ids all distinct from A's 4 ids
T-051 AS-B: PASS
```

B's first import of the SAME payload → `{imported:4}` (per-user namespacing —
no cross-user PK collision); B's second → `{imported:0}`; B's 4 `imp_` ids
share NOTHING with A's 4 `imp_` ids.

### (c) Final D1 row counts

```
dev:dev-b@urania.local → 5 rows  (1 own from T-050 + 4 imported)
dev:dev@urania.local   → 6 rows  (2 pre-existing + 4 imported; double import added zero)
```

## Acceptance checklist (plan, T-051)

- [x] Import twice → zero duplicate rows; second run `imported == 0` (a + row counts)
- [x] Empty, legacy, and malformed payloads handled without error (a)
- [x] Per-user scoping preserved during import — second user gets `{imported:N}`, disjoint ids (b)
- [x] `wrangler d1 execute` row-count assertions (a, c)
- [x] Evidence archived; servers killed by port, no 8789 processes survive
