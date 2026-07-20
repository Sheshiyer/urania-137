# Urania 137 — Cloudflare Auth + Per-User Reading Storage — Swarm Delivery Plan

**Date:** 2026-07-20
**Status:** plan — awaiting review before execution (execution gated on Full Disk Access restore + CF Access setup)
**Spec:** [`docs/superpowers/specs/2026-07-20-cloudflare-auth-readings-design.md`](../specs/2026-07-20-cloudflare-auth-readings-design.md) @ `0b568f4a` (SHA-pinned)
**Method:** swarm-architect (phase → wave → swarm, contract-first parallelism)
**Scale:** 81 tasks · ~255.5h · 6 phases · 39 lock-zone (serialized) tasks · 0 dangling deps

> Decomposed by 6 parallel phase-agents, hardened by an adversarial completeness critic that
> verified coverage **against the live repo** (it confirmed `api/proxy.ts` is exactly the selemene
> proxy, the `useSyncExternalStore` Folio snapshot, `useDeterministicRun`'s two `saveReport` calls,
> `vitest` already a devDep, and the hardcoded `vercel.app` URLs in the verify scripts). Its fixes
> are all applied here — see §11.

## 1. Discovery summary

| Dimension | Value |
|---|---|
| Delivery mode | production (a platform migration + new auth/storage) |
| Release model | phased; Phases 0–4 build locally, Phase 5 verifies live on the deploy |
| Quality bar | behavior-proving gates V1–V8 (green ≠ done); live OTP verification; no dev-bypass in prod |
| Team topology | solo human + 4 agent roles + **1 human infra handoff** (CF Access in the 9d9d account) |
| Constraints | Cloudflare-native, login-required, host on Pages, engine stays shared-key, clean Vercel delink |
| External | CF Access app/OTP config in the 9d9d account (`T-081`, yours); local FS access restore |

## 2. Assumptions & constraints

- **CF Access is the login** — Cloudflare renders the email-OTP; there is no login UI to build. Its
  config (app, AUD, team domain, OTP IdP) is **your infra action** (`T-081`) — I can't touch the account.
- **Engine stays shared-key stateless compute.** Identity + storage live only at urania's edge
  (Worker + D1). No per-user engine auth (out of scope).
- **Isolation via stable public APIs:** `folioStore.ts` keeps its signatures (`saveReport` becomes
  async); `selemeneApi.ts` is byte-unchanged. The Worker is the new trust boundary.
- **`birth_profiles` is a tracked fast-follow**, not slice 1 (recorded, not omitted — `T-061`).
- **No dev-bypass may reach production** — a single fail-closed guard, tested (`T-008/T-019/T-073`).

## 3. Agent ownership model

| Concern | Owner | Tasks (representative) |
|---|---|---|
| Contracts · docs · ISA · CF-Access handoff doc | **Claude** | T-004, T-006, T-009, T-013, T-078 |
| Worker · D1 · wrangler · cf-access verify · migrations · CI/CD | **Copilot** | T-001–T-003, T-015–T-020, T-030–T-033, T-041–T-044, T-057, T-080 |
| SPA — folioStore, FolioPanel, useMe, identity/logout | **Codex** | T-026, T-045–T-048, T-056 |
| Gates V1–V8 · tests · live verification | **Gemini** | T-014, T-021, T-034–T-038, T-049–T-051, T-062, T-069–T-077 |
| **CF Access provisioning (9d9d account)** | **You (human)** | **T-081** |

## 4. Phase map

| Phase | Delivers | Exit gate |
|---|---|---|
| **0 · Platform & Contracts** | wrangler + Pages + local D1 + Functions skeleton (501 stubs); **freeze** the shared API contract, CF-Access verify contract, `user_id` rule, dev-guard, 9d9d handoff | `T-014` (wrangler builds, migration applies, contracts tsc-green, routes respond) |
| **1 · Auth & Identity** | port `cf_access.rs`→TS (JWKS/aud/exp), user upsert, `GET /api/me`, logout, prod-safe dev-identity; V8 unit tests | `T-029` (`/api/me` local + V8 green) |
| **2 · Engine Proxy Migration** | Worker `/api/selemene/*` replaces `api/proxy.ts` (verify→inject→forward); `selemeneApi.ts` unchanged; V5 parity | `T-039` (byte-parity to baseline) |
| **3 · Readings Storage & Folio** | `/api/folio` CRUD + idempotent import; `folioStore` internals→D1; FolioPanel states; V3 isolation, V6 import | `T-054` (per-user D1 round-trip) |
| **4 · Vercel Delink & Pages CI/CD** | delete Vercel artifacts; Pages deploy + `d1 migrations apply`; remote D1 provisioned; V7 | `T-064` (zero Vercel deps, Pages deploy green) |
| **5 · Live Verification & Hardening** | prod deploy + your CF Access cutover; **V1–V4 live** with real OTP; no-bypass; evidence + ISA sign-off | `T-079` (all 8 gates green live) |

## 5. Detailed Phase 0 (the contract-freeze foundation)

- **Wave P0-W1 (parallel):** *S0-A [Copilot]* platform substrate — `wrangler.toml` (Pages + D1 binding `DB` + the four config keys), tooling/`.dev.vars.example`/gitignore, migration `0001_init` (users, readings, indexes), typed `Env`. *S0-B [Claude]* freeze the cross-agent contracts — `src/lib/api/contract.ts` (shared request/response types), the CF-Access verification contract, the `user_id` rule (sub → else SHA-256 of lowercased email), the prod-safe dev-guard, and the 9d9d handoff doc.
- **Wave P0-W2:** *S0-C [Copilot]* Functions router with a **distinct 501 stub per endpoint** + `wrangler pages dev` bring-up. *S0-D [Claude]* record the platform + every frozen contract into `ISA.md` + product-map. *S0-E [Gemini]* the runnable exit gate (`T-014`).

Everything downstream binds to these frozen contracts; Phase 0 implements **no behavior** (stubs only), so Phases 1–4 parallelize without contract churn.

## 6. Dependency rationale

- **Contracts freeze before parallel build.** All of Phases 1–4 gate on `T-014`; nothing re-decides a contract.
- **Independent tracks:** the Worker verify/proxy/folio routes (Copilot), the SPA folioStore/panel/identity (Codex), and the gate suites (Gemini) run in parallel against the frozen `contract.ts`.
- **Serialized lock zones (39 tasks):** one owner per shared file — `wrangler.toml`, `package.json`, `functions/api/[[path]].ts`, `functions/lib/{cf-access,db}.ts`, `src/lib/folioStore.ts`, `FolioPanel.tsx`, `vite.config.ts`, `contract.ts`, `ISA.md`. Contract-changers live in Phase 0.
- **The human handoff (`T-081`) gates the live Phase 5** — V1–V4 can't run until CF Access is real.
- **`T-080` (remote D1) gates the remote migration** in `T-058/T-065`.

## 7. Verification strategy

The 8 gates map to owning tasks and each is shown red once: V1 auth-required, V2 identity-mapped, V3 per-user isolation, V4 durable/cross-device, V5 compute-unchanged (taxonomy/daily-gates **byte-parity to a captured baseline**, not just green), V6 idempotent import, V7 Vercel delinked (grep includes the `vercel.app` host), V8 JWT-verify (mock JWKS, **6 enumerated cases incl. alg=none**). **V1–V4 run LIVE** on the deployed Pages app with real OTP logins across two accounts + a fresh session. `scripts/verify/auth-gates.mjs` is the consolidated live runner. A dev-bypass sent to prod yields **no identity** — proven inert.

## 8. GitHub sync strategy

One task → one issue, labelled `phase:N` / `area:*` / `agent:*` / `status:*` / `lock-zone`; dependencies as `depends on #…` checklists; the human handoff `T-081` labelled `blocked:user`. PR-per-task on `feat/cf-auth/<task-id>` branches; **merge at wave boundaries** with a wave summary. A DAG validator in CI fails on any undefined dep. (Issue graph created when execution starts — deferred while local FS is blocked.)

## 9. Worker bootstrap strategy

Fresh Copilot/Codex/Gemini sessions launch from a scoped packet carrying the **frozen Phase-0 contracts** (`contract.ts`, `Env`, the CF-Access verify contract, the migration), their task subset with acceptance commands, and lock-zone rules. Phase 0 must complete before any Phase 1+ packet — the packet's value is that the contracts are already frozen.

## 10. Risks & fallback

| # | Risk | Trigger | Fallback |
|---|---|---|---|
| R1 | CF Access can't front a Pages app as expected | `T-066` live redirect fails | Verify the Access app covers the exact Pages hostname; use a custom domain proxied through CF |
| R2 | `user_id` from `sub` unstable across logins | `T-016` two-login test | Fall back to the documented SHA-256-of-email derivation (already specced) |
| R3 | Async `saveReport` drops a save silently | `T-049` floating-promise check | All 3 caller files awaited (T-047 amended); the check fails on an unawaited call |
| R4 | Delink leaves a live `vercel.app` call | `T-062` V7 grep | The grep now includes the host string; verify scripts repointed (T-055 amended) |
| R5 | Remote migration irreversible on real data | post-cutover re-migrate | `wrangler d1 export` snapshot + documented rollback before `--remote` (T-058/T-065 amended) |
| R6 | Human handoff (`T-081`) never done | Phase 5 stalls | It's an explicit gating task with sign-off = real AUD/team values; Phases 0–4 proceed without it |

## 11. Reconciliation applied (critic → fixes)

Verdict was `needs-fixes`. Applied:
- **Critical "spec missing" — false positive.** The spec **is** committed (`0b568f4a` on `main`); the critic read stale/local state. The plan SHA-pins it (header).
- **Major — 3rd `saveReport` caller:** `T-047` amended to cover `useDeterministicRun.ts` (2 sites) — all three caller files.
- **Major — remote D1 unowned:** **added `T-080`** (provision preview+prod D1, wire `database_id`); `T-058/T-065` now depend on it.
- **Major — `vercel.app` URLs survive delink:** `T-055` repoints the verify scripts; `T-062`'s V7 grep includes the host string.
- **Minors:** V8 6-case enumeration (`T-021`); Folio sync-snapshot/async-fetch refresh contract (`T-045`); `T-048` → lock-zone; `T-037/T-038` order; **added `T-081`** (CF Access human provisioning handoff, gates `T-066/T-067`); migration backup+rollback (`T-058/T-065`); `birth_profiles` fast-follow recorded (`T-061`).

**Result:** 81 tasks, **0 dangling deps**, no cycles.

---

## Appendix A — full task list (schema-complete)

### Master task table

_81 tasks · reconciled (+2 tasks, T-048 lock, T-058/65/66/67 deps, 9 amendment notes) · dangling deps: 0 · ~255.5h · lock-zone: 39_

