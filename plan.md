# Execution Plan — Cloudflare Auth + Reading Storage (Phases 1–4-local)

**Source plan:** `docs/superpowers/plans/2026-07-20-cloudflare-auth-readings-plan.md` (81 tasks, spec SHA-pinned)
**Branch:** `feat/cf-auth` · **Done:** Phase 0 (T-001–T-014, `aac0d8c`, exit gate 9/9)
**Issue mapping:** GitHub issue # = task T + 91 (verified: T-015→#106, T-030→#121, T-045→#136)
**Skill note:** `.claude/skills/using-superpowers/SKILL.md` is absent locally; applying `~/.claude/skills/temperance-parallel-dispatch` (rail-splitting) + the plan's own swarm method. All rails run as Kimi `coder` subagents (no external rail in this runtime).

## Hard boundary
No `CLOUDFLARE_API_TOKEN` / `wrangler login` in this environment → **T-058, T-059, T-063, T-064, T-080, and all of Phase 5 (T-065–T-079) are blocked on the user's CF account**; T-081 is a human task. Everything up to that boundary gets executed.

## Wave 1 — parallel foundations (3 agents, disjoint file scopes)
| Agent | Tasks | Owns | Forbidden |
|---|---|---|---|
| **P1_AuthBackend** | T-015→T-016→T-017→T-018→T-019→T-020 | `functions/lib/{cf-access,db,dev-identity}.ts`, router auth middleware, `/api/me` + logout | package.json, src/, docs/, engine-proxy.ts |
| **P2_EngineProxyLib** | T-030 | `functions/lib/engine-proxy.ts` + its test | router, package.json, src/ |
| **P3_FolioFrontend** | T-045→T-046→T-047→T-048 | `src/**` (folioStore, FolioPanel, 3 saveReport callers, import trigger) | functions/, package.json |

Wave-1 rules: verify via `tsc` (SPA + functions configs) + `vitest`; **no `wrangler pages dev`** (port conflicts); no new npm deps (report instead); commit per task (`… (T-0NN)`), close issues with `gh issue close` at the end.

## Wave 2 — Phase 1 verification & identity UX (3 agents)
| Agent | Tasks | Notes |
|---|---|---|
| **P1_QA_V8** | T-021, T-022, T-023, T-028 | mock-JWKS suite, no-bypass-in-prod negatives, JWKS cache/rotation; owns package.json test scripts |
| **P1_IdentityFrontend** | T-024, T-025 | `src/hooks/useMe.ts`, signed-in chrome + logout |
| **P1_Proof_ISA** | T-026, T-027 | creates local `.dev.vars`, runs dev-server identity proof (sole dev-server user this wave), records Phase-1 ISCs in ISA.md |

Then inline: **T-029** Phase-1 exit gate (consolidated run).

## Wave 3 — all Worker routes (1 router owner + gate)
- **BackendRoutes:** T-031, T-032, T-033 (selemene proxy route) + T-040→T-044 (folio DAL in `db.ts` + `/api/folio` CRUD + import). Sole owner of `functions/api/[[path]].ts` + `functions/lib/db.ts` this wave. Verify via tsc + unit tests only.
- Inline in parallel: T-029 exit gate + Phase-1 issue closure audit.

## Wave 4 — behavior gates (2 agents, separate dev-server ports)
- **P2_QA:** T-034, T-035 (repoint verify scripts), T-036, T-038 (golden parity), T-037 (V5), T-039 (Phase-2 exit). Port 8788.
- **P3_QA:** T-049 (round-trip), T-050 (V3 isolation), T-051 (V6 import idempotency), T-052, T-053 (contract conformance), T-054 (Phase-3 exit). Port 8789.
- Both need `SELEMENE_API_KEY` in `.dev.vars` — source from local env without printing secrets; if unavailable, build fixture-based parity and flag.

## Wave 5 — Phase 4 local delink (1–2 agents)
- **P4_Delink:** T-055 (delete Vercel artifacts), T-056 (retire Vite proxy), T-057 (Pages build config), T-060 (docs), T-061 (ISA host=Pages + V7 ISC), T-062 (V7 static half incl. `vercel.app` grep).
- **Blocked, report only:** T-058/T-059/T-063/T-064 (remote deploy), T-080 (remote D1), Phase 5, T-081 (human CF Access).

## Stage gates
Each wave's output is validated (commits exist, tsc/tests green, issues closed) before the next wave dispatches. Any failed task → refined re-dispatch per temperance fail-open.
