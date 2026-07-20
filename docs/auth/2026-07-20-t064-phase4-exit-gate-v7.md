# T-064 — Phase 4 exit gate: consolidated V7 evidence bundle (delink + green Pages deploy)

**Date:** 2026-07-20 · **Branch:** feat/cf-auth @ c1b90bb · **Gate:** V7 = static delink half (T-062) + deploy half (T-063), both green in one run.

## Half 1 — static delink (T-062)

```
$ npm run verify:delink
PASS — zero live Vercel references
(full line: no old-host string, no routing config file, no proxy routing, no
scoped deps, no link directory, no retired dev instruction — token forms elided
here so this evidence doc doesn't trip the gate it quotes)
```

(Only allowlisted historical/self-referential hits remain: the migration plan/spec,
the gate's own pattern definitions, and captured-baseline fixtures.) Wired into CI (T-062).

## Half 2 — Pages deploy (T-063)

Production deployment **eb9a342b** (branch main, source c1b90bb) live at
**https://urania-137.pages.dev** — real outputs:

```
GET /                             → 200 text/html  (SPA: <title>Urania 137 — Selemene Report Console</title>)
GET /api/me                       → 401 {"error":"UNAUTHORIZED","message":"missing Cf-Access-Jwt-Assertion header or CF_Authorization cookie"}
GET /api/folio                    → 401 (same UNAUTHORIZED JSON — Function reachable, auth-gated)
GET /api/selemene/ephemeris/daily → 401 (same — engine proxy route reachable, NOT a static 404)
GET /api/definitely-not-a-route   → 401 (auth before routing, fail-closed)
GET /no-such-route                → 200 SPA fallback (Pages default when no 404.html/_redirects)
```

Per-deployment URLs https://6e89df98.urania-137.pages.dev and
https://eb9a342b.urania-137.pages.dev both return 200.

## Remote migrations (R5-amended)

- Pre-apply snapshot: `backups/d1/urania-137-db-pre-0001-2026-07-20.sql` (empty DB) +
  rollback doc: `docs/auth/2026-07-20-t058-d1-remote-migration-rollback.md`.
- `wrangler d1 migrations apply urania-137-db --remote` → 0001_init.sql ✅
- `wrangler d1 migrations list urania-137-db --remote` → "No migrations to apply!"
- Remote execute: `d1_migrations` row { 0001_init.sql, applied_at 2026-07-20 20:48:15 };
  tables users + readings + idx_readings_user_time + idx_readings_user_fav present.

## Local gates (re-run at c1b90bb)

- `npm test` → 23 files / 202 tests green
- `tsc` (app) + `tsc -p tsconfig.functions.json --noEmit` → green
- `vite build` → green

## Phase 4 scope note

V7 does NOT include live OTP auth (V1–V4) — those are Phase 5, gated on the human's
9d9d CF Access setup (T-081) and the three pending env values tracked in #150.
Branch merges to main with CI green per the repo's normal flow after push.
