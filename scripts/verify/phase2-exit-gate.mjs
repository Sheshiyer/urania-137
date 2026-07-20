/**
 * Phase-2 exit gate (T-039) — one command, one consolidated local pass:
 *
 *   node scripts/verify/phase2-exit-gate.mjs [--port 8788] [--stub-port 8795] \
 *     [--record-target https://urania-137.vercel.app/api/selemene] \
 *     [--evidence scripts/verify/fixtures/phase2-exit]
 *
 * In a single run it proves, against `wrangler pages dev` (which it boots and
 * tears down itself on the P2-owned port):
 *   1. UNAUTHED REJECTED  — with dev identity disabled, /api/me and a selemene
 *      POST without a token both return 401.
 *   2. AUTHED READING     — with the prod-safe dev identity, a real reading is
 *      generated through /api/selemene/* (golden corpus + the browser-driven
 *      SPA generate e2e) with content identical to the engine baseline.
 *   3. KEY NEVER LEAKS    — the server-side engine key string appears in NO
 *      client-visible response header or body across every request the gate
 *      makes; a spoofed client x-api-key is dropped (stub still gets the
 *      server key → 200).
 *   4. V5 GREEN           — v5-compute-gate.mjs passes: taxonomy + daily-gates
 *      green through the Worker AND diff-empty vs the captured baseline.
 *   5. CONTRACT FROZEN    — git diff on src/lib/selemeneApi.ts is empty vs the
 *      Phase-0 baseline and the working tree.
 *
 * Baseline caveat (flagged in #125/#128/#129): the local SELEMENE_API_KEY is
 * expired, so real engine bytes are captured via the pre-migration prod proxy
 * path and replayed through the Worker with a synthetic stub key. Live parity
 * with the real key is Phase-5 (T-074).
 */
import { spawn, execSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SPA_BODY } from './spa-generate-e2e.mjs'

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : dflt
}
const PORT = Number(arg('port', 8788))
const WORKER = `http://localhost:${PORT}`
const STUB_PORT = Number(arg('stub-port', 8795))
const STUB = `http://localhost:${STUB_PORT}`
const RECORD_TARGET = arg('record-target', 'https://urania-137.vercel.app/api/selemene')
const EVIDENCE = arg('evidence', 'scripts/verify/fixtures/phase2-exit')
const SESSION = join(EVIDENCE, 'session')
const STUB_KEY = 'p2-stub-key'
const PHASE0_BASELINE = 'aac0d8c'

const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

const children = []
const cleanup = () => { for (const c of children.splice(0)) { try { c.kill('SIGTERM') } catch {} } }
process.on('SIGINT', () => { cleanup(); process.exit(130) })
process.on('exit', cleanup)

const freePort = (port) => {
  for (let i = 0; i < 20; i++) {
    // -sTCP:LISTEN is essential: without it lsof also matches OUR OWN outbound
    // fetch connections to the port and we would kill ourselves.
    try { execSync(`kill $(lsof -tiTCP:${port} -sTCP:LISTEN) 2>/dev/null || true`, { stdio: 'ignore' }) } catch {}
    try {
      execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, { stdio: 'pipe' })
      execSync('sleep 0.5')
    } catch { return } // lsof found nothing → port free
  }
}

const waitHttp = async (url, tries = 60) => {
  for (let i = 0; i < tries; i++) {
    try { await fetch(url, { signal: AbortSignal.timeout(1000) }); return true } catch { await new Promise((r) => setTimeout(r, 500)) }
  }
  return false
}

const bootWorker = (extraBindings) => {
  const args = ['wrangler', 'pages', 'dev', 'dist', '--port', String(PORT)]
  for (const b of extraBindings) args.push('--binding', b)
  const child = spawn('npx', args, { stdio: ['ignore', 'pipe', 'pipe'] })
  children.push(child)
  return child
}
const startStub = (mode) => {
  const args = ['scripts/verify/fixture-engine.mjs', '--port', String(STUB_PORT), '--fixtures', SESSION]
  if (mode === 'record') args.push('--record', RECORD_TARGET)
  else args.push('--replay', '--require-key', STUB_KEY)
  const child = spawn('node', args, { stdio: ['ignore', 'pipe', 'pipe'] })
  children.push(child)
  return child
}
const stopManaged = async () => {
  cleanup()
  // SIGTERM to the npx wrapper can orphan workerd/node children — kill the
  // port listeners directly and wait until the ports are actually free.
  freePort(PORT)
  freePort(STUB_PORT)
  // Reap the npx/sh/node wrappers of our own wrangler boots — killing only the
  // listener leaves wrapper parents alive, and their open stdio pipes keep THIS
  // process's event loop (and the machine's process table) from cleaning up.
  try { execSync(`pkill -f "wrangler pages dev dist --port ${PORT}" || true`, { stdio: 'ignore' }) } catch {}
  await new Promise((r) => setTimeout(r, 300))
}

