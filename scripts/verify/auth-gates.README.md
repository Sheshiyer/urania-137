# auth-gates.mjs — live Phase-5 auth verification harness (T-068)

Runs the Phase-5 live gates against a deployed Urania 137 environment and
prints a per-gate PASS / FAIL / SKIP summary with captured request/response
evidence. Exit code is non-zero on any FAIL; with `--strict`, any SKIP also
exits non-zero (the T-079 Phase-5 sign-off requires every gate green).

```sh
# no sessions — runs everything that can run without a real identity (today)
node scripts/verify/auth-gates.mjs --url https://urania-137.pages.dev

# with real CF Access sessions (post-T-081) — V2/V3/V4 go live
node scripts/verify/auth-gates.mjs --url https://urania-137.pages.dev \
  --session-a "$CF_ACCESS_SESSION_A" --session-b "$CF_ACCESS_SESSION_B"

# final sign-off mode — SKIP counts as failure
node scripts/verify/auth-gates.mjs --url https://urania-137.pages.dev --strict \
  --session-a "$CF_ACCESS_SESSION_A" --session-b "$CF_ACCESS_SESSION_B"
```

Base resolution follows the repo convention: `URANIA_API_BASE` env >
`--url` flag > positional arg > `https://urania-137.pages.dev`.
Sessions also resolve from env: `CF_ACCESS_SESSION_A` / `CF_ACCESS_SESSION_B`.

## Gates

| Gate | Checks | Needs |
|---|---|---|
| V1 auth-required (T-069) | unauthenticated `/api/me`, `/api/folio` (GET/POST/PATCH/DELETE), `/api/folio/import`, `/api/selemene/*`, and an unknown `/api/*` route all return **401** with the frozen `{error, message}` envelope (never engine output, never D1 data; auth precedes routing, so 404 exists only behind auth) | none — runs today |
| SPA shell | `GET /` serves 200 HTML (Pages static asset; the Worker gate covers `/api/*` only), or an Access edge challenge once T-081 enforces at the edge | none — runs today |
| no-dev-bypass (T-073) | no client-supplied variant coerces an identity: `DEV_IDENTITY_EMAIL` / `X-Dev-Identity*` headers, `?dev_identity_email=` query param, `DEV_IDENTITY_EMAIL` cookie, a forged `alg=none` JWT, a garbage token — all must 401 | none — runs today |
| V2 identity-mapped (T-070) | `GET /api/me` with session A → 200 `{id, email}`, id stable across calls (the D1 `users` row / `last_seen_at` diff is T-070's manual step) | session A |
| V3 per-user isolation (T-071) | A creates a probe reading; B's list excludes it; B PATCH/DELETE of A's id → 404 (cross-user id indistinguishable from unknown); A cleans up | sessions A + B |
| V4 durable read (T-072) | A creates a reading; a fresh HTTP client carrying ONLY the credential (no cookies, no localStorage — the fresh-profile stand-in) re-reads it with identical content; cleanup. The two-profile browser walkthrough remains T-072's manual half. | session A |

A check whose precondition is missing reports **SKIP — blocked on T-081**,
never PASS and never silent. A session that is provided but rejected (401)
is a **FAIL** (invalid/expired token), not a skip.

## Acquiring a CF Access session (post-T-081)

> **T-081 resolved 2026-07-23 by reuse:** no new Access app.
> `urania-137.pages.dev` was added to an existing app in team
> `red-queen-4dfa` (9d9d account). The AUD is `df8a00b1…b6b4`, captured live
> from the edge challenge on this hostname — NOT the immersive API's
> `11a62a84…` (a different app in the same team). `CF_ACCESS_AUD` /
> `CF_ACCESS_TEAM_DOMAIN` ship in `wrangler.toml [vars]` (T-067).

The harness accepts three session forms:

1. **Captured browser cookie (OTP login)** — the realistic path:
   - Log in through the CF Access email-OTP challenge at
     `https://urania-137.pages.dev` (redirects to
     `red-queen-4dfa.cloudflareaccess.com`).
   - DevTools → Application → Cookies → copy the `CF_Authorization` value.
   - `--session-a 'cookie:<value>'`
   - Repeat in a second browser profile / second email for session B (V3
     needs two genuinely separate identities). That second email must also be
     allowed by the SELEMENE app's Access policy — add it in the dashboard
     first if the policy is email-listed.
2. **Raw Access JWT** — e.g. from `cloudflared access token
   -app=https://urania.tryambakam.space` (opens the same OTP login, prints the
   JWT). NOTE (verified live 2026-07-24): the edge does NOT accept an inbound
   `Cf-Access-Jwt-Assertion` header — that header is Access→origin only. A raw
   JWT must be sent as the cookie: `--session-a 'cookie:<jwt>'`. The bare /
   `jwt:` forms only work against an origin that validates the header itself
   (local dev), not through the production edge.
3. **Service token** (non-interactive, for CI): create a service token in the
   Zero Trust dashboard (Access → Service auth, team red-queen-4dfa) and pass
   `--session-a 'service:<CF-Access-Client-Id>:<CF-Access-Client-Secret>'`.
   The Access edge exchanges it and injects the JWT assertion upstream, so
   this only works once the SELEMENE app covers the hostname — and the
   service token must be permitted by the app's policy. Note: a service-token
   identity satisfies V1/V2 but is not a substitute for the two real OTP
   identities V3 wants.

## Local dry-run (harness self-validation)

Against `wrangler pages dev` the `DEV_IDENTITY_EMAIL` binding injects a
synthetic `dev:*` identity (frozen contract §c), so the 401 assertions do
not apply. The harness detects that runtime (loopback host + `dev:` id),
reports V1/bypass as `SKIP(local-dev)`, and exercises the V2/V4 code paths
against the injected identity — proving harness logic before prod:

```sh
npm run build
npx wrangler pages dev dist --port 8788   # in another shell
node scripts/verify/auth-gates.mjs --url http://localhost:8788
```

On any non-loopback host an unauthenticated 200 from `/api/me` — or a live
`dev:` identity — is an immediate hard FAIL (the no-dev-bypass-in-prod gate).

## Evidence

Every check prints its request/response evidence inline
(`METHOD path → status  body-snippet`). `--evidence-json <path>` also writes
the full structured result set (base URL, ISO timestamp, per-check verdicts
and captured responses) for the T-077 evidence dossier. Session credentials
are never printed or written.
