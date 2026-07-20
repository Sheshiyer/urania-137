# T-026 — Local identity proof: `/api/me` + single-row upsert (V2 groundwork)

**Date:** 2026-07-20 · **Branch:** `feat/cf-auth` · **Env:** `wrangler pages dev` (wrangler 4.112.0), local D1, migration `0001_init` applied · **Issue:** #117

Local (not live) de-risking of the V2 identity-mapping and single-row upsert contract.
The LIVE V2 across two real OTP accounts is Phase 5 (`T-070`).

## Procedure (runnable)

```bash
cp .dev.vars.example .dev.vars          # DEV_IDENTITY_EMAIL=dev@urania.local (gitignored, never commit)
npx wrangler d1 migrations apply DB --local
npx vite build
npx wrangler pages dev dist --port 8799 &   # dev identity active
curl -s -i http://localhost:8799/api/me     # twice, ~2s apart
npx wrangler d1 execute DB --local \
  --command "SELECT id, email, created_at, last_seen_at FROM users;"
# 401 case: restart pages dev with .dev.vars moved aside (no DEV_IDENTITY_EMAIL) and re-curl
```

### Local-env finding: wrangler 4.x synthesizes `CF_PAGES="1"` under `pages dev`

The fail-closed dev-identity guard (`functions/lib/dev-identity.ts`, T-017) treats the
**presence** of `CF_PAGES` as a production marker — but wrangler 4.112.0 sets `CF_PAGES="1"`
itself in `pages dev`, so dev injection could never fire locally. Fixed **locally only** by
adding `CF_PAGES=""` to `.dev.vars` (gitignored; never deployed — production keeps the
platform-set `CF_PAGES` and unset `DEV_IDENTITY_EMAIL`, so the guard stays fail-closed in
prod). No contract or code change. **T-029/T-035 and anyone running `pages dev` need the
same line in their `.dev.vars`.**

## Evidence (captured 2026-07-20T17:28Z, head `4bf2903`)

### (a) No dev identity (`.dev.vars` moved aside) → 401

```
$ curl -s -i http://localhost:8799/api/me
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error":"UNAUTHORIZED","message":"missing Cf-Access-Jwt-Assertion header or CF_Authorization cookie"}
```

### (b) Dev identity active → 200 with identity; one `users` row created

```
$ curl -s -i http://localhost:8799/api/me
HTTP/1.1 200 OK
Content-Type: application/json

{"id":"dev:dev@urania.local","email":"dev@urania.local"}
```

```
SELECT id, email, created_at, last_seen_at FROM users;
→ id: "dev:dev@urania.local"  email: "dev@urania.local"
  created_at: 1784568538572   last_seen_at: 1784568538572   (created_at === last_seen_at on first call)
```

### (c) Repeat call (~5.5s later) → 200, same identity; single row, `last_seen_at` advanced

```
$ curl -s -i http://localhost:8799/api/me
HTTP/1.1 200 OK

{"id":"dev:dev@urania.local","email":"dev@urania.local"}
```

```
SELECT id, email, created_at, last_seen_at, (last_seen_at - created_at) AS age_ms FROM users;
→ id: "dev:dev@urania.local"  created_at: 1784568538572 (unchanged)
  last_seen_at: 1784568544064  age_ms: 5492 (advanced)

SELECT COUNT(*) AS user_rows FROM users;
→ user_rows: 1
```

The dev-mode user id has the shape `dev:<email>` — intended (deterministic, clearly
synthetic, distinct from any real CF Access `sub`; see `dev-identity.ts`).

## Acceptance checklist (plan, T-026)

- [x] `/api/me` returns the injected `{id,email}` — `dev:dev@urania.local` / `dev@urania.local`
- [x] `users` holds exactly one row for that identity (`user_rows: 1`)
- [x] `created_at` stable across both calls; `last_seen_at` advanced (+5492 ms)
- [x] curl with no assertion (and no dev var) → 401
- [x] Captured command output saved (this file); dev server killed, no lingering processes