const runNode = (script, args = [], env = {}) =>
  new Promise((resolve) => {
    const child = spawn('node', [script, ...args], { env: { ...process.env, ...env } })
    let out = ''
    child.stdout.on('data', (d) => { out += d; process.stdout.write(d) })
    child.stderr.on('data', (d) => { out += d; process.stderr.write(d) })
    child.on('close', (code) => resolve({ code, out }))
  })

const main = async () => {
  mkdirSync(SESSION, { recursive: true })
  console.log(`Phase-2 exit gate (T-039) · worker :${PORT} · stub :${STUB_PORT} · evidence ${EVIDENCE}\n`)
  if (!existsSync('dist/index.html')) { console.error('FATAL: dist/ missing — run `npx vite build` first'); process.exit(2) }

  // ---- 5. selemeneApi.ts frozen (cheap; run first) --------------------------
  console.log('[1/6] selemeneApi.ts unchanged')
  let frozen = true
  try {
    execSync(`git diff --quiet ${PHASE0_BASELINE}..HEAD -- src/lib/selemeneApi.ts`)
    execSync('git diff --quiet HEAD -- src/lib/selemeneApi.ts')
  } catch { frozen = false }
  record('git diff on src/lib/selemeneApi.ts empty (vs Phase-0 baseline + working tree)', frozen)

  // ---- 1. unauthed → 401 ----------------------------------------------------
  console.log('\n[2/6] unauthed requests rejected (dev identity disabled)')
  freePort(PORT)
  bootWorker(['DEV_IDENTITY_EMAIL=', `SELEMENE_API_URL=${STUB}`, `SELEMENE_API_KEY=${STUB_KEY}`])
  if (!(await waitHttp(`${WORKER}/`))) { console.error('FATAL: worker did not boot (phase A)'); process.exit(2) }
  const meAnon = await fetch(`${WORKER}/api/me`)
  const genAnon = await fetch(`${WORKER}/api/selemene/api/v1/assets/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  record('GET /api/me without token → 401', meAnon.status === 401, `got ${meAnon.status}`)
  record('POST /api/selemene/* without token → 401 (no upstream call possible)', genAnon.status === 401, `got ${genAnon.status}`)
  await stopManaged()

  // ---- baseline capture -----------------------------------------------------
  console.log('\n[3/6] capturing engine baseline (golden corpus + SPA generate body)')
  startStub('record')
  if (!(await waitHttp(`${STUB}/`))) { console.error('FATAL: record stub did not start'); process.exit(2) }
  const cap = await runNode('scripts/verify/golden-parity.mjs', ['--capture', '--target', STUB, '--fixtures', SESSION])
  const spaRec = await fetch(`${STUB}/api/v1/assets/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: SPA_BODY })
  await stopManaged()
  record('golden corpus captured (7 seeds)', cap.code === 0)
  record('SPA generate body captured', spaRec.status === 200, `HTTP ${spaRec.status}`)

  // ---- authed phase ---------------------------------------------------------
  console.log('\n[4/6] authed reading through the Worker + key-never-leaks')
  startStub('replay')
  if (!(await waitHttp(`${STUB}/`))) { console.error('FATAL: replay stub did not start'); process.exit(2) }
  bootWorker([`SELEMENE_API_URL=${STUB}`, `SELEMENE_API_KEY=${STUB_KEY}`])
  if (!(await waitHttp(`${WORKER}/`))) { console.error('FATAL: worker did not boot (phase B)'); process.exit(2) }
  // Wait for the dev identity specifically — a static-200 can come from a
  // lingering wrong-phase process, which is exactly the failure this guards.
  let me = null
  for (let i = 0; i < 60 && !me?.id?.startsWith('dev:'); i++) {
    me = await fetch(`${WORKER}/api/me`).then((r) => (r.status === 200 ? r.json() : null)).catch(() => null)
    if (!me) await new Promise((r) => setTimeout(r, 500))
  }
  record('dev identity active (prod-safe, server-side)', !!me?.id?.startsWith('dev:'), me?.id)
  if (!me?.id?.startsWith('dev:')) { console.error('FATAL: dev identity never became active in phase B'); process.exit(2) }

  // authed reading + parity vs baseline
  const verify = await runNode('scripts/verify/golden-parity.mjs', ['--verify', '--base', WORKER, '--fixtures', SESSION])
  record('authed reading generated via /api/selemene/* · 7/7 seeds identical to baseline', verify.code === 0)

  // key-never-leaks: scan every client-visible header+body for the key string,
  // including a spoofed-credential request (the spoof must be dropped — the stub
  // only answers to the server-injected key).
  let leaked = false
  const leakTargets = [
    { method: 'GET', path: '/health' },
    { method: 'GET', path: '/api/v1/engines' },
    { method: 'POST', path: '/api/v1/assets/generate', body: SPA_BODY },
    { method: 'POST', path: '/api/v1/engines/panchanga/calculate', body: JSON.stringify({ birth_data: { date: '2026-07-19', time: '12:00', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' } }) },
  ]
  for (const t of leakTargets) {
    const r = await fetch(`${WORKER}/api/selemene${t.path}`, { method: t.method, headers: { 'Content-Type': 'application/json' }, body: t.body })
    const text = await r.text()
    const headerBlob = [...r.headers.entries()].map(([k, v]) => `${k}: ${v}`).join('\n')
    if (text.includes(STUB_KEY) || headerBlob.includes(STUB_KEY)) { leaked = true; console.log(`    LEAK on ${t.path}`) }
  }
  const meText = await (await fetch(`${WORKER}/api/me`)).text()
  if (meText.includes(STUB_KEY)) leaked = true
  record('engine key string absent from all client-visible headers/bodies', !leaked, `${leakTargets.length + 1} responses scanned`)
  const spoof = await fetch(`${WORKER}/api/selemene/health`, { headers: { 'x-api-key': 'spoofed-client-key' } })
  record('spoofed client x-api-key dropped (server key injected upstream)', spoof.status === 200, `got ${spoof.status}`)

  // browser-driven SPA generate (the real pre-migration user path)
  const e2e = await runNode('scripts/verify/spa-generate-e2e.mjs', ['--base', WORKER, '--fixtures', SESSION])
  record('browser SPA generate e2e through the Worker (content identical)', e2e.code === 0)
  await stopManaged()

  // ---- V5 -------------------------------------------------------------------
  console.log('\n[5/6] V5 compute-unchanged gate (manages its own record/replay stubs)')
  bootWorker([`SELEMENE_API_URL=${STUB}`, `SELEMENE_API_KEY=${STUB_KEY}`])
  if (!(await waitHttp(`${WORKER}/`))) { console.error('FATAL: worker did not boot (V5 phase)'); process.exit(2) }
  for (let i = 0; i < 60; i++) {
    const ok = await fetch(`${WORKER}/api/me`).then((r) => r.status === 200).catch(() => false)
    if (ok) break
    await new Promise((r) => setTimeout(r, 500))
  }
  const v5 = await runNode('scripts/verify/v5-compute-gate.mjs', ['--worker', WORKER, '--stub-port', String(STUB_PORT)])
  record('V5: taxonomy + daily-gates green through the Worker AND diff-empty vs baseline', v5.code === 0)
  await stopManaged()
  freePort(PORT)

  // ---- bundle ---------------------------------------------------------------
  console.log('\n[6/6] evidence bundle')
  const failed = results.filter((r) => !r.ok)
  const summary = {
    gate: 'Phase-2 exit (T-039)',
    at: new Date().toISOString(),
    worker: WORKER,
    baselineVia: RECORD_TARGET,
    caveat: 'local SELEMENE_API_KEY expired → real engine bytes captured via the pre-migration prod proxy path and replayed through the Worker with a synthetic stub key; live parity with the real key is Phase-5 (T-074)',
    checks: results,
    verdict: failed.length ? 'FAIL' : 'PASS',
  }
  writeFileSync(join(EVIDENCE, 'summary.json'), JSON.stringify(summary, null, 2))
  console.log(`  summary → ${join(EVIDENCE, 'summary.json')} (+ session fixtures)`)
  console.log('')
  if (failed.length) { console.log(`Phase-2 exit gate: FAIL (${failed.length} checks)`); process.exit(1) }
  console.log('Phase-2 exit gate: PASS — engine compute served through the Worker, V5 green, key never leaks, selemeneApi.ts frozen')
  process.exit(0) // explicit: spawned-child stdio pipes must not hold the event loop
}
main()