| ID | Ph | Wave/Swarm | Area | Agent | h | Lock | Deps | Title |
|---|---|---|---|---|---|---|---|---|
| T-001 | P0 | P0-W1/S0-A | infra | Copilot | 2 | 🔒 | — | Author wrangler.toml (Pages project + D1 binding + vars/secrets) |
| T-002 | P0 | P0-W1/S0-A | infra | Copilot | 1.5 | 🔒 | T-001 | Wire wrangler tooling: package.json scripts + .dev.vars.example + gitignore |
| T-003 | P0 | P0-W1/S0-A | data | Copilot | 2.5 |  | T-001 | Create D1 database + migration 0001_init.sql (users, readings, indexes) |
| T-004 | P0 | P0-W1/S0-B | backend | Claude | 3 | 🔒 | — | Freeze the shared API contract types (endpoint request/response DTOs) |
| T-005 | P0 | P0-W1/S0-A | backend | Copilot | 1.5 | 🔒 | T-001 | Define the typed Worker Env interface (D1 + secrets + vars) |
| T-006 | P0 | P0-W1/S0-B | backend | Claude | 3 |  | T-001 | Freeze the CF-Access verification contract (JWKS / aud / exp / claims + V8 matrix) |
| T-007 | P0 | P0-W1/S0-B | backend | Claude | 2 |  | T-003 T-006 | Pin the user_id derivation + upsert contract (resolve open question 1) |
| T-008 | P0 | P0-W1/S0-B | backend | Claude | 2 |  | T-005 T-006 | Freeze the prod-safe dev-identity-injection contract |
| T-009 | P0 | P0-W1/S0-B | infra | Claude | 2 |  | T-001 T-006 | Write the 9d9d CF-Access infra handoff doc (app / AUD / team / OTP / hostname) |
| T-010 | P0 | P0-W2/S0-C | backend | Copilot | 3 | 🔒 | T-004 T-005 | Build the Functions router skeleton with contract-shaped 501 stubs |
| T-011 | P0 | P0-W2/S0-C | infra | Copilot | 2 |  | T-001 T-002 T-003 T-010 | Bring up local `wrangler pages dev` (SPA + Functions + local D1) |
| T-012 | P0 | P0-W2/S0-E | qa | Gemini | 1.5 |  | T-002 T-003 | Verify migration 0001 applies to a fresh local D1 (schema + idempotency) |
| T-013 | P0 | P0-W2/S0-D | product | Claude | 2.5 | 🔒 | T-004 T-006 T-007 T-008 T-009 | Record the platform + frozen contracts in ISA.md and the product map |
| T-014 | P0 | P0-W2/S0-E | qa | Gemini | 2 |  | T-001 T-002 T-003 T-004 T-005 T-006 T-007 T-008 T-009 T-010 T-011 T-012 T-013 | Phase 0 EXIT gate: wrangler builds, migration applies, contracts tsc-green, dev serves |
| T-015 | P1 | P1.W1/P1.W1.S1 | backend | Copilot | 6 | 🔒 | T-014 | Port cf_access.rs → cf-access.ts: JWKS fetch+cache + verify sig/aud/exp |
| T-016 | P1 | P1.W1/P1.W1.S2 | data | Copilot | 4 | 🔒 | T-014 | db.ts users upsert helper (create + last_seen_at update) on D1 |
| T-017 | P1 | P1.W1/P1.W1.S2 | backend | Copilot | 4 |  | T-014 | Prod-safe dev-identity injection module (fail-closed) |
| T-018 | P1 | P1.W2/P1.W2.S1 | backend | Copilot | 3 | 🔒 | T-015 | Claims extraction + stable user_id derivation (sub else email-hash) |
| T-019 | P1 | P1.W2/P1.W2.S1 | backend | Copilot | 5 | 🔒 | T-015 T-017 | Router auth middleware: verify Access JWT or 401 (dev-injection non-prod only) |
| T-020 | P1 | P1.W3/P1.W3.S1 | backend | Copilot | 4 | 🔒 | T-016 T-018 T-019 | GET /api/me (identity + user upsert) + logout redirect |
| T-021 | P1 | P1.W3/P1.W3.S2 | qa | Gemini | 5 | 🔒 | T-015 T-018 | V8 core JWT-verification + identity unit tests (mock JWKS) |
| T-022 | P1 | P1.W3/P1.W3.S2 | qa | Gemini | 4 | 🔒 | T-017 T-019 | No-dev-bypass-in-prod + auth-required negative-path tests |
| T-023 | P1 | P1.W3/P1.W3.S2 | qa | Gemini | 3 | 🔒 | T-015 | JWKS cache/rotation hardening + fail-closed tests |
| T-024 | P1 | P1.W4/P1.W4.S1 | frontend | Codex | 3 |  | T-020 | src/hooks/useMe.ts — read /api/me identity into the SPA |
| T-025 | P1 | P1.W4/P1.W4.S1 | frontend | Codex | 3 | 🔒 | T-024 | App chrome: signed-in identity display + logout link |
| T-026 | P1 | P1.W4/P1.W4.S2 | qa | Gemini | 3 |  | T-020 T-017 | Local identity proof: /api/me returns identity + single-row upsert (V2 groundwork) |
| T-027 | P1 | P1.W4/P1.W4.S3 | product | Claude | 2 | 🔒 | T-018 T-020 | Record auth/identity model in ISA.md + product map (Phase-1 ISCs) |
| T-028 | P1 | P1.W5/P1.W5.S1 | qa | Gemini | 3 | 🔒 | T-021 T-022 T-023 | Wire the V8 suite into package.json + CI (one-command run) |
| T-029 | P1 | P1.W5/P1.W5.S1 | qa | Gemini | 4 |  | T-020 T-024 T-025 T-026 T-028 | Phase-1 EXIT GATE: /api/me identity locally + V8 green (consolidated run) |
| T-030 | P2 | P2.W1/P2.S1 | backend | Copilot | 4 |  | T-014 | Port api/proxy.ts forwarding into functions/lib/engine-proxy.ts |
| T-031 | P2 | P2.W1/P2.S1 | backend | Copilot | 4 | 🔒 | T-030 T-029 T-014 | Wire /api/selemene/* route: verify Access -> inject key -> forwardToEngine |
| T-032 | P2 | P2.W1/P2.S1 | backend | Copilot | 3 | 🔒 | T-031 | Header & key hygiene on the proxy route (trust boundary) |
| T-033 | P2 | P2.W1/P2.S1 | backend | Copilot | 3 | 🔒 | T-031 | Error, timeout, and streaming edge mapping on the proxy route |
| T-034 | P2 | P2.W2/P2.S2 | qa | Gemini | 3 |  | T-031 T-032 | Repoint taxonomy.mjs base at the Worker with prod-safe dev identity |
| T-035 | P2 | P2.W2/P2.S2 | qa | Gemini | 3 |  | T-031 T-032 | Repoint daily-gates.mjs base at the Worker with prod-safe dev identity |
| T-036 | P2 | P2.W2/P2.S3 | frontend | Codex | 2 |  | T-031 | Verify selemeneApi.ts unchanged; SPA generate path works via the Worker |
| T-037 | P2 | P2.W3/P2.S4 | qa | Gemini | 4 |  | T-034 T-035 T-038 | V5 compute-unchanged gate through the Worker |
| T-038 | P2 | P2.W3/P2.S4 | qa | Gemini | 3 |  | T-032 T-033 | Golden parity capture for engine responses |
| T-039 | P2 | P2.W3/P2.S4 | qa | Gemini | 3 |  | T-031 T-032 T-033 T-036 T-037 T-038 | Phase 2 exit gate: engine compute served through the Worker, V5 green |
| T-040 | P3 | P3-W1/P3-S1 | backend | Copilot | 5 |  | T-014 T-029 | functions/lib/db.ts — typed user-scoped readings data-access layer |
| T-041 | P3 | P3-W1/P3-S1 | backend | Copilot | 4 | 🔒 | T-040 | GET /api/folio — list with search + favorites filters (user-scoped) |
| T-042 | P3 | P3-W1/P3-S1 | backend | Copilot | 3 | 🔒 | T-041 | POST /api/folio — save reading |
| T-043 | P3 | P3-W1/P3-S1 | backend | Copilot | 4 | 🔒 | T-042 | PATCH + DELETE /api/folio/:id — favorite toggle and delete with ownership guard |
| T-044 | P3 | P3-W1/P3-S1 | backend | Copilot | 5 | 🔒 | T-043 | POST /api/folio/import — idempotent localStorage import |
| T-045 | P3 | P3-W1/P3-S2 | frontend | Codex | 6 | 🔒 | T-014 | Refactor folioStore.ts internals localStorage→fetch (same signatures, async save) |
| T-046 | P3 | P3-W1/P3-S2 | frontend | Codex | 5 | 🔒 | T-045 | FolioPanel — loading/empty/error states over D1-backed list/search/favorites |
| T-047 | P3 | P3-W1/P3-S2 | frontend | Codex | 3 |  | T-045 | Await async saveReport in report/daily hooks |
| T-048 | P3 | P3-W1/P3-S2 | frontend | Codex | 4 | 🔒 | T-045 | One-time localStorage→D1 import trigger (client) |
| T-049 | P3 | P3-W2/P3-S3 | qa | Gemini | 4 |  | T-039 T-044 T-046 T-047 | Local end-to-end persistence round-trip under wrangler pages dev |
| T-050 | P3 | P3-W2/P3-S3 | qa | Gemini | 4 |  | T-043 T-049 | V3 — per-user isolation verification (two identities) |
| T-051 | P3 | P3-W2/P3-S3 | qa | Gemini | 3 |  | T-044 T-048 T-049 | V6 — import idempotency verification |
| T-052 | P3 | P3-W2/P3-S3 | qa | Gemini | 4 | 🔒 | T-040 T-041 T-042 T-043 T-044 | db-layer + folio-route unit/contract tests (mock/local D1) |
| T-053 | P3 | P3-W2/P3-S3 | qa | Gemini | 3 |  | T-041 T-042 T-043 T-044 T-045 | Contract conformance — folio responses/requests match the frozen shared types |
| T-054 | P3 | P3-W2/P3-S3 | qa | Gemini | 3 |  | T-049 T-050 T-051 T-052 T-053 | Phase 3 exit gate — per-user D1 persistence + Folio round-trip + import (runnable) |
| T-055 | P4 | 4A/S4A-1 | infra | Copilot | 3 | 🔒 | T-039 T-054 | Delete Vercel serverless/routing artifacts and purge Vercel deps |
| T-056 | P4 | 4A/S4A-2 | frontend | Codex | 2 | 🔒 | T-039 | Retire Vite dev-proxy; make `wrangler pages dev` the single local entrypoint |
| T-057 | P4 | 4B/S4B-1 | infra | Copilot | 4 | 🔒 | T-055 T-014 | Configure Cloudflare Pages build (SPA + Functions) |
| T-058 | P4 | 4B/S4B-1 | infra | Copilot | 5 | 🔒 | T-057 T-014 T-054 T-080 | Wire deploy pipeline: D1 migrations apply + pages deploy |
| T-059 | P4 | 4B/S4B-1 | infra | Copilot | 3 | 🔒 | T-057 T-029 T-014 | Configure production secrets/vars and assert no dev-bypass in prod |
| T-060 | P4 | 4B/S4B-2 | product | Claude | 3 |  | T-014 T-056 | Update dev + deploy docs to the wrangler pages workflow |
| T-061 | P4 | 4B/S4B-2 | product | Claude | 3 | 🔒 | T-055 T-029 | Update ISA + product-map to host=Cloudflare Pages with a V7 ISC |
| T-062 | P4 | 4C/S4C-1 | qa | Gemini | 3 |  | T-055 T-056 T-060 T-061 | Static delink verification check (V7 static half) |
| T-063 | P4 | 4C/S4C-1 | qa | Gemini | 3 |  | T-057 T-058 T-059 | Pages deploy verification: app + Functions + migrations (V7 deploy half) |
| T-064 | P4 | 4C/S4C-1 | qa | Gemini | 2 |  | T-062 T-063 | Phase 4 exit gate: consolidated V7 (delink + green Pages deploy) |
| T-065 | P5 | 5A/S5A-1 | infra | Copilot | 2 |  | T-064 T-080 | Production deploy to Cloudflare Pages (prod D1 migrated) |
| T-066 | P5 | 5A/S5A-2 | infra | Claude | 3 |  | T-014 T-065 T-081 | CF Access email-OTP cutover coordination (9d9d account) |
| T-067 | P5 | 5A/S5A-1 | infra | Copilot | 1.5 | 🔒 | T-065 T-066 T-081 | Apply production Worker secrets/vars (AUD, team, SELEMENE) |
| T-068 | P5 | 5A/S5A-3 | qa | Gemini | 5 |  | T-014 T-064 | Build live verification harness scripts/verify/auth-gates.mjs |
| T-069 | P5 | 5B/S5B-1 | qa | Gemini | 2 |  | T-066 T-067 T-068 T-029 | V1 auth-required — verify LIVE |
| T-070 | P5 | 5B/S5B-1 | qa | Gemini | 2 |  | T-069 T-029 | V2 identity-mapped — verify LIVE |
| T-071 | P5 | 5B/S5B-2 | qa | Gemini | 3 |  | T-070 T-054 | V3 per-user isolation — verify LIVE across two real accounts |
| T-072 | P5 | 5B/S5B-2 | qa | Gemini | 2.5 |  | T-070 T-054 | V4 durable / cross-device — verify LIVE in a fresh session |
| T-073 | P5 | 5B/S5B-3 | qa | Gemini | 2 |  | T-067 T-029 T-068 | No-dev-bypass-in-prod gate — prove the dev identity is inert |
| T-074 | P5 | 5B/S5B-3 | qa | Gemini | 4 |  | T-065 T-039 T-054 T-064 T-029 | V5/V6/V7/V8 — re-confirm for the deployed environment |
| T-075 | P5 | 5C/S5C-1 | backend | Copilot | 5 | 🔒 | T-069 T-070 T-071 T-072 T-073 T-074 | Backend hardening pass (fix live-gate findings, re-verify) |
| T-076 | P5 | 5C/S5C-2 | frontend | Codex | 3 | 🔒 | T-070 T-072 | SPA live-auth polish (useMe / logout / Folio states) |
| T-077 | P5 | 5C/S5C-3 | product | Claude | 4 |  | T-069 T-070 T-071 T-072 T-073 T-074 T-075 T-076 | Consolidated live evidence dossier |
| T-078 | P5 | 5C/S5C-3 | product | Claude | 2 | 🔒 | T-077 | ISA Phase 5 ISCs marked verified |
| T-079 | P5 | 5C/S5C-4 | qa | Gemini | 2 |  | T-075 T-076 T-077 T-078 | Phase 5 exit gate — all 8 gates green LIVE, migration sign-off |
| T-080 | P4 | 4B/S4B-1 | infra | Copilot | 2 | 🔒 | T-003 T-057 | Provision remote D1 (preview + production) + wire database_id |
| T-081 | P5 | 5A/S5A-2 | product | Human | 1 |  | T-009 | USER HANDOFF: create the CF Access application in the 9d9d account (email-OTP) → return AUD + team domain |

### Task detail

#### Phase 0 · Platform & Contracts

**T-001 · Author wrangler.toml (Pages project + D1 binding + vars/secrets)**  
`infra` · Cloud/backend (Copilot) · 2h · P0-W1/S0-A · 🔒 · deps: none  
- **Deliverable:** wrangler.toml at repo root declaring: the Pages project (name, compatibility_date, pages_build_output_dir=dist), a D1 binding `[[d1_databases]] binding = "DB"` with database_name + placeholder database_id, plaintext `[vars]` CF_ACCESS_AUD and CF_ACCESS_TEAM_DOMAIN (dev placeholders), and documented secrets SELEMENE_API_KEY + SELEMENE_API_URL (referenced, NOT committed with values). Establishes the canonical binding/var names all other tasks import.
- **Acceptance:** `wrangler pages dev` (or `wrangler pages functions build`) parses wrangler.toml with no config error and lists a D1 binding named exactly `DB`; the four config keys CF_ACCESS_AUD / CF_ACCESS_TEAM_DOMAIN / SELEMENE_API_KEY / SELEMENE_API_URL are present as vars or documented secrets. Behavior-verified, not merely 'file written'.
- **Validation:** Run wrangler against the config; observe the DB binding in the binding output and zero parse errors; grep the four key names.
- **Notes:** Foundational root: T-002/T-003/T-005/T-006/T-009 depend on the binding + var names frozen here. database_id stays a placeholder until T-003 creates the DB; the Access AUD/team values stay placeholders until the user completes infra (tracked in T-009).

**T-002 · Wire wrangler tooling: package.json scripts + .dev.vars.example + gitignore**  
`infra` · Cloud/backend (Copilot) · 1.5h · P0-W1/S0-A · 🔒 · deps: T-001  
- **Deliverable:** wrangler added as a devDependency; npm scripts: `dev` (wrangler pages dev), `build` (vite build), `migrate:local` / `migrate:remote` (wrangler d1 migrations apply --local/--remote); a committed `.dev.vars.example` listing the four config keys with dummy values; `.gitignore` entries for `.wrangler/` and `.dev.vars`.
- **Acceptance:** `npm run dev -- --help` invokes wrangler pages dev; `git check-ignore .dev.vars` and `git check-ignore .wrangler` both match (real secrets never committed); `.dev.vars.example` exists and enumerates all four keys.
- **Validation:** Run the script help; run git check-ignore on both paths; inspect .dev.vars.example key set.
- **Notes:** package.json is a shared lock zone (Codex/Gemini also touch it later) — single-owner edit in this wave. Real .dev.vars is created locally by devs from the .example, never committed; this is the dev half of the config-secrets contract.

**T-003 · Create D1 database + migration 0001_init.sql (users, readings, indexes)**  
`data` · Cloud/backend (Copilot) · 2.5h · P0-W1/S0-A · deps: T-001  
- **Deliverable:** A D1 database created (name recorded; id wired into wrangler.toml) and `migrations/0001_init.sql` authoring users(id PK, email UNIQUE NOT NULL, created_at, last_seen_at) and readings(id PK, user_id FK→users ON DELETE CASCADE, node_id, node_label, mode, title, content, raw NULLABLE, favorite DEFAULT 0, created_at) plus idx_readings_user_time (user_id, created_at DESC) and idx_readings_user_fav (user_id, favorite) — field-for-field per the spec (readings = 1:1 superset of FolioEntry). birth_profiles is explicitly NOT in this migration (fast-follow).
- **Acceptance:** `wrangler d1 migrations apply <db> --local` completes; a schema query returns exactly tables users + readings; both named indexes exist; inserting a duplicate email fails on UNIQUE; deleting a user cascades its readings; NOT NULL/DEFAULT match spec. birth_profiles absent.
- **Validation:** Apply migration to local D1, then `wrangler d1 execute --local` SELECTs against sqlite_master + constraint-probe inserts (dup email, cascade delete).
- **Notes:** New file, single owner. This DDL is the source of truth for the Reading DTO (T-004) and the user upsert semantics (T-007); P3 CRUD builds on it. Keep column names snake_case exactly as spec so the contract maps field-for-field.

**T-004 · Freeze the shared API contract types (endpoint request/response DTOs)**  
`backend` · Planner/orchestrator (Claude) · 3h · P0-W1/S0-B · 🔒 · deps: none  
- **Deliverable:** A single shared TS module `src/lib/api/contract.ts` (imported by both the SPA and functions/ via relative path) defining request/response types for every endpoint: GET /api/me → {id,email}; ALL /api/selemene/* passthrough shape; GET /api/folio query {search?,favorites?} → Reading[]; POST /api/folio body {nodeId,nodeLabel,mode,title,content,raw?} → Reading; PATCH /api/folio/:id {favorite:boolean} → Reading; DELETE /api/folio/:id → {ok:true}; POST /api/folio/import (FolioEntry[]) → {imported:number,skipped:number}; a Reading DTO that is a 1:1 superset of the current FolioEntry; and a shared error envelope type. File carries a 'CONTRACT — frozen in Phase 0, change requires a Phase-0 revision' header.
- **Acceptance:** `tsc --noEmit` is green on the module; it import-compiles from an SPA file AND a functions/ file; a current FolioEntry value is assignable into the POST /api/folio request type (superset proven by a compile-time assignment check); every endpoint in the spec's Worker surface has a named request AND response type.
- **Validation:** tsc --noEmit on the contract file plus a throwaway import from both sides; a `const _: SaveReq = folioEntry` assignability check compiles.
- **Notes:** THE shared API-contract types file — the highest-value lock zone. selemeneApi.ts stays unchanged (still /api/selemene); folioStore.ts (P3, Codex) and the router (T-010, Copilot) both consume this. Freezing it before P1-P4 is what lets those phases run in parallel.

**T-005 · Define the typed Worker Env interface (D1 + secrets + vars)**  
`backend` · Cloud/backend (Copilot) · 1.5h · P0-W1/S0-A · 🔒 · deps: T-001  
- **Deliverable:** `functions/lib/env.ts` exporting the Worker Env interface: DB: D1Database, CF_ACCESS_AUD: string, CF_ACCESS_TEAM_DOMAIN: string, SELEMENE_API_KEY: string, SELEMENE_API_URL: string, and an optional dev-only marker field for the dev-identity guard (per T-008). @cloudflare/workers-types wired into functions tsconfig so D1Database/PagesFunction resolve.
- **Acceptance:** `tsc --noEmit` green; every Env member name matches a binding/var/secret declared in wrangler.toml exactly (a name-mismatch cross-check against T-001 fails the task); a `PagesFunction<Env>` stub compiles using the DB binding.
- **Validation:** tsc --noEmit on a PagesFunction<Env> stub; diff Env member names against wrangler.toml binding/var/secret names.
- **Notes:** Shared Env consumed by the router (T-010), all P1/P2/P3 handlers, and the V8 tests. Binding name DB and the four config keys must be byte-identical to T-001 or dev/prod bindings silently break.

**T-006 · Freeze the CF-Access verification contract (JWKS / aud / exp / claims + V8 matrix)**  
`backend` · Planner/orchestrator (Claude) · 3h · P0-W1/S0-B · deps: T-001  
- **Deliverable:** A frozen contract (doc + shared TS types AccessIdentity {sub?:string; email:string} and a claims type) specifying: JWKS URL = https://<CF_ACCESS_TEAM_DOMAIN>/cdn-cgi/access/certs; verify RS256 signature against the JWKS kid; require aud CONTAINS CF_ACCESS_AUD; require exp not in the past; read the token from the Cf-Access-Jwt-Assertion header OR the CF_Authorization cookie; REJECT unsigned / alg=none; consumed claims = email, sub, aud, exp, iss. Enumerates the V8 test matrix rows (valid → pass; wrong-aud, expired, bad-signature, unsigned → 401) with expected outcomes. Notes parity with the engine's crates/noesis-api/src/cf_access.rs.
- **Acceptance:** The doc lists each verification rule with an explicit pass/fail expectation and each V8 matrix row with its expected 401/200; the AccessIdentity + claims types are tsc-green and import-compile; a reviewer/P1 can implement functions/lib/cf-access.ts and the V8 tests directly from it with no open decisions.
- **Validation:** tsc --noEmit on the types; checklist review that all five V8 rows and all verify rules (sig, aud, exp, source, reject-unsigned) are pinned; cross-read against cf_access.rs behavior.
- **Notes:** Feeds P1 (T-015..T-029: cf-access.ts port + V8 tests) directly. 'Reject anything unsigned — trust ONLY CF-Access-verified identity' is the load-bearing invariant. Uses the var names from T-001 (hence the dep).

**T-007 · Pin the user_id derivation + upsert contract (resolve open question 1)**  
`backend` · Planner/orchestrator (Claude) · 2h · P0-W1/S0-B · deps: T-003, T-006  
- **Deliverable:** A frozen spec resolving spec open-question 1: user_id = CF Access `sub` when present and stable across logins; ELSE a deterministic SHA-256 hex digest of the lowercased, trimmed email (exact algorithm, encoding, and length pinned). Plus the users upsert semantics: INSERT with created_at + last_seen_at on first sight; ON CONFLICT update last_seen_at only. Includes ≥1 worked example (email → exact id string).
- **Acceptance:** The doc pins exactly ONE algorithm with a reproducible worked example (a one-off script reproduces the id string from the email); the sub-vs-hash branch condition is fully defined (no 'if stable' ambiguity); both the P1 identity upsert and the P3 ownership filter can reference this single doc without re-deciding.
- **Validation:** Reproduce the worked-example id with a throwaway SHA-256 script; confirm the upsert semantics match the users DDL columns from T-003.
- **Notes:** Adopts the spec's proposed resolution (sub-else-hash) — within scope since the approved spec proposes it. This single derivation must be shared by P1 (upsert) and P3 (per-user isolation V3) or users could fork identities across logins.

**T-008 · Freeze the prod-safe dev-identity-injection contract**  
`backend` · Planner/orchestrator (Claude) · 2h · P0-W1/S0-B · deps: T-005, T-006  
- **Deliverable:** A contract specifying how local `wrangler pages dev` injects a fake VERIFIED identity (e.g., honored ONLY when an explicit dev signal is set — a var/flag absent in Pages production — AND no real Access JWT is present), and the hard invariant that the production Worker path NEVER consults the dev injection: the guard is a single fail-closed conditional gated on a signal that cannot exist in prod, and any prod request lacking a real, JWKS-verified Access JWT → 401. Names the exact env signal and defines the fail-closed rule + the test hook Gemini uses for the no-dev-bypass-in-prod gate.
- **Acceptance:** The doc defines (a) the dev-only trigger condition, (b) the explicit guard that makes injection impossible in prod, (c) the test hook for the prod-bypass gate; a reviewer can point to the ONE conditional that fail-closes; the named dev signal is confirmed absent from wrangler.toml prod config.
- **Validation:** Review that the guard is single-point and fail-closed; confirm the dev signal name is not set in any prod/vars path; hand the test hook spec to Gemini for the P5 no-bypass gate.
- **Notes:** Directly satisfies locked decision 6 ('no dev-bypass leaks to prod'). Consumed by P1 (dev injection impl) and P5 (live no-bypass gate). Contract only — no code in P0.

**T-009 · Write the 9d9d CF-Access infra handoff doc (app / AUD / team / OTP / hostname)**  
`infra` · Planner/orchestrator (Claude) · 2h · P0-W1/S0-B · deps: T-001, T-006  
- **Deliverable:** A handoff doc capturing the maintainer's INFRA action in the 9d9d Cloudflare account: create a CF Access application on the urania Pages hostname, set the identity provider to email-OTP, and return the exact values the Worker needs — AUD tag → CF_ACCESS_AUD, team domain (<team>.cloudflareaccess.com) → CF_ACCESS_TEAM_DOMAIN. Resolves open-question 2 (the Pages/Access hostname). Includes a step-by-step checklist and a 'values needed by Worker' fill-in table with named blanks to paste post-config; marks this as the user's action (not code) and the explicit Phase-5 dependency.
- **Acceptance:** A maintainer could configure CF Access end-to-end from the doc without further questions; the doc has an explicit values-needed table (AUD, team domain) with named blanks mapped to the wrangler.toml var names; the hostname is decided and recorded; cross-links the verification contract (T-006).
- **Validation:** Checklist walkthrough for completeness (app, OTP IdP, AUD, team, hostname); confirm the table keys map 1:1 to CF_ACCESS_AUD/CF_ACCESS_TEAM_DOMAIN from T-001.
- **Notes:** CF Access config is the user's infra action, NOT code — this task tracks the handoff + the AUD/team values the Worker needs. Blocks the LIVE gates in P5 (T-065..T-079).

**T-010 · Build the Functions router skeleton with contract-shaped 501 stubs**  
`backend` · Cloud/backend (Copilot) · 3h · P0-W2/S0-C · 🔒 · deps: T-004, T-005  
- **Deliverable:** `functions/api/[[path]].ts` implementing the full route table (dispatch on method + path) for GET /api/me, ALL /api/selemene/*, GET/POST /api/folio, PATCH/DELETE /api/folio/:id, POST /api/folio/import — each returning a typed 501 Not Implemented stub whose shape already conforms to the frozen contract (T-004) and error envelope. Imports Env (T-005) and the contract types (T-004). NO auth, engine-proxy, or D1 logic yet.
- **Acceptance:** Under `wrangler pages dev`, curling each endpoint routes to the correct handler and returns 501 with the contract-shaped error envelope (NOT a generic 404); an unknown /api/* path returns 404; path params (:id) and the /api/selemene/* wildcard resolve to their handlers; `tsc --noEmit` green. Routing proven by one curl per endpoint.
- **Validation:** `wrangler pages dev` + a curl matrix hitting every route (correct method) asserting 501 + envelope shape, plus an unknown-path 404 and a wrong-method check.
- **Notes:** The functions router is a shared lock zone — P1/P2/P3 each fill in real handlers behind these exact routes. Shipping stubs that already match the contract lets those phases replace bodies without touching the routing surface.

**T-011 · Bring up local `wrangler pages dev` (SPA + Functions + local D1)**  
`infra` · Cloud/backend (Copilot) · 2h · P0-W2/S0-C · deps: T-001, T-002, T-003, T-010  
- **Deliverable:** A working `npm run dev` (wrangler pages dev) that serves the SPA build output + the Functions + binds the migrated local D1 (DB) + loads .dev.vars; documented dev URL and how SELEMENE_API_URL is pointed at the engine for local dev. Replaces the Vite-only dev flow for API work (Vite dev proxy note for /api/selemene left for P4 cleanup).
- **Acceptance:** One command boots the stack; the SPA loads at the dev URL; an /api/* call reaches a Function (501 stub) with the DB binding available in the request context; the bound local D1 is the one migrated by T-003. Proven by loading the page and curling an endpoint in the same running session.
- **Validation:** Boot `npm run dev`; open the dev URL (page renders); curl /api/me → 501 stub; confirm the DB binding is present and points at the migrated local D1.
- **Notes:** This is the local dev harness every subsequent phase develops against. Full Vercel delink (delete vercel.json/.vercel/) is P4 (T-055..T-064), not here — P0 only adds the Cloudflare path alongside.

**T-012 · Verify migration 0001 applies to a fresh local D1 (schema + idempotency)**  
`qa` · Validation (Gemini) · 1.5h · P0-W2/S0-E · deps: T-002, T-003  
- **Deliverable:** A repeatable, documented verification (command sequence or a checked-in check) that, from a clean .wrangler state, `wrangler d1 migrations apply <db> --local` applies 0001_init and the resulting schema matches the spec exactly — tables, columns, NOT NULL/DEFAULT/UNIQUE, the readings FK, and both indexes — with captured evidence.
- **Acceptance:** On a wiped local D1: migrate → schema query returns users + readings with the specified columns and both indexes; a second `migrations apply` is a no-op (migration ledger idempotent); a duplicate-email insert violates UNIQUE and a user delete cascades readings. Evidence (command output) captured.
- **Validation:** Delete .wrangler local D1 state, run migrate, run the schema + constraint-probe SQL, run migrate again to confirm no-op; save the output as evidence.
- **Notes:** Independent validation of T-003 by the validation agent (author != verifier). Feeds the phase exit gate (T-014) and de-risks P3's D1 CRUD.

**T-013 · Record the platform + frozen contracts in ISA.md and the product map**  
`product` · Planner/orchestrator (Claude) · 2.5h · P0-W2/S0-D · 🔒 · deps: T-004, T-006, T-007, T-008, T-009  
- **Deliverable:** ISA.md + docs/integrated-product-map.md updated to record the locked platform (Cloudflare Pages + Worker/Functions + D1 + CF-Access email-OTP, host moving Vercel→Pages) and to reference every frozen Phase-0 contract — the API contract types (T-004), the CF-Access verification contract (T-006), the user_id derivation (T-007), the prod-safe dev-identity guard (T-008), and the infra handoff (T-009) — as ISCs with stable IDs. No app behavior change.
- **Acceptance:** ISA has an ISC entry per frozen contract artifact, each with a stable ID pointing at the concrete file/doc; the product map reflects the Vercel→Pages platform + login-required model; a reader can navigate ISA → every Phase-0 contract file; the docs build/tsc are unaffected.
- **Validation:** Follow each ISA ISC link to its target artifact (all resolve); confirm the product map names Pages + Worker + D1 + CF-Access; run any docs/link check.
- **Notes:** ISA.md is a shared lock zone (later phases append ISCs) — single-owner edit here. Establishes the design-of-record so P1-P5 verification can trace back to frozen intent. Runs after the contracts it records are frozen.

**T-014 · Phase 0 EXIT gate: wrangler builds, migration applies, contracts tsc-green, dev serves**  
`qa` · Validation (Gemini) · 2h · P0-W2/S0-E · deps: T-001, T-002, T-003, T-004, T-005, T-006, T-007, T-008, T-009, T-010, T-011, T-012, T-013  
- **Deliverable:** A consolidated, runnable exit check proving all Phase-0 exit criteria in one documented sequence: (1) wrangler config builds / dev boots with the DB binding; (2) migration 0001 applies to a fresh local D1 with the correct schema (reuses T-012); (3) all frozen contract modules (T-004/T-005/T-006 types) are `tsc --noEmit` green; (4) `wrangler pages dev` serves the SPA + every /api route as its contract-shaped 501 stub, unknown path 404. Evidence recorded as the wave-boundary merge gate.
- **Acceptance:** The documented sequence runs green end-to-end: wrangler builds; d1 migrate applies with correct schema; tsc --noEmit green on the contract files; pages dev serves the SPA and each /api endpoint returns its 501 stub with unknown-path 404. ANY failing sub-check blocks the Phase-1 merge/start (green != done: the routes must actually respond, not just compile).
- **Validation:** Execute the full sequence on a clean checkout: wrangler build/dev, d1 migrate + schema probe, tsc on contract files, and the per-endpoint curl matrix; capture all outputs as the phase exit evidence bundle.
- **Notes:** The runnable exit gate for Phase 0 and the merge boundary. Gates Phase 1 (Auth & Identity, T-015..T-029). Contracts are FROZEN once this is green — later contract changes require a Phase-0 revision.


#### Phase 1 · Auth & Identity

**T-015 · Port cf_access.rs → cf-access.ts: JWKS fetch+cache + verify sig/aud/exp**  
`backend` · Cloud/Backend Engineer (Copilot) · 6h · P1.W1/P1.W1.S1 · 🔒 · deps: T-014  
- **Deliverable:** functions/lib/cf-access.ts exporting fetchJwks (in-memory TTL cache keyed by kid, refetch on cache miss) and verifyAccessJwt(token, {aud, teamDomain}) that validates RS256 signature against the Access JWKS, aud===AUD tag, and exp; throws a typed AccessVerifyError with a discriminant reason on any failure.
- **Acceptance:** A token signed by a test key whose public JWK is in the mock JWKS resolves with decoded claims; a token whose kid is absent from cache triggers exactly one JWKS refetch and then verifies; a wrong-signature, wrong-aud, or expired token each throws AccessVerifyError with the matching reason (asserted in T-021). Module is tsc-clean against the Phase-0 CF-Access verification contract types.
- **Validation:** Exercised by the T-021 mock-JWKS unit suite; `tsc --noEmit` green; behavior cross-checked against cf_access.rs (parity notes in-file).
- **Notes:** Direct port of Selemene crates/noesis-api/src/cf_access.rs. Consumes the CF-Access verification contract (JWKS URL, AUD, team domain, claim shape) frozen at the Phase-0 exit (T-001..T-014). No network in tests — mock JWKS only.

**T-016 · db.ts users upsert helper (create + last_seen_at update) on D1**  
`data` · Cloud/Backend Engineer (Copilot) · 4h · P1.W1/P1.W1.S2 · 🔒 · deps: T-014  
- **Deliverable:** functions/lib/db.ts exporting upsertUser(db, {id, email}) — INSERTs users(id,email,created_at,last_seen_at) with unix-ms timestamps, or on conflict updates only last_seen_at — plus getUserById. Targets the D1 binding and the users table from migration 0001.
- **Acceptance:** Against local D1 with migration applied: the first call for an identity creates exactly one row with created_at===last_seen_at; a second call with the same id leaves created_at unchanged and advances last_seen_at; the email UNIQUE constraint never throws for the same user. Verified in T-026.
- **Validation:** wrangler d1 execute SELECTs in T-026 confirm single-row + timestamp behavior; `tsc --noEmit` green.
- **Notes:** Phase 1 creates db.ts with users-only helpers; Phase 3 (T-040..) extends the SAME file with readings CRUD — keep exports additive to avoid a rewrite. Shared-file lock zone across phases.

**T-017 · Prod-safe dev-identity injection module (fail-closed)**  
`backend` · Cloud/Backend Engineer (Copilot) · 4h · P1.W1/P1.W1.S2 · deps: T-014  
- **Deliverable:** functions/lib/dev-identity.ts exporting maybeInjectDevIdentity(env, request) that returns a synthetic verified identity {sub,email} ONLY when env explicitly marks local dev (dev flag set AND no production marker); returns null on any ambiguity or in production.
- **Acceptance:** With the dev flag set it returns the configured {sub,email}; with the flag unset OR a production marker present it returns null, so the request path falls through to real JWT verification and a token-less request becomes 401. There is no configuration under which a production-marked Worker yields a synthetic identity (asserted in T-022).
- **Validation:** Unit-asserted in T-022 (dev-on vs prod-marker flip); conforms to the Phase-0 dev-identity-injection contract.
- **Notes:** Implements locked decision #6 (no dev-bypass reaches prod). New dedicated file — not a shared lock zone. The LIVE no-bypass proof is Phase 5.

**T-018 · Claims extraction + stable user_id derivation (sub else email-hash)**  
`backend` · Cloud/Backend Engineer (Copilot) · 3h · P1.W2/P1.W2.S1 · 🔒 · deps: T-015  
- **Deliverable:** Extend functions/lib/cf-access.ts with extractIdentity(claims) → {id, email}: id = claims.sub when present, else the hex sha-256 of the lowercased/trimmed email; email is normalized to lowercase.
- **Acceptance:** Given claims with a sub, id===sub; given claims without a sub, id is the deterministic sha-256 of the lowercased email and is byte-identical across repeated calls and across differing email casing/whitespace; the returned email is lowercase. Covered by T-021.
- **Validation:** Unit-asserted in T-021 (sub-present and sub-absent/casing cases).
- **Notes:** Resolves spec open-question #1. Edits cf-access.ts after T-015 has merged (W1→W2 boundary), so no concurrent edit of the shared file.

**T-019 · Router auth middleware: verify Access JWT or 401 (dev-injection non-prod only)**  
`backend` · Cloud/Backend Engineer (Copilot) · 5h · P1.W2/P1.W2.S1 · 🔒 · deps: T-015, T-017  
- **Deliverable:** In functions/api/[[path]].ts, a middleware run on every /api/* request that reads Cf-Access-Jwt-Assertion (header) or the CF_Authorization cookie, calls verifyAccessJwt, and attaches the identity to context; in non-prod it may substitute maybeInjectDevIdentity; missing/unsigned/invalid → 401 JSON (never a redirect).
- **Acceptance:** A request with no assertion and no dev flag → 401; a token that fails verify → 401; a valid token (or a dev identity in dev mode) proceeds with identity attached; a production env marker + missing token → 401 with no synthetic identity. Asserted in T-022 and exercised locally in T-026.
- **Validation:** T-022 unit tests (missing/forged/prod-marker paths) + T-026 local curl against wrangler pages dev.
- **Notes:** The sole trust boundary; the Phase-2 /api/selemene/* proxy and Phase-3 /api/folio/* CRUD are added behind this same gate. Router is a hot shared file — serialized under Copilot across W2→W3.

**T-020 · GET /api/me (identity + user upsert) + logout redirect**  
`backend` · Cloud/Backend Engineer (Copilot) · 4h · P1.W3/P1.W3.S1 · 🔒 · deps: T-016, T-018, T-019  
- **Deliverable:** Router handlers: GET /api/me → (middleware-verified) extractIdentity → upsertUser → respond {id,email}; GET|POST /api/logout → 302 to /cdn-cgi/access/logout. No JWT is written to or returned in the browser response.
- **Acceptance:** An authenticated GET /api/me returns {id,email} matching the verified claims and creates/updates exactly one users row (last_seen_at advanced on repeat); /api/logout responds 302 with Location: /cdn-cgi/access/logout; the response body contains no token. Proven in T-026 and the exit gate T-029.
- **Validation:** Local curl in T-026; consolidated run in T-029.
- **Notes:** Implements spec §4 auth-flow steps 3–5. Edits router after T-019 merged; sole router task in W3 to avoid same-wave file contention.

**T-021 · V8 core JWT-verification + identity unit tests (mock JWKS)**  
`qa` · Validation Engineer (Gemini) · 5h · P1.W3/P1.W3.S2 · 🔒 · deps: T-015, T-018  
- **Deliverable:** functions/__tests__/cf-access.test.ts with a mock JWKS and locally-signed tokens covering: valid→claims; wrong aud→reject; expired→reject; bad signature→reject; unsigned/alg=none→reject; tampered payload→reject; plus extractIdentity sub-present and email-hash (casing/whitespace) cases.
- **Acceptance:** Each of the six JWT cases asserts the exact resolve/throw outcome and the reject reason; identity cases assert deterministic ids; the suite is green in one command AND turns red if a verify branch is weakened (e.g. deleting the aud check makes wrong-aud stop throwing). This constitutes the V8 gate content.
- **Validation:** `npm test` runs the suite green once wired in T-028; failure injection confirmed to fail.
- **Notes:** Mock JWKS only, zero network. V8 of the 8 verification gates. Shares the test file with T-022/T-023 under one Gemini branch (serialized within the swarm). · AMENDED: enumerate the 6 JWT cases — valid-pass · wrong-aud→throw · expired→throw · unsigned/alg=none→throw · tampered-sig→throw · unknown-kid→refetch; assert alg=none cannot bypass signature verification.

**T-022 · No-dev-bypass-in-prod + auth-required negative-path tests**  
`qa` · Validation Engineer (Gemini) · 4h · P1.W3/P1.W3.S2 · 🔒 · deps: T-017, T-019  
- **Deliverable:** Tests asserting: (a) with a production env marker, maybeInjectDevIdentity returns null and the middleware rejects a token-less request with 401; (b) with the dev flag set, the dev identity is used (200 + identity); (c) missing header and missing cookie → 401; (d) forged/unsigned token → 401.
- **Acceptance:** The prod-marker + no-token case asserts 401 (proving no dev-bypass reaches prod); flipping env to dev flips the same request to 200-with-identity; all negative paths assert 401. Suite green. This locks decision #6 at the unit level.
- **Validation:** `npm test` green; the env-flip pair demonstrates the guard is real, not hard-coded.
- **Notes:** Unit-level guard for the dev-bypass rule; the LIVE production no-bypass check is Phase 5 (T-065..).

**T-023 · JWKS cache/rotation hardening + fail-closed tests**  
`qa` · Validation Engineer (Gemini) · 3h · P1.W3/P1.W3.S2 · 🔒 · deps: T-015  
- **Deliverable:** Tests (and any cf-access.ts hardening needed to pass them) for: cache hit within TTL performs no refetch; an unknown kid triggers exactly one refetch then verifies; a JWKS fetch failure fails closed (verify throws, never silently accepts); expired-cache triggers refetch.
- **Acceptance:** A spy asserts a second verify within TTL issues zero additional fetches; a rotated-kid token causes exactly one refetch then verifies; a simulated fetch error causes verify to throw (not resolve). Suite green.
- **Validation:** `npm test` green with fetch-spy assertions.
- **Notes:** Fail-closed is mandatory — a verifier that can't reach JWKS must reject, never admit. Any cf-access.ts fix routes through Copilot; test file shared with T-021/T-022 in the same swarm branch.

**T-024 · src/hooks/useMe.ts — read /api/me identity into the SPA**  
`frontend` · UI/App Engineer (Codex) · 3h · P1.W4/P1.W4.S1 · deps: T-020  
- **Deliverable:** src/hooks/useMe.ts that fetches GET /api/me on mount and returns {me: {id,email} | null, loading, error}, typed against the Phase-0 frozen shared API contract. No token is stored client-side (CF Access owns the session cookie).
- **Acceptance:** In the running app under wrangler pages dev with the dev identity, useMe resolves to the injected {id,email}; on a 401 it surfaces an unauthenticated/error state rather than throwing. Verified in T-029.
- **Validation:** Local render against wrangler pages dev; confirmed in the T-029 exit run.
- **Notes:** New file — not a shared lock zone. Types come from the Phase-0 shared API contract so this compiled against the freeze even before T-020 landed.

**T-025 · App chrome: signed-in identity display + logout link**  
`frontend` · UI/App Engineer (Codex) · 3h · P1.W4/P1.W4.S1 · 🔒 · deps: T-024  
- **Deliverable:** App-chrome addition that renders the signed-in email (from useMe) and a logout control that navigates to /cdn-cgi/access/logout.
- **Acceptance:** The running app shows the signed-in email; activating logout navigates to /cdn-cgi/access/logout (Access session teardown). Reading generation and the rest of the UI are visually/behaviorally unchanged. Verified in T-029.
- **Validation:** Local click-through under wrangler pages dev in the T-029 exit run.
- **Notes:** Minimal chrome only; spec §3 mandates the SPA UI is otherwise unchanged. App chrome is a shared component → lock zone.

**T-026 · Local identity proof: /api/me returns identity + single-row upsert (V2 groundwork)**  
`qa` · Validation Engineer (Gemini) · 3h · P1.W4/P1.W4.S2 · deps: T-020, T-017  
- **Deliverable:** A documented local procedure: bring up wrangler pages dev with the dev-identity flag, curl GET /api/me twice, and use wrangler d1 execute to inspect the users table; capture the outputs.
- **Acceptance:** /api/me returns the injected {id,email}; the users table holds exactly one row for that identity; created_at is stable across the two calls while last_seen_at advances; a curl with no assertion returns 401. Captured command output is the evidence.
- **Validation:** Saved curl + d1 SELECT output showing the single row and advancing timestamp.
- **Notes:** Local (not live) de-risking of V2 identity-mapping and single-row upsert; the LIVE V2 across two real OTP accounts is Phase 5.

**T-027 · Record auth/identity model in ISA.md + product map (Phase-1 ISCs)**  
`product` · Planner/Orchestrator (Claude) · 2h · P1.W4/P1.W4.S3 · 🔒 · deps: T-018, T-020  
- **Deliverable:** Update ISA.md and docs/integrated-product-map.md to record the login-required auth model, the stable user_id derivation (sub else lowercased-email sha-256), the prod-safe dev-identity contract, and the /api/me + logout surface; add Phase-1 ISCs tied to V2/V8.
- **Acceptance:** ISA reflects the implemented identity decisions with verifiable ISCs referencing V2 and V8; the product map shows CF Access → Worker → D1(users) for the identity slice; no stale 'anonymous / localStorage identity' language remains for this slice.
- **Validation:** Doc review + ISA CheckCompleteness against the tier gate.
- **Notes:** Planner/orchestrator-owned per agent ownership. ISA.md and the product map are shared lock zones — single Claude branch.

**T-028 · Wire the V8 suite into package.json + CI (one-command run)**  
`qa` · Validation Engineer (Gemini) · 3h · P1.W5/P1.W5.S1 · 🔒 · deps: T-021, T-022, T-023  
- **Deliverable:** Add the test runner (vitest) config + a `test` script to package.json that discovers functions/__tests__, and wire the same command into CI so the V8 suite runs on every build.
- **Acceptance:** `npm test` (documented command) discovers and runs cf-access.test.ts with all cases green; the CI job runs the identical command and fails the build if any V8 case regresses. Demonstrated by a green run and a deliberately-broken case turning CI red.
- **Validation:** CI run log + local `npm test` output, both green; one injected failure confirmed to fail CI.
- **Notes:** package.json is a shared lock zone — keep the script additive and avoid clobbering existing scripts. CI wiring here is scoped to unit tests; the live gate wiring is Phase 4/5.

**T-029 · Phase-1 EXIT GATE: /api/me identity locally + V8 green (consolidated run)**  
`qa` · Validation Engineer (Gemini) · 4h · P1.W5/P1.W5.S1 · deps: T-020, T-024, T-025, T-026, T-028  
- **Deliverable:** A single runnable Phase-1 gate procedure plus a short captured-evidence note that blocks Phase 2 until green.
- **Acceptance:** All five observable checks pass and are captured: (1) `npm test` runs the V8 suite fully green (six JWT cases + identity derivation); (2) `wrangler pages dev` boots and GET /api/me returns {id,email} for the injected dev identity; (3) exactly one users row exists in local D1 with last_seen_at advancing on a repeat call; (4) a request lacking a valid Access JWT under a production marker returns 401 (no dev-bypass); (5) the SPA shows the signed-in email and a working logout link to /cdn-cgi/access/logout.
- **Validation:** The five checks executed and logged as evidence; gate is red if any single check fails (green != done).
- **Notes:** EXIT gate for Phase 1 (spec: '/api/me returns identity locally; V8 green'). LIVE V1–V4 (real OTP, two accounts, cross-device) remain Phase 5 and are explicitly NOT claimed here.


#### Phase 2 · Engine Proxy Migration

**T-030 · Port api/proxy.ts forwarding into functions/lib/engine-proxy.ts**  
`backend` · Cloud/Backend (Copilot) · 4h · P2.W1/P2.S1 · deps: T-014  
- **Deliverable:** functions/lib/engine-proxy.ts exporting forwardToEngine(req, {apiKey, baseUrl}) that reconstructs the upstream request against SELEMENE_API_URL — preserving method, the /api/selemene/* path suffix, query string, safe headers, and request body — and returns the engine Response unbuffered (streaming passthrough). No key/auth logic lives here (the caller injects it).
- **Acceptance:** Invoked with a stubbed fetch and a sample /api/selemene/<path>?q=1 POST, forwardToEngine issues exactly one upstream call to SELEMENE_API_URL whose method, resolved path suffix, query, and body byte-match the inbound request, and returns the engine Response object without buffering it.
- **Validation:** Unit test with a mocked fetch asserting the outbound URL/method/body shape and unbuffered return; tsc-green against the frozen Phase-0 shared-contract types.
- **Notes:** Mirrors the semantics of the current Vercel api/proxy.ts forwarding. New single-owner file — not a shared lock zone. Depends on Phase-0 exit (T-014) for the Worker skeleton, SELEMENE_API_URL var, and frozen endpoint contract.

**T-031 · Wire /api/selemene/* route: verify Access -> inject key -> forwardToEngine**  
`backend` · Cloud/Backend (Copilot) · 4h · P2.W1/P2.S1 · 🔒 · deps: T-030, T-029, T-014  
- **Deliverable:** A handler mounted on ALL methods of /api/selemene/* in the Functions router that (1) runs the Phase-1 CF Access verify (signature/aud/exp) + prod-safe dev-identity path, (2) reads SELEMENE_API_KEY and SELEMENE_API_URL from env, (3) calls forwardToEngine injecting the key on the upstream request. This route supersedes api/proxy.ts as the sole engine entrypoint.
- **Acceptance:** Under wrangler pages dev with a valid dev identity, POST /api/selemene/<engine-endpoint> returns the engine's response body/status; the identical request with a missing or invalid Cf-Access-Jwt-Assertion returns 401 and produces no upstream engine call.
- **Validation:** Local curl through wrangler pages dev: authed request returns 200 + engine body, unauthed returns 401; the stub/engine access log shows the upstream request only for the authed call.
- **Notes:** Shared functions router — lock_zone. Reuses cf-access.ts and dev-identity injection from Phase 1 (T-029) and Phase-0 secrets/skeleton (T-014). Engine remains stateless shared-key; no per-user engine auth.

**T-032 · Header & key hygiene on the proxy route (trust boundary)**  
`backend` · Cloud/Backend (Copilot) · 3h · P2.W1/P2.S1 · 🔒 · deps: T-031  
- **Deliverable:** Route logic that ignores any client-supplied engine credentials (x-api-key/Authorization), injects SELEMENE_API_KEY only on the upstream call, forwards only safe headers (content-type/accept), and preserves the upstream status, content-type, and streaming on the way back — the key never crosses back to the client.
- **Acceptance:** A request carrying a spoofed x-api-key still reaches the engine authenticated with the server's real key (spoof ignored); grep of every client-visible response header and body confirms the SELEMENE_API_KEY string is absent.
- **Validation:** Local test asserting the injected key on the (mocked) upstream headers and its absence from the client-facing response; spoofed-header request still succeeds with the server key.
- **Notes:** Trust-boundary hardening; edits the same router/route handler (lock_zone). Key must be strictly server-side.

**T-033 · Error, timeout, and streaming edge mapping on the proxy route**  
`backend` · Cloud/Backend (Copilot) · 3h · P2.W1/P2.S1 · 🔒 · deps: T-031  
- **Deliverable:** Route behavior that passes engine 4xx/5xx status+body through unaltered, maps upstream timeout/network failure to a deterministic 502/504 (no hang), and streams chunked/SSE engine responses incrementally without buffering.
- **Acceptance:** An engine 500 arrives at the client with status 500 and identical body; a simulated upstream hang yields a 504 rather than blocking; a chunked engine response is delivered incrementally (first bytes arrive before the stream ends).
- **Validation:** Local tests against a stub engine returning 500, a hanging endpoint, and a chunked stream; assert status/body passthrough, the timeout mapping, and incremental delivery.
- **Notes:** Preserves the current api/proxy.ts passthrough behavior so downstream parity (V5) holds. Same router/route file (lock_zone).

**T-034 · Repoint taxonomy.mjs base at the Worker with prod-safe dev identity**  
`qa` · Validation (Gemini) · 3h · P2.W2/P2.S2 · deps: T-031, T-032  
- **Deliverable:** taxonomy.mjs derives its API base from an env/flag pointed at the local wrangler pages dev Worker and attaches the Phase-0/1 prod-safe dev-identity header for the run (base passed via env — no package.json edit).
- **Acceptance:** taxonomy.mjs executed against the Worker base completes and its emitted taxonomy output is diff-empty versus the same script run against the direct engine.
- **Validation:** Run taxonomy.mjs twice (direct-engine baseline vs Worker) and diff the outputs; identical.
- **Notes:** Single-owner script. Dev identity must be the prod-safe injection defined in Phase 0/1 — never a prod bypass. Base via env var to avoid touching the shared package.json lock zone.

**T-035 · Repoint daily-gates.mjs base at the Worker with prod-safe dev identity**  
`qa` · Validation (Gemini) · 3h · P2.W2/P2.S2 · deps: T-031, T-032  
- **Deliverable:** daily-gates.mjs base repointed at the local wrangler pages dev Worker with the prod-safe dev identity injected (base via env/flag; no package.json edit).
- **Acceptance:** daily-gates.mjs passes against the Worker base and its pass/fail results and emitted daily reading are diff-empty versus the direct-engine baseline.
- **Validation:** Run daily-gates.mjs against the Worker and compare results + emitted reading to the direct-engine baseline; identical.
- **Notes:** Exercises the just-shipped daily-panchanga compute (src/lib/daily/*) through the Worker proxy. Single-owner script.

**T-036 · Verify selemeneApi.ts unchanged; SPA generate path works via the Worker**  
`frontend` · UI/App (Codex) · 2h · P2.W2/P2.S3 · deps: T-031  
- **Deliverable:** Evidence that src/lib/selemeneApi.ts is byte-for-byte unchanged (still targeting /api/selemene) and that the SPA reading-generation flow works end-to-end against the Worker under wrangler pages dev.
- **Acceptance:** git diff --stat on src/lib/selemeneApi.ts is empty; generating a reading in the running SPA (served/proxied through the Worker) returns content identical to the pre-migration app.
- **Validation:** git diff shows no change to selemeneApi.ts; a browser/e2e reading generation through wrangler pages dev succeeds with matching content.
- **Notes:** selemeneApi.ts must stay byte-identical (assert-unchanged guard, no edit). Dev runs via wrangler pages dev to avoid touching vite.config.ts; any vite dev-proxy repoint is a shared-file change owned by Phase 4 (vite/dev docs), not this phase.

**T-037 · V5 compute-unchanged gate through the Worker**  
`qa` · Validation (Gemini) · 4h · P2.W3/P2.S4 · deps: T-034, T-035, T-038  
- **Deliverable:** A V5 gate that runs taxonomy.mjs + daily-gates.mjs against the Worker and asserts both structural/byte identity versus the captured direct-engine baseline, recording diff artifacts as evidence.
- **Acceptance:** Both scripts pass against the Worker AND their outputs diff-empty against the direct-engine baseline; any drift fails the gate (script pass alone does not satisfy V5).
- **Validation:** Attached baseline-vs-Worker diff artifacts show zero differences; gate exits 0; result documented in the evidence bundle.
- **Notes:** V5 = compute-unchanged. Green scripts are necessary but not sufficient — parity to the baseline is the real bar. · AMENDED: reorder so T-038 (golden-parity capture) precedes this V5 gate — resolve the forward dep.

**T-038 · Golden parity capture for engine responses**  
`qa` · Validation (Gemini) · 3h · P2.W3/P2.S4 · deps: T-032, T-033  
- **Deliverable:** A small deterministic-seed corpus of engine requests captured direct-to-engine (baseline) and via the Worker, plus a diff over status, content-type, streaming shape, and reconstructed body — committed as golden fixtures.
- **Acceptance:** For every seed, the Worker response equals the baseline on status, content-type, and body (streamed responses concatenate to identical bytes); the diff report shows zero differences.
- **Validation:** Committed golden fixtures and a diff report demonstrating 0 differences across the seed corpus.
- **Notes:** Strengthens V5 beyond script pass/fail and pins the header/error/streaming behavior from T-032/T-033. Deterministic seeds keep runs comparable.

**T-039 · Phase 2 exit gate: engine compute served through the Worker, V5 green**  
`qa` · Validation (Gemini) · 3h · P2.W3/P2.S4 · deps: T-031, T-032, T-033, T-036, T-037, T-038  
- **Deliverable:** A single runnable gate (scripts/verify entry or documented runbook) that boots wrangler pages dev, generates a real reading through /api/selemene/*, runs V5, and asserts key-never-leaks and selemeneApi.ts-unchanged, emitting a consolidated evidence bundle.
- **Acceptance:** One command/runbook yields, in a single local pass: an authed reading generated via the Worker (200, correct content), an unauthed request rejected 401, V5 diffs empty, the SELEMENE_API_KEY absent from all client traffic, and an empty git diff on selemeneApi.ts — all green.
- **Validation:** Recorded run output plus the evidence bundle, reproducible via the documented command.
- **Notes:** Runnable Phase-2 exit gate. Green != done: it must show parity + no-key-leak, not merely 200s. Live prod OTP verification (V1-V4) is Phase 5; this gate is local via wrangler pages dev.


#### Phase 3 · Readings Storage & Folio Migration

**T-040 · functions/lib/db.ts — typed user-scoped readings data-access layer**  
`backend` · Cloud/backend (Copilot) · 5h · P3-W1/P3-S1 · deps: T-014, T-029  
- **Deliverable:** functions/lib/db.ts: a typed D1 data-access module for the readings table exposing create, listByUser(with search + favorite filters), getById, updateFavorite, delete, and bulkImport — every method takes and binds a user_id parameter; row⇄DTO mapping aligned to the Phase-0 frozen contract types.
- **Acceptance:** Given two users seeded in a local D1, listByUser returns only the caller's rows ordered by created_at desc; the search argument filters by title/content substring; the favorites argument returns only favorite=1; getById/updateFavorite/delete return null/false (no mutation) when the row is owned by a different user_id.
- **Validation:** Exercised via `wrangler d1 execute` smoke queries against a local D1 seeded with two users' rows; scoping/filter behavior additionally locked by the T-052 unit suite (mutation-sanity: flipping a scope turns a test red).
- **Notes:** Depends on the Phase-0 exit (T-014: readings schema + frozen contract types + Worker skeleton) and Phase-1 exit (T-029: identity/user_id available in request context via user upsert). New file — not a shared lock zone.

**T-041 · GET /api/folio — list with search + favorites filters (user-scoped)**  
`backend` · Cloud/backend (Copilot) · 4h · P3-W1/P3-S1 · 🔒 · deps: T-040  
- **Deliverable:** GET /api/folio route registered in the Worker router: parses ?search= and ?favorites= query params, calls db.listByUser with the derived user_id, returns a contract-shaped JSON array of the authenticated user's readings.
- **Acceptance:** Under dev identity A, GET /api/folio returns only A's readings; ?favorites=true narrows to favorites; ?search=<term> narrows to title/content matches; the response validates against the frozen list-response type.
- **Validation:** `curl` under `wrangler pages dev` with prod-safe dev-identity injection for two users; response shape asserted against the frozen contract types (tsc + runtime shape check).
- **Notes:** Touches the shared Worker folio router — serialized within P3-S1 after T-040; merges before T-042 branches.

**T-042 · POST /api/folio — save reading**  
`backend` · Cloud/backend (Copilot) · 3h · P3-W1/P3-S1 · 🔒 · deps: T-041  
- **Deliverable:** POST /api/folio route: validates body {nodeId,nodeLabel,mode,title,content,raw?}, inserts via db.create with the derived user_id and server-set id/created_at/favorite=false, returns the created reading.
- **Acceptance:** POST returns 201 with the created reading (server-assigned id + created_at); the row appears in a subsequent GET /api/folio for the same identity and NOT for a second identity; a body missing required fields returns 400 with no row written.
- **Validation:** `curl` POST→GET round-trip under two dev identities; malformed-body case asserts 400 and unchanged row count via `wrangler d1 execute`.
- **Notes:** Shared folio router edit — serialized after T-041 within P3-S1. readings is a 1:1 superset of today's FolioEntry, so no contract change here (contract frozen in Phase 0).

**T-043 · PATCH + DELETE /api/folio/:id — favorite toggle and delete with ownership guard**  
`backend` · Cloud/backend (Copilot) · 4h · P3-W1/P3-S1 · 🔒 · deps: T-042  
- **Deliverable:** PATCH /api/folio/:id (set/toggle favorite) and DELETE /api/folio/:id routes, both enforcing row ownership by user_id before mutating.
- **Acceptance:** The owner can toggle favorite (reflected in GET ?favorites=true) and delete (row disappears from GET); a second identity issuing PATCH or DELETE against the first user's reading id receives 404/403 and the row is provably unchanged in D1.
- **Validation:** `curl` cross-identity PATCH/DELETE attempts asserting 404/403 + unchanged row via `wrangler d1 execute`; feeds the V3 isolation gate (T-050).
- **Notes:** Shared folio router edit — serialized after T-042 within P3-S1. Ownership guard is the core of V3 for mutations.

**T-044 · POST /api/folio/import — idempotent localStorage import**  
`backend` · Cloud/backend (Copilot) · 5h · P3-W1/P3-S1 · 🔒 · deps: T-043  
- **Deliverable:** POST /api/folio/import route: accepts an array of legacy FolioEntry objects and idempotently upserts them into D1 for the authenticated user using a stable dedupe key (legacy id, else a content hash), returning counts {imported,skipped}.
- **Acceptance:** Importing the same payload twice yields identical row count the second time (imported==0, skipped==total); imported rows appear in GET /api/folio; an import by user A leaves user B's rows untouched.
- **Validation:** `curl` import twice comparing D1 row counts; per-user scoping checked with a second identity; feeds the V6 gate (T-051).
- **Notes:** Shared folio router edit — serialized after T-043 within P3-S1. Idempotency is server-enforced so repeated client triggers are safe. birth_profiles is out of scope (fast-follow).

**T-045 · Refactor folioStore.ts internals localStorage→fetch (same signatures, async save)**  
`frontend` · UI/app (Codex) · 6h · P3-W1/P3-S2 · 🔒 · deps: T-014  
- **Deliverable:** src/lib/folioStore.ts internals rewired from localStorage 'urania137.folio.v1' to fetch('/api/folio/*'); exported signatures unchanged (list, favorites, search, saveReport) except saveReport now returns a Promise; requests/responses typed against the Phase-0 frozen contract.
- **Acceptance:** Every existing import site compiles unchanged except awaiting saveReport; list/favorites/search resolve data sourced from GET /api/folio; the store's runtime path has no remaining reads/writes of localStorage key 'urania137.folio.v1' except the one-time import read used by T-048.
- **Validation:** `tsc` green; grep confirms no localStorage.setItem in the folioStore runtime path; manual Folio flow under `wrangler pages dev` shows data coming from the API.
- **Notes:** LOCK ZONE (src/lib/folioStore.ts) — single owner, single branch. Built against the frozen contract in parallel with the backend swarm; real integration proven in Wave 2. selemeneApi.ts stays UNCHANGED. · AMENDED: own the load/refresh entry point that fills the synchronous getFolioSnapshot cache from GET /api/folio and notifies subscribers (useSyncExternalStore stays sync); move search/favorites to server-side ?search=/?favorites=.

**T-046 · FolioPanel — loading/empty/error states over D1-backed list/search/favorites**  
`frontend` · UI/app (Codex) · 5h · P3-W1/P3-S2 · 🔒 · deps: T-045  
- **Deliverable:** src/components/panels/FolioPanel.tsx updated for the async data source: loading skeleton, empty state, and error state, with list/search/favorites wired to the refactored folioStore.
- **Acceptance:** The panel shows a loading state while fetching, renders the user's D1 readings, filters live on search input and favorites toggle, shows an error state when the API returns non-200, and reflects save/delete/favorite actions immediately.
- **Validation:** Manual UI walkthrough under `wrangler pages dev`, including a throttled and a forced-failed request to demonstrate loading and error states; screenshots captured as evidence.
- **Notes:** LOCK ZONE (src/components/panels/FolioPanel.tsx) — single owner, single branch, sequential after T-045 within P3-S2.

**T-047 · Await async saveReport in report/daily hooks**  
`frontend` · UI/app (Codex) · 3h · P3-W1/P3-S2 · deps: T-045  
- **Deliverable:** useReportGenerator, useDeterministicRun, and useDailyReading updated to await the now-async folioStore.saveReport, surfacing save pending/error state without changing generation behavior.
- **Acceptance:** Generating a report or daily reading awaits the D1 save, the new reading appears in Folio without a reload, a save failure surfaces an error (not a silent drop), and there is no double-save.
- **Validation:** Manual generate→save→appears-in-Folio for each of the three hook paths under `wrangler pages dev`; a forced save failure shows the error surface.
- **Notes:** Hook files are outside the declared lock list but share the async contract from T-045 — sequenced after it within P3-S2. The daily-panchanga path (useDailyReading) just shipped and already calls saveReport. · AMENDED: cover ALL THREE saveReport callers — useReportGenerator, useDailyReading, AND src/hooks/useDeterministicRun.ts (2 call sites) — awaiting the now-async save; T-049 asserts a deterministic-run reading persists with no floating-promise drop.

**T-048 · One-time localStorage→D1 import trigger (client)**  
`frontend` · UI/app (Codex) · 4h · P3-W1/P3-S2 · 🔒 · deps: T-045  
- **Deliverable:** A one-time client migration module: on first authenticated load, detect legacy localStorage 'urania137.folio.v1', POST its entries to /api/folio/import once, then set a migrated guard flag so it never re-runs.
- **Acceptance:** A user with legacy localStorage entries sees them in the D1-backed Folio after first load; the import fires at most once (guard prevents a re-POST on reload); a user with no legacy data triggers no import call.
- **Validation:** Seed localStorage, load twice, assert a single import request in the network tab and no duplicate rows; live idempotency proven together with the server guard in T-051.
- **Notes:** Coded against the frozen import contract (T-014) in Wave 1; the cross-swarm integration with the real endpoint (T-044) is verified in Wave 2 (T-051), keeping merges at wave boundaries. New module — coordinates with folioStore but does not co-edit its lock zone.

**T-049 · Local end-to-end persistence round-trip under wrangler pages dev**  
`qa` · Validation (Gemini) · 4h · P3-W2/P3-S3 · deps: T-039, T-044, T-046, T-047  
- **Deliverable:** A verified local end-to-end path under `wrangler pages dev` with local D1 + engine proxy: generate a reading → folioStore.saveReport → D1 readings row → FolioPanel list/search/favorite/delete round-trip.
- **Acceptance:** A freshly generated reading persists as a D1 row and survives a full page reload; search, favorite-toggle, and delete all round-trip through the UI against D1.
- **Validation:** Scripted/manual run under `wrangler pages dev`; `wrangler d1 execute` confirms the persisted row; reload confirms durability (cross-session persistence within the local identity).
- **Notes:** Depends on Phase-2 exit (T-039: reading generation flows through the Worker /api/selemene proxy) plus this phase's save (T-044), panel (T-046), and hooks (T-047). All Wave-1 deps are merged before this runs.

**T-050 · V3 — per-user isolation verification (two identities)**  
`qa` · Validation (Gemini) · 4h · P3-W2/P3-S3 · deps: T-043, T-049  
- **Deliverable:** V3 per-user isolation verification across two dev identities: an automated check that a second user can neither list nor mutate the first user's readings, plus captured evidence.
- **Acceptance:** User B's list never contains A's readings; B's GET/PATCH/DELETE against A's reading id return not-found/forbidden and leave A's row provably unchanged in D1; results recorded as V3 evidence.
- **Validation:** Automated test hitting the folio endpoints as two dev identities with `wrangler d1 execute` row assertions; evidence archived. (Live V3 across two real OTP accounts is confirmed in Phase 5.)
- **Notes:** Exercises the ownership guard from T-043 and list scoping from T-041 over the integrated stack (T-049).

**T-051 · V6 — import idempotency verification**  
`qa` · Validation (Gemini) · 3h · P3-W2/P3-S3 · deps: T-044, T-048, T-049  
- **Deliverable:** V6 import-idempotency verification: an automated double-import test plus edge-case coverage, with captured evidence.
- **Acceptance:** Running the import twice yields zero duplicate rows (second run imported==0); empty, legacy, and malformed localStorage payloads are handled without error; per-user scoping is preserved during import.
- **Validation:** Automated double-import against the live local endpoint plus malformed/empty payload cases; `wrangler d1 execute` row-count assertions; evidence archived.
- **Notes:** Covers both the client one-time trigger (T-048) and the server dedupe guard (T-044) end-to-end.

**T-052 · db-layer + folio-route unit/contract tests (mock/local D1)**  
`qa` · Validation (Gemini) · 4h · P3-W2/P3-S3 · 🔒 · deps: T-040, T-041, T-042, T-043, T-044  
- **Deliverable:** A Vitest suite for functions/lib/db.ts and the folio route handlers against local/mock D1 (miniflare) covering user-scoping, search/favorites filters, ownership guards on get/update/delete, and import dedupe.
- **Acceptance:** The suite runs via `vitest run` (wired into `npm test`) and turns red if any query drops its user_id scope or an ownership guard is removed — deliberately breaking a scope produces a failing test.
- **Validation:** `vitest run` green in a CI-style invocation; mutation-sanity: reverting a scope/guard makes a specific test fail.
- **Notes:** LOCK ZONE (package.json) — adds test tooling/scripts. Complements the live V3 (T-050) with fast unit coverage of the data layer.

**T-053 · Contract conformance — folio responses/requests match the frozen shared types**  
`qa` · Validation (Gemini) · 3h · P3-W2/P3-S3 · deps: T-041, T-042, T-043, T-044, T-045  
- **Deliverable:** A conformance check asserting that Worker folio responses and folioStore requests bind to the Phase-0 frozen shared API-contract types at compile time and match at runtime for a sample of each endpoint.
- **Acceptance:** `tsc` is green across SPA + Worker using the shared types with no `any` casts at the boundary; a runtime shape assertion on a sample response from each folio endpoint passes; a deliberately introduced field-type drift fails the check.
- **Validation:** `tsc` + runtime shape assertions in the test run; drift-injection test proves the check bites.
- **Notes:** The shared contract types file is owned by Phase 0 (Claude) and is NOT edited here — this task only verifies conformance to the frozen contract from both sides of the trust boundary.

**T-054 · Phase 3 exit gate — per-user D1 persistence + Folio round-trip + import (runnable)**  
`qa` · Validation (Gemini) · 3h · P3-W2/P3-S3 · deps: T-049, T-050, T-051, T-052, T-053  
- **Deliverable:** The runnable Phase-3 exit-gate checklist plus a consolidated evidence bundle proving readings persist per-user in D1 locally and that Folio round-trips and import work.
- **Acceptance:** A single runnable checklist passes end-to-end locally: persist+reload durability, list/search/favorite/save/delete round-trip, V3 green, V6 green, contract-conformance green, and `tsc`/`vitest run` green — with evidence linked.
- **Validation:** Exit checklist executed under `wrangler pages dev` + local D1; every sub-gate reports green; evidence archived for the ISA/product-map. Live V1–V4 remain Phase-5 scope.
- **Notes:** Runnable exit gate for Phase 3 (green != done — the checklist must actually execute). Gates entry to Phase 4 (Vercel delink) and the Phase-5 live verification.


#### Phase 4 · Vercel Delink & Pages CI/CD

**T-055 · Delete Vercel serverless/routing artifacts and purge Vercel deps**  
`infra` · Cloud/Backend (Copilot) · 3h · 4A/S4A-1 · 🔒 · deps: T-039, T-054  
- **Deliverable:** Removal of api/proxy.ts, vercel.json, and .vercel/ from the repo, plus package.json purged of all Vercel-only dependencies (e.g. @vercel/node) and Vercel scripts, with the lockfile regenerated.
- **Acceptance:** `git ls-files` lists none of api/proxy.ts, vercel.json, or .vercel/; `grep -rIn '@vercel\|vercel.json\|api/proxy' src api package.json` returns no live references; `npm ci && npm run build` completes green and the SPA still builds and loads.
- **Validation:** CI runs the grep + clean build; reviewer confirms zero matches and a green build with no Vercel packages resolved.
- **Notes:** Deletion is safe only because Phase 2 (T-039) moved the proxy logic into the Worker and Phase 3 (T-054) moved Folio to D1 — no runtime path still targets the Vercel serverless function. · AMENDED: also repoint the hardcoded https://urania-137.vercel.app targets in package.json verify:daily/verify:all/verify:taxonomy to the Pages URL.

**T-056 · Retire Vite dev-proxy; make `wrangler pages dev` the single local entrypoint**  
`frontend` · UI/App (Codex) · 2h · 4A/S4A-2 · 🔒 · deps: T-039  
- **Deliverable:** vite.config.ts dev `server.proxy` entry for /api/selemene removed (or repointed at the wrangler pages dev port), with `wrangler pages dev` established as the single local entrypoint serving both the SPA and /api Functions; selemeneApi.ts left byte-for-byte unchanged.
- **Acceptance:** Under `wrangler pages dev` the SPA loads and a reading generated in the UI reaches the engine via /api/selemene served by the Function (network tab shows 200 from the Function, not a Vite proxy); `grep -n selemene vite.config.ts` shows no stale Vercel/remote proxy target.
- **Validation:** Codex demonstrates local reading generation through `wrangler pages dev`; Gemini confirms in the local V5 smoke run.
- **Notes:** Per the locked design selemeneApi.ts stays unchanged (still targets /api/selemene); only the local dev routing mechanism changes.

**T-057 · Configure Cloudflare Pages build (SPA + Functions)**  
`infra` · Cloud/Backend (Copilot) · 4h · 4B/S4B-1 · 🔒 · deps: T-055, T-014  
- **Deliverable:** Cloudflare Pages build settings authored (build command, output/dist directory, Functions directory) and wrangler config aligned so a single build emits the SPA static assets plus the /api/* Pages Functions.
- **Acceptance:** A Pages build (via `wrangler pages deploy --dry-run` or a preview deploy) completes; the built output contains the SPA index and compiled Functions; the preview root returns the SPA HTML and /api/me is served by a Function (reachable route, not a 404/static fallback).
- **Validation:** Copilot runs a preview build/deploy; reviewer inspects the build log and the preview URL for SPA + Function responses.
- **Notes:** CF Access gating is NOT required for this task — an ungated preview is acceptable. Auth-required (V1) is verified live in Phase 5 on the user's 9d9d config.

**T-058 · Wire deploy pipeline: D1 migrations apply + pages deploy**  
`infra` · Cloud/Backend (Copilot) · 5h · 4B/S4B-1 · 🔒 · deps: T-057, T-014, T-054, T-080  
- **Deliverable:** A CI/CD pipeline (GitHub Actions or Pages CI) that on the deploy branch runs `wrangler d1 migrations apply <db> --remote` then `wrangler pages deploy`, with migrations applied before/atomically with the deploy, plus the deploy npm scripts.
- **Acceptance:** A push to the deploy branch triggers a pipeline that applies migration 0001 to the remote D1 (`wrangler d1 migrations list --remote` shows 0001 applied) and publishes a Pages deployment returning HTTP 200/302 at its URL; re-running the pipeline is idempotent (no duplicate migration, no failure).
- **Validation:** Copilot/Gemini inspect the Actions run logs plus `wrangler d1 migrations list --remote`; a second run stays green with no duplicate migration.
- **Notes:** Uses a scoped Cloudflare API token stored as a CI secret; token provisioning is a user/infra handoff tracked in the Phase 0 CF-Access/infra doc. · AMENDED: `wrangler d1 export` snapshot before remote apply + a documented 0001 rollback; depends on T-080 (remote D1 provisioning).

**T-059 · Configure production secrets/vars and assert no dev-bypass in prod**  
`infra` · Cloud/Backend (Copilot) · 3h · 4B/S4B-1 · 🔒 · deps: T-057, T-029, T-014  
- **Deliverable:** Production Pages environment configured with SELEMENE_API_KEY, SELEMENE_API_URL, and Access AUD/team vars (as Pages secrets/vars, never committed), plus a build/runtime guard disabling the prod-safe dev-identity injection in production.
- **Acceptance:** On the deployed app, /api/selemene forwards with the injected key (a reading generates once an Access identity is present) and NO dev-identity header/bypass is honored in production (a request that triggers the dev identity locally is rejected/ignored in prod); `git grep` finds no secret values in the repo.
- **Validation:** Gemini exercises the dev-bypass against the deployed app and confirms it fails (feeds the Phase 5 no-dev-bypass gate); reviewer confirms secrets live only in the Pages env.
- **Notes:** Touches wrangler.toml [vars] only for non-secret Access AUD/team; secrets are set via `wrangler pages secret`/dashboard. The no-dev-bypass gate is fully verified live in Phase 5.

**T-060 · Update dev + deploy docs to the wrangler pages workflow**  
`product` · Planner/Orchestrator (Claude) · 3h · 4B/S4B-2 · deps: T-014, T-056  
- **Deliverable:** README/CONTRIBUTING (or docs/dev) updated: local development via `wrangler pages dev` (Functions + local D1 + engine proxy), environment/secrets setup, a deploy runbook (migrations + pages deploy), and a pointer to the Phase 0 CF Access infra handoff doc.
- **Acceptance:** A contributor following only the updated docs can, from a clean clone, run the app locally through `wrangler pages dev` and generate a reading; the docs contain no remaining Vercel or `vercel dev` instructions (grep clean).
- **Validation:** Gemini/Codex dry-runs the documented steps on a clean checkout and generates a reading; grep confirms no Vercel references remain in docs.
- **Notes:** Authored against the locked deploy design (validated by the V7 gate in Wave 4C); references but does not duplicate the CF Access handoff doc from Phase 0.

**T-061 · Update ISA + product-map to host=Cloudflare Pages with a V7 ISC**  
`product` · Planner/Orchestrator (Claude) · 3h · 4B/S4B-2 · 🔒 · deps: T-055, T-029  
- **Deliverable:** ISA.md + product-map updated so ISCs record host=Cloudflare Pages (Vercel removed), the /api Functions API surface, and the V7 delink gate, with a changelog entry noting the Vercel→Pages migration.
- **Acceptance:** ISA.md contains no active Vercel-host ISC (Vercel appears only in changelog/history), a V7 ISC exists with its verification command, ISA CheckCompleteness passes at the project tier, and the product-map reflects the Pages topology.
- **Validation:** Claude runs ISA CheckCompleteness; reviewer diff-checks the changelog entry and the new V7 ISC.
- **Notes:** ISA is a shared artifact; single-owner edit inside the docs swarm avoids contention with the Phase 5 ISC additions. · AMENDED: record birth_profiles as an explicit tracked fast-follow (its own future ISC) in the product-map/ISA.

**T-062 · Static delink verification check (V7 static half)**  
`qa` · Validation (Gemini) · 3h · 4C/S4C-1 · deps: T-055, T-056, T-060, T-061  
- **Deliverable:** A repeatable delink check (in scripts/verify and wired into CI) asserting zero live Vercel-proxy references: no api/proxy.ts, no vercel.json, no .vercel/, no @vercel/* deps, no /api/proxy routing, and no `vercel dev` in docs/scripts.
- **Acceptance:** The check runs and exits 0 on the delinked HEAD; deliberately reintroducing any Vercel token into a fixture makes it exit non-zero (proving it actually detects); the check is invoked by CI.
- **Validation:** Gemini runs the check on HEAD (pass) and against a Vercel-token-injected fixture (fail), capturing both outputs.
- **Notes:** Static half of V7; the deployed half is T-063. · AMENDED: the V7 static check greps for the 'vercel.app' HOST string too (not only @vercel/vercel.json/api/proxy), so a surviving Vercel URL fails the gate.

**T-063 · Pages deploy verification: app + Functions + migrations (V7 deploy half)**  
`qa` · Validation (Gemini) · 3h · 4C/S4C-1 · deps: T-057, T-058, T-059  
- **Deliverable:** A verification that a Pages build+deploy serves both the SPA and the /api/* Functions with migration 0001 applied to the remote D1.
- **Acceptance:** On the deployed Pages URL the SPA HTML loads and /api/me plus /api/selemene/* are served by Functions (reachable routes, not a 404/static fallback); `wrangler d1 migrations list --remote` shows 0001 applied.
- **Validation:** Gemini curls the deployed URL, inspects deploy logs and the migrations list, and captures the evidence.
- **Notes:** Verifies Functions are wired and reachable; full auth-required behavior (V1) with real OTP is Phase 5 and needs the user's CF Access config in 9d9d.

**T-064 · Phase 4 exit gate: consolidated V7 (delink + green Pages deploy)**  
`qa` · Validation (Gemini) · 2h · 4C/S4C-1 · deps: T-062, T-063  
- **Deliverable:** A consolidated V7 evidence bundle asserting Phase 4 exit: the repo has zero trailing Vercel deps AND a Pages deployment is green serving app+Functions with migrations applied.
- **Acceptance:** The static delink check (T-062) and the deploy verification (T-063) are both green in one run; an evidence bundle (grep output, deploy URL, migrations list, curl/screenshots) is attached; the Phase 4 branch merges to main with CI green.
- **Validation:** Gemini assembles the evidence bundle; the orchestrator confirms both halves green before closing Phase 4.
- **Notes:** Runnable exit gate for Phase 4. Does NOT include live OTP auth (V1-V4) — those are Phase 5, gated on the user's 9d9d CF Access setup and a restored local FS.


#### Phase 5 · Live Verification & Hardening

**T-065 · Production deploy to Cloudflare Pages (prod D1 migrated)**  
`infra` · Cloud/Backend (Copilot) · 2h · 5A/S5A-1 · deps: T-064, T-080  
- **Deliverable:** Live production CF Pages deployment on the urania custom hostname serving the React SPA + Pages Functions, with migration 0001 (users, readings + indexes) applied to the production D1 database.
- **Acceptance:** GET of the production URL returns the SPA HTML and the /api/* Functions route resolves (returns structured JSON/errors, not a 404 from the static host); `wrangler d1 migrations list --remote` shows 0001 applied on the prod D1 and `PRAGMA table_info` confirms users+readings tables exist; the deployed commit SHA equals main HEAD.
- **Validation:** wrangler pages deploy output shows success + deployment URL; wrangler d1 migrations list --remote and a remote d1 execute schema query captured; curl of prod URL returns SPA; deployment SHA recorded.
- **Notes:** Uses the Phase 4 Pages CI/CD pipeline (T-064) with no new wrangler config (frozen in P0). The custom domain must resolve to the Pages project before Access (T-066) can gate it. Endpoints are briefly reachable pre-Access; T-069 verifies they are gated once Access is live. · AMENDED: same backup-before-migrate + rollback; depends on T-080.

**T-066 · CF Access email-OTP cutover coordination (9d9d account)**  
`infra` · Planner/Orchestrator (Claude) · 3h · 5A/S5A-2 · deps: T-014, T-065, T-081  
- **Deliverable:** The user's CF Access application live on the urania hostname with an email-OTP IdP, plus the AUD tag + team domain captured verbatim into the config/handoff record the Worker consumes.
- **Acceptance:** An unauthenticated browser request to the production hostname is redirected to the CF Access email-OTP challenge (not the app); the AUD tag and team domain returned by the 9d9d Access app are captured and match the values the Worker's verifier expects (byte-for-byte diff against wrangler config plan).
- **Validation:** Manual browser check of the OTP redirect (HAR captured); AUD/team values recorded in the handoff doc and diffed against wrangler expectations; screenshot of the Access app config summary attached.
- **Notes:** USER INFRA ACTION in the 9d9d Cloudflare account — Claude coordinates the handoff and captures returned values ONLY; it does not perform the Cloudflare dashboard configuration itself. Consumes the Phase 0 CF-Access infra handoff doc (T-014). This is the infra->code handoff gate that unblocks T-067.

**T-067 · Apply production Worker secrets/vars (AUD, team, SELEMENE)**  
`infra` · Cloud/Backend (Copilot) · 1.5h · 5A/S5A-1 · 🔒 · deps: T-065, T-066, T-081  
- **Deliverable:** Production Worker configured with SELEMENE_API_KEY + SELEMENE_API_URL secrets and the CF Access AUD + team-domain vars matching the live Access app, carried by a redeploy.
- **Acceptance:** The four bindings are present on the production environment and a redeploy carries them; the AUD var equals the value captured in T-066 byte-for-byte; the redeployed Worker no longer errors on a valid Access request (confirmed transitively when V2/T-070 passes with a real login and V1/T-069 rejects a wrong-aud token).
- **Validation:** wrangler pages secret list / config dump shows the bindings (secret values redacted); AUD/team vars diffed against T-066 capture; correctness proven downstream by T-069 (wrong-aud reject) and T-070 (valid login).
- **Notes:** Edits wrangler.toml [vars] for AUD/team (non-secret) and sets SELEMENE_* as secrets (never committed) — shares wrangler.toml, hence lock_zone. Must run after T-066 captures the live AUD/team.

**T-068 · Build live verification harness scripts/verify/auth-gates.mjs**  
`qa` · Validation (Gemini) · 5h · 5A/S5A-3 · deps: T-014, T-064  
- **Deliverable:** scripts/verify/auth-gates.mjs — a parameterized Node harness that, given a target base URL and up to two authenticated CF Access sessions/service tokens, executes the V1-V4 checks and prints a per-gate PASS/FAIL summary with captured request/response evidence, exiting non-zero on any failure.
- **Acceptance:** Run against a URL with no session reports the V1 auth redirect/block; run with one valid session reports V2 {id,email}; run with two sessions reports V3 isolation and V4 durable-read; the process exit code is non-zero if any wired gate fails and zero only when all pass.
- **Validation:** Dry-run against local `wrangler pages dev` (dev-identity) proves harness logic before prod; harness README documents CF Access session acquisition (service token or captured cookie); `node scripts/verify/auth-gates.mjs --url <target>` output reviewed.
- **Notes:** Built in parallel with the deploy/cutover. Consumes the frozen endpoint request/response contracts (T-014) for expected shapes. New single-owner file, not a shared-edit file.

**T-069 · V1 auth-required — verify LIVE**  
`qa` · Validation (Gemini) · 2h · 5B/S5B-1 · deps: T-066, T-067, T-068, T-029  
- **Deliverable:** Live V1 evidence: unauthenticated access to the app shell and to every /api/* endpoint is blocked/redirected to OTP on the production deployment.
- **Acceptance:** From a clean client with no Access cookie, GET of the prod hostname returns the CF Access OTP challenge (not the app), and requests to /api/me, /api/selemene/*, /api/folio (GET/POST/PATCH/DELETE) each return a 302-to-Access or 403 — never engine output, never D1 data. No anonymous path reaches the engine or D1.
- **Validation:** auth-gates.mjs V1 block check + `curl -I` of each route captured to the evidence dir; browser HAR of the redirect chain saved.
- **Notes:** Depends on Access enforcing (T-066), prod secrets set (T-067), the harness (T-068), and the Phase 1 auth boundary (T-029).

**T-070 · V2 identity-mapped — verify LIVE**  
`qa` · Validation (Gemini) · 2h · 5B/S5B-1 · deps: T-069, T-029  
- **Deliverable:** Live V2 evidence: a real OTP login yields GET /api/me = {id,email} backed by an upserted D1 users row.
- **Acceptance:** After completing email-OTP for account A, GET /api/me returns A's email and a stable id; `SELECT * FROM users WHERE email=?` on prod D1 returns exactly one row for A with created_at set; a second /api/me call advances last_seen_at; id equals the CF Access sub (or the documented lowercased-email hash fallback).
- **Validation:** Browser login + /api/me response captured; `wrangler d1 execute --remote` users-row snapshot before/after a second call showing last_seen_at change.
- **Notes:** Exercises the SPA useMe path against real Access; any UI-side defect feeds T-076.

**T-071 · V3 per-user isolation — verify LIVE across two real accounts**  
`qa` · Validation (Gemini) · 3h · 5B/S5B-2 · deps: T-070, T-054  
- **Deliverable:** Live V3 evidence: readings created by account A are never returned to account B on the production deployment.
- **Acceptance:** With two real accounts A and B logged in independently: A saves a reading via the app; GET /api/folio as B never lists A's reading; search and favorites as B exclude A's rows; direct GET/PATCH/DELETE of A's reading id as B returns 404/403; prod D1 shows both users' readings tagged with distinct user_id.
- **Validation:** auth-gates.mjs V3 cross-session run with two sessions; `wrangler d1 execute --remote` readings-by-user_id snapshot; captured 404/403 responses for cross-user id access.
- **Notes:** Requires two genuinely separate OTP logins. Depends on Phase 3 Folio CRUD/D1 scoping (T-054).

**T-072 · V4 durable / cross-device — verify LIVE in a fresh session**  
`qa` · Validation (Gemini) · 2.5h · 5B/S5B-2 · deps: T-070, T-054  
- **Deliverable:** Live V4 evidence: a reading persists across a fresh browser profile/device with no shared localStorage.
- **Acceptance:** Account A saves a reading in session 1; in a brand-new browser profile/incognito (fresh CF Access login, verified-empty localStorage) A logs in and GET /api/folio lists the same reading with identical content/raw; the reading is present before any localStorage write, proving D1-backing not localStorage.
- **Validation:** Two-profile browser walkthrough with screenshots/HAR; localStorage inspected empty in the fresh profile before the reading appears; auth-gates.mjs durable-read check.
- **Notes:** Depends on Phase 3 D1 persistence (T-054). The empty-localStorage precondition is what distinguishes this from the old Folio.

**T-073 · No-dev-bypass-in-prod gate — prove the dev identity is inert**  
`qa` · Validation (Gemini) · 2h · 5B/S5B-3 · deps: T-067, T-029, T-068  
- **Deliverable:** Evidence that the prod-safe dev-identity injection is provably inert in production.
- **Acceptance:** Sending the dev-identity bypass header/param (the one that yields an identity under `wrangler pages dev`) to the production Worker grants no identity: GET /api/me with the bypass header but no Access JWT returns 401/redirect, and /api/folio with the bypass header returns no rows; only a real Access JWT grants identity.
- **Validation:** curl the prod endpoints with the dev-bypass header set -> captured 401/redirect and empty result; code-path review confirming the injection is guarded by an env flag that is false/absent in prod; auth-gates.mjs bypass-negative check.
- **Notes:** Critical security gate — a dev bypass reaching prod would defeat V1-V3. Cross-checks the Phase 1 dev-identity contract (T-029). Any failure escalates to T-075 hardening.

**T-074 · V5/V6/V7/V8 — re-confirm for the deployed environment**  
`qa` · Validation (Gemini) · 4h · 5B/S5B-3 · deps: T-065, T-039, T-054, T-064, T-029  
- **Deliverable:** Consolidated re-confirmation that V5 (compute-unchanged), V6 (import idempotent), V7 (Vercel delinked), and V8 (JWT-verify) hold in/for the live deployment.
- **Acceptance:** V5: taxonomy.mjs + daily-gates.mjs pointed at the deployed Worker base pass with the same results as pre-migration; V6: POST /api/folio/import run twice on prod yields an identical row set (delta count = 0); V7: the deployed app is served by Pages with zero requests to any Vercel proxy and the deployed artifact contains no api/proxy.ts / vercel.json; V8: the JWT-verify unit suite (valid/wrong-aud/expired/unsigned/tampered) is green in CI against the live AUD/JWKS config.
- **Validation:** Re-run taxonomy.mjs/daily-gates.mjs with BASE=<prod>; run import twice + prod D1 count diff; browser network panel shows no *.vercel.app calls + grep deployed bundle; CI V8 job green log captured.
- **Notes:** These gates were proven in earlier phases (V5=T-039, V6=T-054, V7=T-064, V8=T-029); here they are re-run against/for the deployed prod environment to satisfy 'all 8 gates green LIVE'.

**T-075 · Backend hardening pass (fix live-gate findings, re-verify)**  
`backend` · Cloud/Backend (Copilot) · 5h · 5C/S5C-1 · 🔒 · deps: T-069, T-070, T-071, T-072, T-073, T-074  
- **Deliverable:** Landed hardening fixes for findings from the live gates: JWKS cache TTL/kid-miss refresh correctness, error responses that leak no key/identity/other-user data, the dev-bypass env guard, and any misconfig surfaced by V1-V8.
- **Acceptance:** Every finding from T-069-T-074 has a landed fix or a documented accept/defer; re-running the specific affected gate passes; /api/* error bodies contain no SELEMENE key, no stack traces, and no other user's data; the JWKS cache refreshes on a kid-miss without unbounded growth (verified by a targeted test).
- **Validation:** Diff review + targeted re-run of each affected gate harness; negative tests for error-leak (assert redacted bodies); before/after evidence attached to the dossier.
- **Notes:** May edit the Worker router, functions/lib/cf-access.ts, and wrangler.toml — lock_zone. If the live gates surface no findings, the task documents 'no changes required' with the passing negative-test evidence.

**T-076 · SPA live-auth polish (useMe / logout / Folio states)**  
`frontend` · UI/App (Codex) · 3h · 5C/S5C-2 · 🔒 · deps: T-070, T-072  
- **Deliverable:** SPA identity/logout hardened against live CF Access: useMe handles 401 by redirecting to the Access login, the logout link hits the real CF Access logout endpoint (clearing the session, not just local state), and Folio renders correct loading/empty/error states on the deployed app.
- **Acceptance:** On the live deployment: an expired/absent session drives useMe to the OTP redirect (no infinite spinner, no stale identity); clicking logout lands on a re-auth challenge and a subsequent GET /api/me is 401; Folio shows a loading state then the D1-backed list, and a friendly error (not a blank panel) when /api/folio fails.
- **Validation:** Live browser walkthrough (login -> use -> logout -> protected route) with screenshots; forced-401 via a revoked session shows the redirect; captured in the dossier.
- **Notes:** Touches SPA identity (useMe/App) and possibly FolioPanel — lock_zone. This behavior is only verifiable against the live Access deployment, not the local dev-bypass, which is why it lives in Phase 5.

**T-077 · Consolidated live evidence dossier**  
`product` · Planner/Orchestrator (Claude) · 4h · 5C/S5C-3 · deps: T-069, T-070, T-071, T-072, T-073, T-074, T-075, T-076  
- **Deliverable:** A single committed evidence dossier (e.g. docs/verify/2026-07-20-phase5-live-evidence.md) linking every gate's commands, outputs, HAR/screenshots, D1 snapshots, two-account and fresh-session proofs, and the prod deployment SHA.
- **Acceptance:** The dossier contains, per gate V1-V8 plus the no-dev-bypass gate: the exact command/steps, the captured output/artifact, the pass verdict, the prod deployment SHA, and the date; a reviewer can reproduce each gate from the dossier alone with no additional context.
- **Validation:** Doc review against the eight gates + bypass gate; every pass claim links to a captured artifact; no gate marked pass without evidence.
- **Notes:** Aggregates artifacts produced by T-069-T-076. New docs file, single owner.

**T-078 · ISA Phase 5 ISCs marked verified**  
`product` · Planner/Orchestrator (Claude) · 2h · 5C/S5C-3 · 🔒 · deps: T-077  
- **Deliverable:** ISA.md Verification section updated with Phase 5 ISCs marked verified (each linking to the dossier evidence), and the product-map/migration status flipped to 'live login-required on Cloudflare'.
- **Acceptance:** ISA Verification lists ISCs for login-required, identity-mapped, per-user-isolated, durable/cross-device, compute-unchanged, import-idempotent, vercel-delinked, JWT-correct, and no-dev-bypass — each with status=verified, an evidence link into the T-077 dossier, and a date; no ISC left pending or 'green != done'.
- **Validation:** ISA CheckCompleteness / diff review; cross-check each ISC links to a real dossier artifact from T-077.
- **Notes:** Edits ISA.md — lock_zone. Depends on the consolidated dossier (T-077) so every ISC cites real evidence.

**T-079 · Phase 5 exit gate — all 8 gates green LIVE, migration sign-off**  
`qa` · Validation (Gemini) · 2h · 5C/S5C-4 · deps: T-075, T-076, T-077, T-078  
- **Deliverable:** Final sign-off run: scripts/verify/auth-gates.mjs green against prod post-hardening, with all eight gates plus the no-dev-bypass gate confirmed and the dossier/ISA current.
- **Acceptance:** After T-075 hardening and T-076 polish, one clean end-to-end run: `node scripts/verify/auth-gates.mjs --url <prod>` exits 0; V1-V8 and the no-dev-bypass gate all PASS on the live deployment with real OTP logins; the dossier (T-077) and ISA ISCs (T-078) reference this run's deployment SHA; the migration is declared complete.
- **Validation:** auth-gates.mjs exit-0 output captured; manual re-verify of V1 (clean-client block) and V4 (fresh-login durable) with a real login; sign-off note appended to the dossier with the SHA and date.
- **Notes:** Runnable exit gate for Phase 5 and the whole migration. Re-runs after hardening so the final evidence reflects the shipped prod state, not the pre-fix state.


#### Phase 4 · Vercel Delink & Pages CI/CD

**T-080 · Provision remote D1 (preview + production) + wire database_id**  
`infra` · Cloud/backend (Copilot) · 2h · 4B/S4B-1 · 🔒 · deps: T-003, T-057  
- **Deliverable:** `wrangler d1 create` for the preview and production databases; each database_id recorded in wrangler.toml (prod under the production environment).
- **Acceptance:** `wrangler d1 migrations apply --remote` applies 0001 to the created DB and `migrations list --remote` shows 0001; a placeholder id fails (real ids present).
- **Validation:** Run remote migration apply + list against the created DBs; confirm non-placeholder database_id in wrangler.toml.
- **Notes:** ADDED IN RECONCILIATION (critic major: no task provisioned the remote D1). T-058/T-065 depend on this — they cannot apply --remote without it.


#### Phase 5 · Live Verification & Hardening

**T-081 · USER HANDOFF: create the CF Access application in the 9d9d account (email-OTP) → return AUD + team domain**  
`product` · User / infra owner (Human) · 1h · 5A/S5A-2 · deps: T-009  
- **Deliverable:** In the 9d9d Cloudflare account: a CF Access application on the decided urania hostname with an email-OTP IdP + access policy; the AUD tag + team domain returned to the Worker config.
- **Acceptance:** Unauthenticated visit shows the CF Access email-OTP screen; the real AUD tag + team domain are set as CF_ACCESS_AUD / CF_ACCESS_TEAM_DOMAIN (no placeholders).
- **Validation:** Clean-client visit intercepted by CF Access OTP; returned AUD/team match what the Worker verifies against.
- **Notes:** ADDED IN RECONCILIATION (critic minor: human provisioning had no owning task). YOUR infra action in the 9d9d account — I cannot touch it. T-066/T-067 depend on it.

