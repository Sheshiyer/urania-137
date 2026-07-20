/**
 * V5 compute-unchanged gate (T-037) — taxonomy.mjs + daily-gates.mjs run against
 * the Worker AND against a fresh baseline capture, asserting byte-identity of
 * their outputs. Green scripts are necessary but NOT sufficient: parity to the
 * baseline is the bar; any drift fails the gate.
 *
 * Prerequisite: the Worker is already serving on --worker (default
 * http://localhost:8788) with its engine upstream bound to the fixture stub port:
 *
 *   npx wrangler pages dev dist --port 8788 \
 *     --binding SELEMENE_API_URL=http://localhost:8795 \
 *     --binding SELEMENE_API_KEY=p2-stub-key
 *
 * Run:
 *   node scripts/verify/v5-compute-gate.mjs [--worker http://localhost:8788] \
 *     [--stub-port 8795] [--record-target https://urania-137.pages.dev/api/selemene] \
 *     [--evidence scripts/verify/fixtures/v5]
 *
 * What it does (one command, self-contained):
 *   1. starts fixture-engine in RECORD mode (baseline = real engine compute via
 *      the pre-migration prod path — the local SELEMENE_API_KEY is expired, so
 *      direct-engine capture is impossible; see issue #125 flag),
 *   2. runs taxonomy.mjs + daily-gates.mjs against the record stub → baseline,
 *   3. swaps the stub to REPLAY mode and re-runs both scripts against the Worker,
 *   4. diffs normalized outputs (base URL line stripped) — byte-empty required,
 *   5. writes all outputs + diffs + summary.json into the evidence dir.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : dflt
}
const WORKER = arg('worker', 'http://localhost:8788').replace(/\/+$/, '')
const STUB_PORT = Number(arg('stub-port', 8795))
const STUB = `http://localhost:${STUB_PORT}`
// Prod record default is the Pages deployment's /api/selemene proxy (T-055 delink).
const RECORD_TARGET = arg('record-target', 'https://urania-137.pages.dev/api/selemene')
const EVIDENCE = arg('evidence', 'scripts/verify/fixtures/v5')
const STUB_KEY = 'p2-stub-key'
const SESSION = join(EVIDENCE, 'session')

const children = []
const cleanup = () => { for (const c of children) { try { c.kill('SIGTERM') } catch {} } }
process.on('SIGINT', () => { cleanup(); process.exit(130) })

const waitPort = async (url, tries = 60) => {
  for (let i = 0; i < tries; i++) {
    try { await fetch(url, { signal: AbortSignal.timeout(1000) }); return true } catch { await new Promise((r) => setTimeout(r, 500)) }
  }
  return false
}

const startStub = (mode) => {
  const args = ['scripts/verify/fixture-engine.mjs', '--port', String(STUB_PORT), '--fixtures', SESSION]
  if (mode === 'record') args.push('--record', RECORD_TARGET)
  else args.push('--replay', '--require-key', STUB_KEY)
  const child = spawn('node', args, { stdio: ['ignore', 'pipe', 'pipe'] })
  children.push(child)
  return child
}
const stopChildren = async () => { cleanup(); await new Promise((r) => setTimeout(r, 700)) }

const runScript = (script, base) =>
  new Promise((resolve) => {
    const env = { ...process.env, URANIA_API_BASE: base }
    delete env.SELEMENE_API_KEY // never leak a real key into proxy-targeted runs
    const child = spawn('node', [script], { env })
    let out = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { out += d })
    child.on('close', (code) => resolve({ code, out }))
  })

/** Strip the volatile base-URL line so the diff is about compute, not addressing. */
const normalize = (s) => s.replace(/^(Base|Daily live gates · base) http:\/\/\S+/m, (m) => m.replace(/http:\/\/\S+/, 'BASE'))

