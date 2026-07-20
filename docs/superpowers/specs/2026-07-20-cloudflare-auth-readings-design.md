# Urania 137 — Cloudflare Auth + Per-User Reading Storage Spec

**Date:** 2026-07-20
**Status:** design — awaiting review before implementation
**Related:** `ISA.md`, `docs/integrated-product-map.md`, `docs/selemene-engine-requests.md`, `Sheshiyer/Selemene-engine` (`crates/noesis-api/src/cf_access.rs`, `handlers/auth.rs`, `apps/admin-web`)

## 1. Problem

Urania 137 today serves the Selemene engine through a **single shared `SELEMENE_API_KEY`**
(injected server-side in the Vercel proxy `api/proxy.ts`), so **any anonymous visitor** gets
readings, and the **Folio persists only in browser `localStorage`** (`urania137.folio.v1`).
Readings therefore have **no owner and no durable home** — they are device-local, evaporate on
clear, and can't follow a person across devices. There is no identity layer at all.

To *store* readings and *preserve* the app's functionality durably, we need three coupled
layers — **authenticated identity → a user/readings datastore → per-user reads/writes** — plus a
migration off `localStorage`. The Selemene engine already ships the reference: **Cloudflare
Access (Zero Trust) email-OTP** verified by `cf_access.rs`, a users model, and a TypeScript
`admin-web` client. We port that Zero Trust OTP flow into urania and give it a Cloudflare-native
backend.

## 2. Locked decisions

1. **Architecture: Cloudflare-native.** CF Access email-OTP (in the **9d9d** account) + a
   Cloudflare **Worker/Pages Function** API layer + **D1** for users + readings. urania OWNS its
   user+readings DB.
2. **Access model: login-required.** CF Access gates the whole urania hostname; there is no
   anonymous path. (CF Access gates by hostname/path, not per-user-optionally.)
3. **Host: Cloudflare Pages.** The React SPA moves Vercel → Pages so Access + Pages + Worker + D1
   are one system in the 9d9d account. The SPA UI is otherwise unchanged.
4. **Engine stays shared-key compute.** Panchanga/transits/assets are stateless computation from
   `birth_data`; they need no per-user engine credential. Identity + storage live only at
   **urania's edge** (Worker + D1). Per-user *engine* auth is explicitly out of scope.
5. **Clean Vercel delink.** `api/proxy.ts`, `vercel.json`, `.vercel/`, and the Vercel deploy are
   removed — no dual-host, no duplicated proxy, no trailing Vercel dependencies.
6. **No dev-bypass leaks to prod.** Local `wrangler pages dev` may inject a fake identity; the
   production Worker MUST reject any request lacking a real, verified Access JWT.

## 3. Architecture & platform

```
             ┌──────────────── Cloudflare (9d9d account) ────────────────┐
 user ─OTP─▶ CF Access (email one-time PIN — gates the urania hostname)
             │  │ injects Cf-Access-Jwt-Assertion (verified identity: email, sub)
             ▼  ▼
        urania SPA (Cloudflare Pages)  ──/api/*──▶  Worker  ──┬─▶ D1 (users, readings, birth_profiles)
        (React app — UI unchanged)                            └─▶ Selemene engine (shared X-API-Key, stateless)
             └───────────────────────────────────────────────────────────┘
```

- The **Worker (Pages Functions)** is the sole API layer and trust boundary. It verifies CF
  Access identity, upserts the user, proxies engine compute with the shared key, and reads/writes
  readings in D1.
- The **engine relationship is unchanged** — still a shared-key stateless compute backend. This
  keeps scope inside urania's world; no per-user engine plumbing.

## 4. Auth & identity flow

**Cloudflare-side (infra — 9d9d account, configured by the maintainer, not code):**
- A CF **Access application** on the urania Pages hostname; identity provider = **email OTP**.
  This *is* the login UI — Cloudflare renders it.
- Record the app's **AUD tag** and **team domain** (`<team>.cloudflareaccess.com`); the Worker
  needs both (as vars/secrets).

