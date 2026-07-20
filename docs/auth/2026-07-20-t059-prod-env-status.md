# T-059 — Production env: configured / pending / no-dev-bypass assertion

**Date:** 2026-07-20 · **Project:** Pages `urania-137` (9d9d account) · **Status:** PARTIAL — blocked on 3 pending-user values (issue #150 left open).

## Configured now (safe, non-secret)

| Key | Where | Value |
|---|---|---|
| `SELEMENE_API_URL` | `wrangler.toml [vars]` (production, committed) | `https://selemene.tryambakam.space` (public engine base; also the code default) |

The placeholder `CF_ACCESS_AUD` / `CF_ACCESS_TEAM_DOMAIN` entries were REMOVED from
`wrangler.toml [vars]` — placeholders are not pushed to production. Absence fails
closed: a JWT presented before real values exist fails verification → 401.

## Pending-user (3 values) — NOT set anywhere

| # | Key | Why pending | Unblocked by |
|---|---|---|---|
| 1 | `SELEMENE_API_KEY` | The local key in `.env.local` is EXPIRED (verified 401 against the engine). Pushing it would break prod. Needs rotation. | Human rotates the engine key, then `wrangler pages secret put SELEMENE_API_KEY` (T-067) |
| 2 | `CF_ACCESS_AUD` | Real AUD tag exists only after the 9d9d Access app is created. | Human task T-081 → then set as Pages var (T-067) |
| 3 | `CF_ACCESS_TEAM_DOMAIN` | Same — the `{team}.cloudflareaccess.com` domain comes from the 9d9d Access config. | Human task T-081 → then set as Pages var (T-067) |

No placeholder or invented values were pushed. `/api/selemene/*` will fail closed
(engine call without key → upstream 401/403) until value #1 lands — this is expected
and preferable to shipping an expired key.

## No-dev-bypass assertion (production)

1. **Runtime guard (T-017, fail-closed, unit-tested):** dev-identity injection fires
   only when `DEV_IDENTITY_EMAIL` is set AND every production marker is absent
   (`CF_PAGES`, `ENVIRONMENT=production`) AND the hostname is loopback. Pages
   production sets `CF_PAGES=1` → the branch cannot fire even if the var existed.
2. **`wrangler.toml`:** no `DEV_IDENTITY_EMAIL` (grep: only a comment saying it must
   never appear here).
3. **Pages production secrets:** `wrangler pages secret list --project-name=urania-137`
   → EMPTY (no secrets at all; a fortiori no `DEV_IDENTITY_EMAIL`).
4. **Repo hygiene:** `.env.local` and `.dev.vars` are gitignored and untracked;
   `git grep DEV_IDENTITY_EMAIL` outside docs shows only test fixtures, the dev-only
   lib, local verify scripts, and `.dev.vars.example` (placeholder file).
5. **Live evidence (also T-063/T-073 early proof):** unauthenticated
   `curl https://urania-137.pages.dev/api/me` → 401; no dev identity is honored.

## Full no-bypass gate

The live dev-bypass probe (sending dev-identity-shaped headers against prod and
confirming rejection) is exercised in Phase 5 (T-068/T-073) once CF Access is live;
the static/runtime assertions above stand until then.
