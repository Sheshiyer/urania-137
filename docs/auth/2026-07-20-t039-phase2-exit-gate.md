# T-039 — Phase-2 exit gate: engine compute served through the Worker, V5 green

**Date:** 2026-07-20 · **Branch:** `feat/cf-auth` · **Env:** `wrangler pages dev` (wrangler 4.112.0), port 8788 · **Issue:** #130

One command proves the whole Phase-2 contract locally in a single pass:

```bash
npx vite build                                    # fresh dist/
node scripts/verify/phase2-exit-gate.mjs          # boots/tears down its own worker + stubs
```

## What the gate proves (acceptance, plan T-039)

| # | Check | Result |
|---|-------|--------|
| 1 | `git diff` on `src/lib/selemeneApi.ts` empty (vs Phase-0 `aac0d8c` + working tree) | PASS |
| 2 | Unauthed `GET /api/me` → **401** (dev identity disabled via `--binding DEV_IDENTITY_EMAIL=`) | PASS |
| 3 | Unauthed `POST /api/selemene/*` → **401**, no upstream call possible | PASS |
| 4 | Prod-safe dev identity active in the authed phase (`dev:dev@urania.local`) | PASS |
| 5 | Authed reading generated via `/api/selemene/*` — golden 7-seed corpus 200, **byte-identical** to baseline (status + content-type + body) | PASS |
| 6 | Engine key string absent from ALL client-visible headers/bodies (5 responses scanned) | PASS |
| 7 | Spoofed client `x-api-key` dropped — server key injected upstream (stub only answers to the server key → 200) | PASS |
| 8 | Browser SPA generate e2e through the Worker (Playwright; rendered content identical to pre-migration baseline) | PASS |
| 9 | V5 green: taxonomy.mjs (35/35) + daily-gates.mjs PASS through the Worker AND outputs **diff-empty** vs baseline | PASS |

Verdict: **PASS (exit 0)** — full run output in the issue comment; machine-readable summary in
`scripts/verify/fixtures/phase2-exit/summary.json`.

## How it works (runbook)

1. **Phase A (auth boundary):** boots `wrangler pages dev dist --port 8788 --binding DEV_IDENTITY_EMAIL= …`
   (empty binding disables dev injection) → both unauthed probes must 401 → tears down.
2. **Baseline capture:** starts `fixture-engine.mjs` in record mode targeting the
   **pre-migration prod path** (`https://urania-137.vercel.app/api/selemene`), runs
   `golden-parity.mjs --capture` (7 deterministic seeds) + records the exact SPA generate body.
3. **Phase B (authed):** swaps the stub to replay (`--require-key p2-stub-key`), boots the worker
   with `--binding SELEMENE_API_URL=http://localhost:8795 --binding SELEMENE_API_KEY=p2-stub-key`
   (CLI bindings override `.dev.vars`; the file is never touched), waits for the dev identity,
   then: golden `--verify` (byte parity) → key-leak scan → spoofed-key probe → Playwright SPA e2e.
4. **V5:** runs `v5-compute-gate.mjs` against the still-running worker (it manages its own
   record→replay stub cycle and re-diffs taxonomy + daily-gates).
5. **Bundle:** writes `summary.json` + session fixtures under `scripts/verify/fixtures/phase2-exit/`,
   kills everything it started (listener-only `lsof` kill + wrapper `pkill`), exits 0/1.

## ⚠️ Baseline caveat (flagged in #125/#128/#129, restated here)

The local `.env.local` `SELEMENE_API_KEY` is **expired** (`401 Invalid or expired API key` against
the direct engine — verified this run; also documented in `docs/daily/engine-schema-notes.md`).
Direct-engine baseline capture is therefore impossible locally. The gate captures real engine bytes
via the **pre-migration prod proxy path** (which injects the valid server-side key) and replays
them byte-identically through the Worker with a synthetic stub key. Parity is thus proven for the
proxy boundary (method/path/query/body in; status/content-type/body/streaming out); **live V5 with
the real key against the deployed environment is Phase-5 (T-074)**. Action for the maintainer:
rotate the local `SELEMENE_API_KEY`.

## Ops findings from gate development (documented, not production bugs)

- **Two dev servers sharing the local D1 file can crash workerd at boot** with
  `SQLITE_BUSY (database is locked)` — observed when this agent's server and the parallel P3_QA
  server both touched `.wrangler` D1 state. Local-dev-only concurrency artifact; no code change made.
- **Process hygiene matters for scripted gates:** `kill $(lsof -tiTCP:PORT)` without `-sTCP:LISTEN`
  also matches the gate's own outbound fetch connections and kills the gate itself; and SIGTERM to
  the `npx` wrapper orphans `workerd`. The gate kills listeners only, pkills its own wrangler
  wrapper pattern, and exits explicitly.