**Code-side (the Worker — ports `cf_access.rs` verification to TS):**
1. Read `Cf-Access-Jwt-Assertion` (header or `CF_Authorization` cookie) on every `/api/*` call.
2. Verify against the Access app **JWKS** (`https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`):
   signature, `aud` == AUD tag, `exp`. Reject anything unsigned — trust ONLY CF-Access-verified identity.
3. Extract `email` + `sub` → derive a stable `user_id` → **upsert** into D1 `users` (update `last_seen_at`).
4. `GET /api/me` returns `{id, email}` so the SPA knows who's signed in — **no token in the
   browser** (CF Access owns the session cookie; the admin-web localStorage-JWT path is NOT used).
5. Logout = redirect to `/cdn-cgi/access/logout`.

## 5. D1 schema (SQLite dialect)

```sql
-- Core (ships first)
CREATE TABLE users (
  id           TEXT PRIMARY KEY,          -- stable id from CF Access sub/email
  email        TEXT NOT NULL UNIQUE,
  created_at   INTEGER NOT NULL,          -- unix ms, set by the Worker
  last_seen_at INTEGER NOT NULL
);

CREATE TABLE readings (
  id          TEXT PRIMARY KEY,           -- uuid (Worker-generated)
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id     TEXT NOT NULL,
  node_label  TEXT NOT NULL,
  mode        TEXT NOT NULL,              -- 'daily-panchanga', 'engine:panchanga', 'workflow:…', witness mode
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,              -- assembled prose/markdown (what the Folio shows)
  raw         TEXT,                       -- optional JSON of the engine response
  favorite    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_readings_user_time ON readings(user_id, created_at DESC);
CREATE INDEX idx_readings_user_fav  ON readings(user_id, favorite);

-- Second slice (after core)
CREATE TABLE birth_profiles (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  birth_date TEXT NOT NULL, birth_time TEXT NOT NULL,
  latitude   REAL NOT NULL, longitude REAL NOT NULL, timezone TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
```

