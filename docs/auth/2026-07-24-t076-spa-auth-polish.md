# T-076 — SPA live-auth polish (useMe / logout / Folio states)

Date: 2026-07-24 · Branch: `feat/cf-auth` · Plan: `docs/superpowers/plans/2026-07-20-cloudflare-auth-readings-plan.md` §T-076

## What changed

### 1. useMe handles 401 → Access login redirect (the core gap)

Before T-076, `useMe` surfaced a Worker 401 as a settled `{ me: null, error: 'unauthenticated' }` state and did nothing with it — against live CF Access that is a silent dead-end (no re-auth path, and an edge-redirected fetch wasn't classified at all). After:

- **New module `src/lib/me.ts`** — the classification layer, extracted from the hook so it is unit-testable in the repo's node-env vitest setup (no jsdom/testing-library in deps):
  - `loadMe()` GETs `/api/me` with `redirect: 'manual'` and classifies the outcome as `{kind:'ok'|...|'reauth'|{kind:'error'}}`.
  - Every unauthenticated manifestation maps to **`reauth`**:
    - Worker **401** (frozen `{error,message}` envelope — e.g. expired token variants that pass the edge but fail Worker verification);
    - **opaqueredirect** — what `redirect: 'manual'` surfaces when the Access edge 302s the fetch;
    - any bare **3xx** on `/api/me` (an Access challenge is never data);
    - a **followed redirect off-origin** (`*.cloudflareaccess.com`) or onto `/cdn-cgi/*`;
    - a **200 with non-JSON content-type** (the edge-served OTP login HTML);
    - a fetch **TypeError** ("Failed to fetch" — the cross-origin redirect target failing CORS, or network down).
  - Real server failures (5xx with the frozen envelope) stay ordinary `error` outcomes with the server's message.
  - `redirectToAccessLogin()` performs a **full navigation** to the origin (`window.location.assign(origin + '/')`) — the Access edge re-challenges on navigation and lands the browser on the OTP login. This cannot loop: the edge either serves the SPA again (session valid → `/api/me` succeeds) or sends the browser to the team-domain login page (different origin, loop broken).
- **`src/hooks/useMe.ts` rewritten** to consume `loadMe`: on `reauth` it navigates immediately without settling into any signed-out state — **no infinite spinner, no stale identity rendered** (the browser leaves the SPA before one can paint). Belt-and-braces `.catch` also navigates rather than spinning.

### 2. Logout hits the real endpoint — verified, no change required

`IdentityChip` already renders `<a href="/api/logout">` — a plain anchor, i.e. a full browser navigation (not fetch), so the browser follows the Worker's 302 to `/cdn-cgi/access/logout` and CF Access tears down its session cookie. Verified statically (component source + `functions/api/[[path]].ts` logout route) **and live** (see below). The chip renders nothing while identity is loading or absent, so no stale identity flash.

### 3. Folio states — verified, no change required

`FolioPanel` + `folioStore` already implement the full state machine: `LoadingSkeleton` placeholder rows while `/api/folio` is in flight, a context-aware empty state (plain / search-no-match / favorites), a friendly error state ("Could not load your saved reports." + server message + Retry button, never a blank panel) on failure, then the D1-backed list. All four verified live (screenshots below).

## Tests / gates

| Gate | Result |
|---|---|
| `npx vitest run src/lib/__tests__/me.test.ts` (new) | **10/10 PASS** — every reauth class above + error envelope + redirect target |
| `npm test` (full suite) | **305/305 PASS** (30 files; was 295 pre-T-076, +10 new) |
| `npm run build` (tsc + vite) | **PASS** |
| `node scripts/verify/delink-check.mjs` | **PASS** — zero live Vercel references |

New test file: `src/lib/__tests__/me.test.ts` — stubs `fetch`/`window` (node env), asserts each unauthenticated manifestation classifies as `reauth`, 5xx envelopes stay errors, and `redirectToAccessLogin` performs exactly one full navigation to the origin.

## Verified LIVE (against https://urania.tryambakam.space, session A)

Evidence: `docs/auth/evidence/` — transcript `2026-07-24-t076-curl-evidence.txt`, screenshots `t076-*.png`, repeatable driver `scripts/verify/t076-spa-auth-evidence.mjs` (reads the token from `CF_ACCESS_TOKEN_FILE`, never prints it; exit 0 with all 5 checks PASS).

| # | Check | Result | Artifact |
|---|---|---|---|
| 1 | `GET /api/me` with session → 200 `{id,email}` (D1-backed identity) | PASS | curl transcript |
| 2 | `GET /api/me` without session → edge **302** to `red-queen-4dfa.cloudflareaccess.com/cdn-cgi/access/login/…` (the exact redirect class `loadMe` now handles) | PASS | curl transcript |
| 3 | `GET /api/logout` with session → **302** to `/cdn-cgi/access/logout` (**not followed** — following would invalidate session A, which later verification still needs) | PASS | curl transcript |
| 4 | Authenticated SPA home renders identity chip (email + Logout anchor) | PASS | `t076-1-home-identity-chip.png` |
| 5 | Folio **loading skeleton** paints while `/api/folio` is artificially delayed | PASS | `t076-2-folio-loading-skeleton.png` |
| 6 | Folio **loaded state** — this account's `/api/folio` is `{"readings":[]}`, so the D1-backed empty state renders ("No saved reports yet — …", "0 saved · synced to your account.") | PASS | `t076-3-folio-loaded.png` |
| 7 | Folio **friendly error state** — `/api/folio` blocked with a 500 envelope → "Could not load your saved reports." + message + Retry (not a blank panel) | PASS | `t076-4-folio-error-state.png` |
| 8 | Clicking **Logout navigates to `/api/logout`** — intercepted and **aborted** before the 302 could be followed; session re-checked 200 afterward | PASS | driver stdout |

## Deferred — owner's manual browser walkthrough

The full end-to-end human pass remains manual by design (documented in the plan as the manual half):

1. Log in via email-OTP in a real browser → SPA loads, identity chip shows the account email.
2. Use the app (generate a reading → it lands in the Folio list — covers the non-empty D1-backed list state, which this account could not show because its Folio is empty).
3. Click **Logout** → browser follows `/api/logout` → `/cdn-cgi/access/logout` → lands on a re-auth challenge; a subsequent `GET /api/me` is 401/redirected.
4. Let the edge session expire (or clear the `CF_Authorization` cookie) while the SPA is open → on next mount/navigation, useMe drives the browser straight back to the OTP challenge with no spinner and no stale identity.

The 401→redirect path itself is covered structurally (10 unit tests against every manifestation class) and its inputs are confirmed live (checks 2–3); only the human-visible flow of it is deferred.

## Files

- `src/lib/me.ts` — **new**; identity fetch + reauth classification + redirect helper
- `src/hooks/useMe.ts` — rewritten on top of `src/lib/me.ts`
- `src/lib/__tests__/me.test.ts` — **new**; 10 tests
- `scripts/verify/t076-spa-auth-evidence.mjs` — **new**; live evidence driver (Playwright, cookie-injected, logout-aborting)
- `docs/auth/evidence/2026-07-24-t076-curl-evidence.txt`, `docs/auth/evidence/t076-{1..4}-*.png` — **new** evidence
- No changes needed in `IdentityChip.tsx`, `FolioPanel.tsx`, `folioStore.ts`, or `functions/` — verified as already correct.
