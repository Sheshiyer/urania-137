# Auth — frozen Phase-0 decisions (T-006 / T-007 / T-008 / T-009)

Four decisions the whole feature binds to. Frozen in Phase 0; changing any is a contract change.

## (a) CF-Access verification contract (T-006)

- **Source:** every `/api/*` request must carry `Cf-Access-Jwt-Assertion` (header) or the
  `CF_Authorization` cookie. Absent → `401`.
- **Verify:** fetch the Access app JWKS from
  `https://{CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs` (cache by `kid`, refetch on miss).
  Validate: **RS256** signature, `aud` **contains** `CF_ACCESS_AUD`, `exp` not past, `iss` ==
  the team domain. **Reject `alg: none` and any unsigned token** — signature is mandatory.
- **Claims → identity:** `{ email, sub }` (`CfAccessIdentity`).
- **V8 test matrix (functions/__tests__/cf-access.test.ts):** valid → claims · wrong-aud → throw ·
  expired → throw · unsigned/`alg=none` → throw · tampered-signature → throw · unknown-`kid` →
  refetch-then-verify. Ported from `Selemene-engine crates/noesis-api/src/cf_access.rs`.

## (b) user_id derivation (T-007)

`user_id = identity.sub` when present and stable; **else** the lowercase-hex **SHA-256 of the
lowercased, trimmed email**. Deterministic and stable across logins.

Worked example: `Alice@Example.com ` → email `alice@example.com` → (no sub) →
`sha256("alice@example.com")` → the stable `user_id`. The engine `sub`, when issued, is preferred
because it survives an email change.

## (c) prod-safe dev-identity guard (T-008)

Local `wrangler pages dev` may inject an identity via `DEV_IDENTITY_EMAIL` so the flow is
testable without CF Access. The guard is a **single fail-closed conditional**: dev-injection is
honored **only** when `DEV_IDENTITY_EMAIL` is set AND the runtime is local dev. In Pages
production `DEV_IDENTITY_EMAIL` is never set, so the branch cannot fire — and even if a client
sends a `DEV_IDENTITY_EMAIL`-shaped header, it is ignored (only the binding var is read). A
request with no valid `Cf-Access-Jwt-Assertion` and no dev var → `401`. **No dev-bypass path
yields identity in production** (verified by V1 live + the no-bypass gate).

## (d) 9d9d CF-Access infra handoff (T-009 / T-081)

**You** configure this in the 9d9d Cloudflare account — I cannot touch the account:

1. Create a **CF Access application** on the urania Pages hostname (decide the hostname).
2. Identity provider = **email one-time PIN (OTP)**; add an access policy (who may log in).
3. Return the two values the Worker verifies against:

| Worker config key | Value from CF Access | Where to set |
|---|---|---|
| `CF_ACCESS_AUD` | the Access app **AUD tag** | `wrangler.toml [vars]` / Pages env |
| `CF_ACCESS_TEAM_DOMAIN` | `{team}.cloudflareaccess.com` | `wrangler.toml [vars]` / Pages env |

Until these are real (not placeholders), Phases 0–3 run locally via the dev-identity guard;
Phase 5 live verification is gated on them (`T-066`/`T-067` depend on `T-081`).