`readings` is a 1:1 superset of today's `FolioEntry` (`{nodeId, nodeLabel, mode, title, content,
favorite}`), so the Folio migrates field-for-field with no reshaping.

## 6. Request/data flow & the Vercel delink

**Worker API surface (all `/api/*` behind CF Access):**

| Endpoint | Replaces | Behaviour |
|---|---|---|
| `GET /api/me` | — | `{id, email}` from the verified JWT (+ upsert) |
| `ALL /api/selemene/*` | `api/proxy.ts` | verify Access → inject shared key → forward to engine (compute unchanged) |
| `GET /api/folio?search=&favorites=` | `folioStore` list/search | D1 query for the user's readings |
| `POST /api/folio` | `saveReport` | insert `{nodeId,nodeLabel,mode,title,content,raw?}` for the user |
| `PATCH /api/folio/:id` · `DELETE /api/folio/:id` | favorite/remove | update/delete the user's row |
| `POST /api/folio/import` | — | one-time bulk import of the localStorage Folio (idempotent) |

**Isolation — keep public APIs, swap implementations:**
- **`folioStore.ts` keeps its function signatures** (`saveReport`, list, favorites, search); only its
  internals move `localStorage` → `fetch('/api/folio/*')`. So `useReportGenerator`,
  `useDeterministicRun`, and the daily reading's `fetchDailyReading` archive are **unchanged**.
  (One real change: `saveReport` becomes async; the Folio panel gains a loading state.)
- **`selemeneApi.ts` is unchanged** — still targets `/api/selemene`, now served by the Worker.
- The SPA adds a thin `useMe()` (identity) + a logout link. CF Access guarantees the user is
  authenticated before React mounts.

**End-to-end:** OTP → SPA loads → `/api/me` → reading via `/api/selemene/*` (Worker injects key) →
interpret/render (unchanged) → `saveReport` → `POST /api/folio` → D1 under `user_id` → Folio lists
from D1 (durable, cross-device).

**Vercel delink (explicit cutover):**
- **Delete** `api/proxy.ts`, `vercel.json`, `.vercel/`, the Vercel deploy path.
- **Add** `wrangler.toml` (Pages + D1 binding + `SELEMENE_API_KEY`/`SELEMENE_API_URL` secrets +
  Access `AUD`/team vars), the Worker/Functions, D1 migrations.
- **Local dev** switches to **`wrangler pages dev`** (Functions + local D1 + engine proxy together),
  with a dev-only identity injection that CANNOT reach prod.
- **CI/CD** swaps the Vercel deploy for **Cloudflare Pages** (`wrangler pages deploy` +
  `wrangler d1 migrations apply` on deploy).

## 7. Verification strategy (green ≠ done)

| # | Gate | Proven by |
|---|---|---|
| V1 | Auth-required | No `Cf-Access-Jwt-Assertion` → not served / 401; forged/unsigned JWT rejected by JWKS verify |
| V2 | Identity mapped | Post-OTP `GET /api/me` returns the right email; exactly one `users` row per person; `last_seen_at` updates |
| V3 | Per-user isolation | A's saved reading is in A's `/api/folio`, not B's |
| V4 | Durable / cross-device | Save → clear browser / new session / re-auth → `/api/folio` still returns it (it's in D1) |
| V5 | Compute unchanged | `/api/selemene/*` via the Worker returns real readings; `taxonomy.mjs`/`daily-gates.mjs` (repointed at the Worker) still 35/35 + G2 |
| V6 | Folio migration | Seed localStorage → login → `/api/folio/import` → rows in D1, local cleared, re-login no duplication |
| V7 | Vercel delinked | `api/proxy.ts`/`vercel.json`/`.vercel/` gone; no live Vercel-proxy refs; CF Pages build+deploy serve app+Functions |
| V8 | JWT verification | Unit tests vs a mock JWKS: valid → pass; wrong `aud`/expired/bad-sig/unsigned → 401 |

**V1–V4 are verified LIVE** against the deployed CF Pages app with a real OTP login (a reading
persists and is retrievable in a fresh session), not merely "the Worker compiled." No dev-bypass
may reach production (a step that can't do its job must fail, never skip).

## 8. File-level architecture

**New**
- `wrangler.toml` — Pages project + D1 binding + secrets/vars.
- `functions/api/[[path]].ts` (or a Worker) — the API layer: CF Access verify, `/api/me`,
  `/api/selemene/*` proxy, `/api/folio/*` CRUD, `/api/folio/import`.
- `functions/lib/cf-access.ts` — JWKS fetch + JWT verify (port of `cf_access.rs`).
- `functions/lib/db.ts` — D1 query helpers (users upsert, readings CRUD).
- `migrations/0001_init.sql` — users + readings (+ birth_profiles in a later migration).
- `src/hooks/useMe.ts` — identity read + logout link.
- `functions/__tests__/cf-access.test.ts` — V8 unit tests (mock JWKS).
- `scripts/verify/auth-gates.mjs` — V1–V4/V6 live behavioral checks.

**Touched**
- `src/lib/folioStore.ts` — internals → `/api/folio/*` (signatures unchanged; `saveReport` async).
- `src/components/panels/FolioPanel.tsx` — loading state; D1-backed list/search/favorites.
- app chrome — add the signed-in identity + logout link.
- `vite.config.ts` — dev flow via wrangler; CI docs.
- `ISA.md`, `docs/integrated-product-map.md` — record the platform + auth model.

**Deleted**
- `api/proxy.ts`, `vercel.json`, `.vercel/`.

## 9. Out of scope

- Per-user *engine* authentication (readings computed under each user's engine identity).
- Password / social login (CF Access email-OTP only).
- The dormant ③ witness route (tracked separately in `docs/selemene-engine-requests.md`).
- New reading features; this is an identity + storage + platform migration, UI unchanged.

## 10. Open questions for review

1. **Stable `user_id` derivation** — hash of `email`, or the CF Access `sub`? (Proposed: `sub` if
   stable across logins, else a deterministic hash of the lowercased email.)
2. **Hostname** for the Pages app + Access application (same `urania-137` domain, or a new one).
3. **`birth_profiles`** in slice 1 or a fast-follow? (Proposed: fast-follow; core = users + readings.)
4. **D1 region/backup** expectations (Proposed: defaults; readings are regenerable from the engine).
