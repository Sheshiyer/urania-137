# T-049 — Local end-to-end persistence round-trip under `wrangler pages dev`

**Date:** 2026-07-20 · **Branch:** `feat/cf-auth` · **Env:** `wrangler pages dev dist --port 8789` (P3_QA's exclusive port), local D1, migration `0001_init` applied · **Issue:** #140

Proves the full local path: dev identity → `POST /api/folio` save → D1 row →
list/search/favorite/delete round-trip through the real HTTP routes, with
durability across a full server restart (the "page reload" equivalent for the
server side — the SPA is stateless between loads and re-fetches from D1).

## Procedure (runnable)

```bash
npx vite build
npx wrangler d1 migrations apply DB --local          # "No migrations to apply" (0001 already applied)
npx wrangler pages dev dist --port 8789 &            # .dev.vars: DEV_IDENTITY_EMAIL + CF_PAGES="" fix (gitignored)
node scripts/verify/t049-folio-roundtrip.mjs         # save → list → search → favorite → delete
npx wrangler d1 execute DB --local --command "SELECT ... FROM readings WHERE user_id='dev:dev@urania.local';"
kill $(lsof -tiTCP:8789)                             # full server stop
npx wrangler pages dev dist --port 8789 &            # fresh server, same local D1 state
node scripts/verify/t049-folio-roundtrip.mjs http://localhost:8789 --check-survivor <id> <createdAt>
kill $(lsof -tiTCP:8789); pkill -f "pages dev dist --port 8789"
```

## Evidence (captured 2026-07-20T18:2xZ, head `c0e9991`)

### (a) Round-trip through the real HTTP routes — PASS

```
$ node scripts/verify/t049-folio-roundtrip.mjs
me: dev:dev@urania.local
saved: 192be8aa-cb0f-4b7a-a015-5b55ced5940b / 917e4e42-bf46-4309-bbb2-1bfdca369f75
search: title/content/miss all correct
favorite: PATCH + favorites filter correct
delete: removed, re-delete 404
SURVIVOR 917e4e42-bf46-4309-bbb2-1bfdca369f75 1784571696259
T-049 ROUND-TRIP: PASS
```

Script assertions per step (all enforced, not eyeballed):

- `POST /api/folio` ×2 → `201`, exact `ReadingDTO` key set, server-set `id`/`createdAt`/`favorite:false`, client fields echoed
- `GET /api/folio` → `{readings:[…]}` only key, both rows, **newest-first**
- `GET /api/folio?search=` → title match, content match, and miss → `[]`
- `PATCH /api/folio/:id {favorite:true}` → `200` updated DTO; `?favorites=true` → only the favorited row
- `DELETE /api/folio/:id` → `200` body exactly `{}`; re-DELETE → `404 {error:'NOT_FOUND'}`

### (b) D1 row assertion (persisted server-side, scoped to the dev user)

```
$ npx wrangler d1 execute DB --local --command \
    "SELECT id, user_id, node_id, title, favorite, created_at FROM readings WHERE user_id='dev:dev@urania.local';"
→ 1 row: id 917e4e42-bf46-4309-bbb2-1bfdca369f75 · user_id dev:dev@urania.local
  node_id saturn · title "T049-1784571696171 saturn return" · favorite 0 · created_at 1784571696259
```

Exactly one row survived (the deleted one is gone from D1, not just from the list response).

### (c) Durability across a full server restart — PASS

```
$ kill $(lsof -tiTCP:8789)            # server fully stopped; port verified free
$ npx wrangler pages dev dist --port 8789 &     # fresh wrangler/workerd, same local D1
$ node scripts/verify/t049-folio-roundtrip.mjs http://localhost:8789 \
    --check-survivor 917e4e42-bf46-4309-bbb2-1bfdca369f75 1784571696259
survivor intact: 917e4e42-bf46-4309-bbb2-1bfdca369f75 createdAt=1784571696259
T-049 DURABILITY (reload/restart): PASS
```

### (d) Floating-promise check (plan R3 / T-047) — all three `saveReport` callers awaited

```
$ grep -n "saveReport\|archive(" src/hooks/useReportGenerator.ts src/hooks/useDeterministicRun.ts src/hooks/useDailyReading.ts
src/hooks/useReportGenerator.ts:41:   await saveReport({ nodeId: node.id, ... })
src/hooks/useDeterministicRun.ts:33:  await saveReport(payload)
src/hooks/useDailyReading.ts:31:      await archive({ nodeId: 'transit', ... })   // archive defaults to saveReport
```

No floating (un-awaited) `saveReport` call exists in any of the three caller
files, so a freshly generated reading is never silently dropped on the client
side; (a)+(b) prove the awaited save actually lands as a D1 row.

## Acceptance checklist (plan, T-049)

- [x] A freshly saved reading persists as a D1 row (evidence b)
- [x] Survives a full restart/reload with identical `id` + `createdAt` (evidence c)
- [x] Search, favorite-toggle, and delete round-trip through the real routes against D1 (evidence a)
- [x] `wrangler d1 execute` confirms the persisted row (evidence b)
- [x] Floating-promise check: all 3 `saveReport` callers awaited (evidence d)
- [x] Dev-server hygiene: killed by port, `pgrep -f "pages dev.*8789"` clean, surviving workerd PID 70198 predates this run and belongs to another port (left untouched)
