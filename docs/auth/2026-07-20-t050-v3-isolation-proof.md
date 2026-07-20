# T-050 — V3 per-user isolation verification (two dev identities)

**Date:** 2026-07-20 · **Branch:** `feat/cf-auth` · **Env:** `wrangler pages dev dist --port 8789`, local D1 · **Issue:** #141

Two distinct dev identities: **A** = `dev@urania.local` (`.dev.vars`) and
**B** = `dev-b@urania.local` (CLI `--binding DEV_IDENTITY_EMAIL=dev-b@urania.local`
override — `.dev.vars` never edited; verified live via `/api/me`). The shipped
contract decision applies: cross-user and unknown ids are INDISTINGUISHABLE —
uniform `404 {error:'NOT_FOUND'}`.

## Procedure (runnable)

```bash
# 1. server as A → seed
npx wrangler pages dev dist --port 8789 &
node scripts/verify/t050-isolation.mjs http://localhost:8789 --seed-a T050-<ts>
# 2. restart as B → isolation probes
kill $(lsof -tiTCP:8789)
npx wrangler pages dev dist --port 8789 --binding DEV_IDENTITY_EMAIL=dev-b@urania.local &
node scripts/verify/t050-isolation.mjs http://localhost:8789 --as-b T050-<ts> <aReadingId>
npx wrangler d1 execute DB --local --command "SELECT ... WHERE id='<aReadingId>'; SELECT user_id, COUNT(*) FROM readings GROUP BY user_id;"
# 3. restart as A → post-condition
kill $(lsof -tiTCP:8789)
npx wrangler pages dev dist --port 8789 &
node scripts/verify/t050-isolation.mjs http://localhost:8789 --verify-a T050-<ts> <aReadingId>
```

## Evidence (captured 2026-07-20T18:2xZ, head `84a6d85`)

### (a) Seed as A

```
$ node scripts/verify/t050-isolation.mjs http://localhost:8789 --seed-a T050-1784571889
A_READING da77c992-d299-4cd6-a702-4c78ba592a97
T-050 SEED-A: PASS
```

### (b) Isolation probes as B (identity proven: `{"id":"dev:dev-b@urania.local","email":"dev-b@urania.local"}`)

```
$ node scripts/verify/t050-isolation.mjs http://localhost:8789 --as-b T050-1784571889 da77c992-…
B initial list: 0 own rows, 0 of A's
cross-user GET/PATCH/DELETE → uniform 404 NOT_FOUND; unknown-id indistinguishable; search isolated
T-050 AS-B: PASS
```

Script-enforced assertions: B's list never contains A's id or marker · B can
POST their own reading (201) · `PATCH /api/folio/<A-id> {favorite:true}` →
`404 {error:'NOT_FOUND','message':'reading not found'}` · `DELETE` → identical
404 · `GET /api/folio/<A-id>` → 404 NOT_FOUND · an **unknown** id returns the
byte-identical status+body as the cross-user id (no existence leak) · B's
`?search=` over A's content → `[]` · B's final list = exactly B's own reading.

### (c) D1 row assertion — A's row provably unchanged after B's tamper attempts

```
id da77c992-d299-4cd6-a702-4c78ba592a97 · user_id dev:dev@urania.local
title "T050-1784571889 user-A private" · favorite 0 (B's PATCH favorite:true had NO effect)
created_at 1784571889506

rows per user: dev:dev-b@urania.local → 1 · dev:dev@urania.local → 2
```

### (d) Post-condition as A — PASS

```
$ node scripts/verify/t050-isolation.mjs http://localhost:8789 --verify-a T050-1784571889 da77c992-…
A row da77c992-d299-4cd6-a702-4c78ba592a97 unchanged (favorite=false), B rows invisible to A
T-050 VERIFY-A: PASS
```

## Acceptance checklist (plan, T-050)

- [x] User B's list never contains A's readings (b)
- [x] B's GET/PATCH/DELETE against A's id → uniform 404 `NOT_FOUND`, indistinguishable from unknown id (b)
- [x] A's row provably unchanged in D1 — `favorite` still 0 after B's `PATCH {favorite:true}` (c)
- [x] B's rows invisible to A afterwards (d)
- [x] Evidence archived (this file); dev servers killed by port, no 8789 processes survive
- [ ] Live V3 across two real OTP accounts — Phase 5 scope (T-071)

## Local-env note

A flaky `Address already in use (127.0.0.1:9230)` occurred once on restart —
that is wrangler's default **inspector** port, contended when two wrangler
instances coexist in the shared tree. Workaround used for all later runs:
`--inspector-port 19230` (P3_QA-unique). Not a product bug.
