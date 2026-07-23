# T-077 — Consolidated live evidence dossier · Phase 5 (2026-07-23/24)

Scope: the Phase-5 live verification of CF Access auth + per-user storage on
the deployed environment, up to the owner's functional declaration
(2026-07-24). Every claim below links to a committed artifact.

## Environment under test

| | |
|---|---|
| Production hostnames | `https://urania-137.pages.dev` · `https://urania.tryambakam.space` (custom domain **active**, proxied) |
| Access | existing `selemene` app, team `red-queen-4dfa` (9d9d) — **reused, no new app** (T-081 resolution) |
| AUD | `df8a00b1d19f2e8034ed262544912656ca969fcdadf0e2599b61d4d2f687b6b4` — captured **live** from the edge 302 (supersedes the immersive API's `11a62a84…` from sibling config) |
| D1 | `urania-137-db` (`d57550ea-…`), migration `0001_init` applied remotely |
| Deploy | production at `feat/cf-auth` HEAD (`--branch main`); `main` published at `369771e` |

## Gate results (live, `scripts/verify/auth-gates.mjs`)

| Gate | Verdict | Evidence |
|---|---|---|
| V1 auth-required (T-069) | ✅ PASS ×8 route shapes — 302 → OTP at the edge, both hostnames | `2026-07-23-v1-post-cutover.json`, `2026-07-23-v1-custom-domain-edge.json` |
| no-dev-bypass (T-073) | ✅ PASS ×7 variants (DEV_IDENTITY headers, query, cookie, forged `alg=none`, garbage) | same |
| V2 identity-mapped (T-070) | ✅ PASS — real OTP identity; D1 `users.id` == JWT `sub` (`c04424f4…`), `created_at` frozen, `last_seen_at` +117 s | `2026-07-24-v2-v4-session-a.json` + D1 query |
| V4 durable read (T-072) | ✅ PASS — credential-only fresh client re-reads server-persisted reading | `2026-07-24-v2-v4-session-a.json` |
| V3 per-user isolation (T-071) | ⏭️ **owner-waived 2026-07-24** — second OTP identity not collected; local proof `2026-07-20-t050-v3-isolation-proof.md` stands | waiver recorded in ISA |
| Worker-envelope defense-in-depth | ✅ bonus — during the grey-cloud window (no edge), the Worker's own 401 `{error,message}` envelope held on all 8 shapes + 7 bypass variants | `2026-07-23-v1-custom-domain.json` |

Totals: **16 PASS / 0 FAIL** unauthenticated; **18 PASS / 0 FAIL** with session A.

## Key decisions & lessons (all committed)

1. **AUD must come from the live edge, not sibling configs.** The 302's
   `kid`/meta-`aud` is authoritative; the immersive API's AUD is a *different
   app* in the same team and would have failed every login (`wrong-aud`).
2. **Reuse over proliferation.** One Access app fronts many hostnames; the
   only dashboard edits were domain rows (bare hostname, **empty path**).
3. **Access requires the orange cloud.** Grey-cloud (DNS-only) CNAMEs bypass
   the zone pipeline — Access never sees the request. The custom domain was
   ungated until the record went proxied.
4. **Legacy DNS survives repo delinks.** A Vercel CNAME
   (`d2f0dbd2…vercel-dns-017.com`) outlived T-055 by days; the authoritative
   zone was confirmed via registrar-delegated NS before editing.
5. **Inbound `Cf-Access-Jwt-Assertion` is not accepted at the edge** — it's an
   Access→origin header. Sessions must be sent as the `CF_Authorization`
   cookie, and tokens are hostname-bound.

## Human actions log

| When (IST) | Action | By |
|---|---|---|
| 2026-07-23 ~22:25 | Added `urania-137.pages.dev` to the selemene app domains | owner |
| 2026-07-23 23:41 | Repointed `urania` CNAME off the legacy Vercel target | owner |
| 2026-07-24 00:01 | Enabled proxy (orange cloud) on the `urania` record → edge gate live | owner |
| 2026-07-24 00:06 | Provided OTP session A (V2/V4 unlocked) | owner |
| 2026-07-24 00:11 | **Waived the V3 live check; declared the build functional; advance to 5C** | owner |

## Open items carried into 5C / sign-off

- **V3 live** — waived; can be re-run any time with a second identity
  (`CF_ACCESS_SESSION_B`), no code change needed.
- **`SELEMENE_API_KEY` rotation** — deferred by owner; blocks the
  engine-dependent live gates (V5 compute, daily gates through
  `/api/selemene/*`). Script staged: `scripts/deploy/t067-prod-secrets.sh`.
- **T-074 engine-dependent half** — pending the key rotation above; static
  halves green (`delink-check`, 267/267 unit tests).
- **T-075 / T-076** — backend hardening + SPA live-auth polish (agent tasks).
- **T-079 sign-off** — conditional on the above; `--strict` harness run
  already green for everything that does not require session B.