const main = async () => {
  mkdirSync(SESSION, { recursive: true })
  console.log(`V5 compute-unchanged gate · worker ${WORKER} · stub :${STUB_PORT} · evidence ${EVIDENCE}\n`)

  // Prereq: Worker up + dev identity active (the scripts authenticate via it).
  const me = await fetch(`${WORKER}/api/me`).then((r) => r.json()).catch(() => null)
  if (!me?.id?.startsWith('dev:')) {
    console.error(`FATAL: ${WORKER}/api/me did not return a dev identity (got ${JSON.stringify(me)}).`)
    console.error('Boot the Worker first: npx wrangler pages dev dist --port 8788 --binding SELEMENE_API_URL=' + STUB + ' --binding SELEMENE_API_KEY=' + STUB_KEY)
    process.exit(2)
  }
  console.log(`  ✓ Worker up · dev identity ${me.id}`)

  // 1-2: record baseline
  console.log(`\n[1/4] recording baseline via ${RECORD_TARGET} …`)
  startStub('record')
  if (!(await waitPort(`${STUB}/`))) { console.error('FATAL: record stub did not start'); process.exit(2) }
  const taxBase = await runScript('scripts/verify/taxonomy.mjs', STUB)
  const dayBase = await runScript('scripts/verify/daily-gates.mjs', STUB)
  await stopChildren()
  if (taxBase.code !== 0 || dayBase.code !== 0) {
    console.error(`FATAL: baseline scripts failed (taxonomy ${taxBase.code}, daily-gates ${dayBase.code}) — baseline itself is red, parity is meaningless`)
    writeFileSync(join(EVIDENCE, 'taxonomy.baseline.txt'), taxBase.out)
    writeFileSync(join(EVIDENCE, 'daily.baseline.txt'), dayBase.out)
    process.exit(1)
  }
  console.log('  ✓ baseline green (taxonomy 35/35 + daily-gates PASS expected; outputs saved)')

  // 3: replay through the Worker
  console.log('\n[2/4] replaying fixtures and running scripts through the Worker …')
  startStub('replay')
  if (!(await waitPort(`${STUB}/`))) { console.error('FATAL: replay stub did not start'); process.exit(2) }
  const taxWorker = await runScript('scripts/verify/taxonomy.mjs', WORKER)
  const dayWorker = await runScript('scripts/verify/daily-gates.mjs', WORKER)
  await stopChildren()

  // 4: diffs
  console.log('\n[3/4] diffing …')
  const taxDiff = normalize(taxBase.out) === normalize(taxWorker.out) ? '' : 'DIFFERS'
  const dayDiff = normalize(dayBase.out) === normalize(dayWorker.out) ? '' : 'DIFFERS'
  writeFileSync(join(EVIDENCE, 'taxonomy.baseline.txt'), taxBase.out)
  writeFileSync(join(EVIDENCE, 'taxonomy.worker.txt'), taxWorker.out)
  writeFileSync(join(EVIDENCE, 'daily.baseline.txt'), dayBase.out)
  writeFileSync(join(EVIDENCE, 'daily.worker.txt'), dayWorker.out)
  writeFileSync(join(EVIDENCE, 'taxonomy.diff'), taxDiff === '' ? '# diff-empty (normalized)\n' : `baseline:\n${normalize(taxBase.out)}\n--- worker:\n${normalize(taxWorker.out)}\n`)
  writeFileSync(join(EVIDENCE, 'daily.diff'), dayDiff === '' ? '# diff-empty (normalized)\n' : `baseline:\n${normalize(dayBase.out)}\n--- worker:\n${normalize(dayWorker.out)}\n`)

  const checks = [
    ['taxonomy.mjs passes against the Worker', taxWorker.code === 0],
    ['daily-gates.mjs passes against the Worker', dayWorker.code === 0],
    ['taxonomy output byte-identical to baseline', taxDiff === ''],
    ['daily-gates output byte-identical to baseline', dayDiff === ''],
  ]
  let failed = 0
  for (const [name, ok] of checks) { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) failed++ }

  writeFileSync(join(EVIDENCE, 'summary.json'), JSON.stringify({
    gate: 'V5 compute-unchanged (T-037)',
    at: new Date().toISOString(),
    worker: WORKER,
    baselineVia: RECORD_TARGET,
    note: 'local SELEMENE_API_KEY expired → baseline captured via the pre-migration prod proxy path and replayed byte-identically through the Worker',
    checks: Object.fromEntries(checks),
    verdict: failed ? 'FAIL' : 'PASS',
  }, null, 2))

  console.log(`\n[4/4] evidence → ${EVIDENCE} (baseline/worker outputs, diffs, session fixtures, summary.json)`)
  if (failed) { console.log(`\nV5 compute-unchanged gate: FAIL (${failed})`); process.exit(1) }
  console.log('\nV5 compute-unchanged gate: PASS — scripts green through the Worker AND diff-empty vs the engine baseline')
}
main()
