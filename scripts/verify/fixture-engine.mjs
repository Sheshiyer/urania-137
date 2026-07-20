/**
 * Fixture engine (T-038) — a deterministic stand-in for the Selemene engine used
 * for golden parity runs when no valid local SELEMENE_API_KEY is obtainable.
 *
 *   # RECORD: proxy requests to a live upstream (e.g. the prod Vercel proxy,
 *   #         which injects the valid server-side key) and persist each response.
 *   node scripts/verify/fixture-engine.mjs --port 8795 \
 *     --fixtures <dir> --record https://urania-137.vercel.app/api/selemene
 *
 *   # REPLAY: serve the persisted fixtures, streaming bodies in chunks.
 *   #         Asserts the upstream X-API-Key the Worker injects (T-032 proof).
 *   node scripts/verify/fixture-engine.mjs --port 8795 \
 *     --fixtures <dir> --replay --require-key p2-stub-key
 *
 * A fixture is keyed by sha256(METHOD + path?query + raw-body), so identical
 * deterministic-seed requests resolve to identical bytes. Replay misses fail
 * LOUD (502) — a green parity run can never be a silent fallthrough.
 *
 * Point the Worker at this stub with:
 *   SELEMENE_API_URL=http://localhost:8795 SELEMENE_API_KEY=p2-stub-key \
 *     npx wrangler pages dev dist --port 8788
 * (process env overrides .dev.vars in wrangler pages dev; .dev.vars is untouched.)
 */
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const arg = (name, dflt = undefined) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : dflt
}
const PORT = Number(arg('port', 8795))
const FIXTURES = arg('fixtures', 'scripts/verify/fixtures/golden')
const RECORD = arg('record') // upstream base, e.g. https://host/api/selemene
const REPLAY = process.argv.includes('--replay')
const REQUIRE_KEY = arg('require-key') // expected upstream x-api-key in replay mode
const CHUNK = 16 * 1024 // replay streaming chunk size
const CHUNK_DELAY_MS = 5

if (!RECORD && !REPLAY) {
  console.error('usage: fixture-engine.mjs --fixtures <dir> (--record <upstream-base> | --replay [--require-key <k>]) [--port 8795]')
  process.exit(2)
}
mkdirSync(FIXTURES, { recursive: true })

const keyFor = (method, path, body) =>
  createHash('sha256').update(`${method} ${path}\n${body}`).digest('hex')

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })

let served = 0
let recorded = 0

const server = createServer(async (req, res) => {
  const body = await readBody(req)
  const method = (req.method || 'GET').toUpperCase()
  // Normalize: scripts call this stub directly with the /api/selemene prefix;
  // the Worker's engine-proxy strips that prefix before forwarding upstream.
  // Keying on the stripped path makes both request styles hit the same fixture.
  const path = (req.url || '/').replace(/^\/api\/selemene(?=\/|$)/, '') || '/'
  const file = join(FIXTURES, `${keyFor(method, path, body)}.json`)

  if (RECORD) {
    const upstream = await fetch(`${RECORD.replace(/\/+$/, '')}${path}`, {
      method,
      headers: { 'Content-Type': req.headers['content-type'] || 'application/json', Accept: 'application/json' },
      body: method === 'GET' || method === 'HEAD' ? undefined : body,
    })
    const text = await upstream.text()
    const fixture = {
      method,
      path,
      status: upstream.status,
      contentType: upstream.headers.get('content-type') || 'application/json',
      body: text,
    }
    writeFileSync(file, JSON.stringify(fixture))
    recorded++
    res.writeHead(upstream.status, { 'Content-Type': fixture.contentType })
    res.end(text)
    return
  }

  // REPLAY
  const upstreamKey = req.headers['x-api-key']
  if (REQUIRE_KEY !== undefined && upstreamKey !== REQUIRE_KEY) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'UNAUTHORIZED', message: 'stub engine: missing/wrong upstream x-api-key' }))
    return
  }
  if (!existsSync(file)) {
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'fixture_miss', method, path, bodySha256: keyFor(method, path, body).slice(0, 16) }))
    return
  }
  const fixture = JSON.parse(readFileSync(file, 'utf8'))
  served++
  res.writeHead(fixture.status, { 'Content-Type': fixture.contentType })
  // Stream the body in chunks so proxy buffering would show up in TTFB timing.
  for (let i = 0; i < fixture.body.length; i += CHUNK) {
    res.write(fixture.body.slice(i, i + CHUNK))
    await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS))
  }
  res.end()
})

server.listen(PORT, '127.0.0.1', () => {
  const mode = RECORD ? `record → ${RECORD}` : `replay (${REQUIRE_KEY !== undefined ? 'key required' : 'no key check'})`
  const n = REPLAY ? readdirSync(FIXTURES).filter((f) => f.endsWith('.json')).length : 0
  console.log(`fixture-engine ${mode} · fixtures ${FIXTURES}${REPLAY ? ` (${n} loaded)` : ''} · http://127.0.0.1:${PORT}`)
})
process.on('SIGTERM', () => {
  console.log(`fixture-engine: ${recorded} recorded, ${served} served`)
  process.exit(0)
})
