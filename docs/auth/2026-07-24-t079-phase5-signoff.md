# T-079 — Phase 5 exit gate · SIGN-OFF (2026-07-24)

Phase 5 (Live Verification & Hardening) is complete. The urania-137 app is a
login-gated, per-user, D1-backed Cloudflare Pages application in production,
declared functional by the owner 2026-07-24.

## Gate inventory — all 8 gates

| Gate | Verdict | Proof |
|---|---|---|
| V1 auth-required | ✅ LIVE ×8 route shapes, both hostnames | `evidence/2026-07-23-v1-post-cutover.json`, `2026-07-23-v1-custom-domain-edge.json` |
| V2 identity-mapped | ✅ LIVE — real OTP identity; D1 `users.id` == JWT `sub` | `evidence/2026-07-24-v2-v4-session-a.json` |
| V3 per-user isolation | ⏭️ **owner-waived** 2026-07-24 (T-050 local proof stands; re-runnable with a second identity) | `2026-07-20-t050-v3-isolation-proof.md` |
| V4 durable read | ✅ LIVE — credential-only fresh client | `evidence/2026-07-24-v2-v4-session-a.json` |
| V5 compute gate | ✅ LIVE — prod baseline via proxy, byte-identical replay | `evidence/2026-07-24-t074-v5-compute-gate.txt` |
| V6 import idempotency | ✅ (T-051 local proof; route live behind auth) | `2026-07-20-t051-v6-import-idempotency-proof.md` |
| V7 delink + deploy | ✅ static gate + both hostnames live; legacy Vercel CNAME found & removed | `delink-check.mjs`, `evidence/2026-07-23-t066-cutover-curl.txt` |
| V8 CF-Access unit suites | ✅ 305/305 tests incl. 12 hardening + 10 SPA-auth negatives | `npm test` |
| no-dev-bypass | ✅ LIVE ×7 variants, both hostnames | sign-off sweep below |

Final sweep (2026-07-24, session A): **18 PASS · 0 FAIL · 1 SKIP** —
`evidence/2026-07-24-t079-signoff-sweep.json`. The single SKIP is the waived
V3; `--strict` exits 2 solely on it.

## Phase-5 task ledger

| Task | Result | Ref |
|---|---|---|
| T-066 cutover | ✅ edge OTP on both hostnames | `evidence/2026-07-23-t066-cutover-curl.txt` |
| T-067 secrets/vars | ✅ AUD+team in vars, rotated `SELEMENE_API_KEY` encrypted; **#150 closed** | `scripts/deploy/t067-prod-secrets.sh` |
| T-068 harness | ✅ built, edge-amended, session-plumbed | `scripts/verify/auth-gates.mjs` |
| T-069/T-070/T-072/T-073 | ✅ LIVE | sweep JSONs |
| T-071 (V3) | ⏭️ owner-waived | above |
| T-074 | ✅ engine gates live: 4 PASS + 2 documented engine-side FAILs (**REQ-1** `daily-panchanga` unserved, **REQ-3** `core` pass-plan collapse — Selemene engine work, not app defects) | `evidence/2026-07-24-t074-*.txt` |
| T-075 hardening | ✅ no-change-required verdict + 12 negative tests (error-hygiene sweep, JWKS boundedness) | `2026-07-24-t075-hardening.md` |
| T-076 SPA polish | ✅ useMe→Access redirect (all reauth classes), logout via `/api/logout`, Folio states; 5/5 live evidence | `2026-07-24-t076-spa-auth-polish.md` |
| T-077 dossier | ✅ | `2026-07-24-t077-live-evidence-dossier.md` |
| T-078 ISA | ✅ Phase-5 entry + ISC-30 verified | `ISA.md` |
| T-079 sign-off | ✅ this document | — |

## Platform state at sign-off

- **Hostnames:** `urania.tryambakam.space` (custom, active, proxied) + `urania-137.pages.dev` — both Access-gated (selemene app, team `red-queen-4dfa`, AUD `df8a00b1…b6b4`).
- **D1:** `urania-137-db` — migrations `0001_init`, `0002_chat_sessions`, `0003_chat_turn_events` applied remotely.
- **Secrets:** `SELEMENE_API_KEY` (rotated 2026-07-24, encrypted). No `DEV_IDENTITY_EMAIL` anywhere in production.
- **Code:** `main` = `42970e5`; 305/305 tests; delink gate green.

## Residuals (none blocking)

1. Owner's manual browser walkthrough (login → use → real logout → re-auth) — inputs live-verified in T-076; the human-visible pass remains.
2. V3 live re-run — needs a second OTP identity (`CF_ACCESS_SESSION_B`); zero code change required.
3. Engine-side REQ-1 / REQ-3 — tracked in `docs/selemene-engine-requests.md` (Selemene repo work).
4. `birth_profiles` fast-follow (ISC-31) — scheduled separately.
