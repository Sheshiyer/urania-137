#!/usr/bin/env node
/**
 * T-068 — Live verification harness for the Phase-5 auth gates (V1–V4 +
 * no-dev-bypass-in-prod). Runs the checks that T-069/T-070/T-071/T-072/T-073
 * execute against the deployed environment and prints a per-gate
 * PASS/FAIL/SKIP summary with captured request/response evidence.
 *
 *   node scripts/verify/auth-gates.mjs --url https://urania-137.pages.dev
 *   node scripts/verify/auth-gates.mjs --url <base> --session-a <tok> --session-b <tok>
 *   node scripts/verify/auth-gates.mjs --strict     # SKIP also fails the run (Phase-5 sign-off)
 *
 * Base resolution (repo convention): URANIA_API_BASE env > --url flag >
 * positional argv > the production Pages default.
 *
 * Sessions (post-T-081; see scripts/verify/auth-gates.README.md):
 *   --session-a / CF_ACCESS_SESSION_A, --session-b / CF_ACCESS_SESSION_B.
 *   Token forms:  bare JWT (or `jwt:<tok>`)  → Cf-Access-Jwt-Assertion header
 *                 `cookie:<value>`           → Cookie: CF_Authorization=<value>
 *                 `service:<id>:<secret>`    → CF-Access-Client-Id/Secret headers
 *
 * Verdicts:
 *   PASS    check ran and the gate holds
 *   FAIL    check ran and the gate is violated        → exit 1
 *   SKIP    precondition missing (e.g. no real Access session yet — T-081
 *           is a pending human task). Never counted as a pass. With --strict,
 *           any SKIP exits 2 (T-079 sign-off requires all gates green).
 *
 * What runs TODAY against prod (no real JWT exists yet — T-081 pending):
 *   V1-style: unauthenticated /api/me, /api/folio (GET/POST/PATCH/DELETE),
 *   /api/folio/import, /api/selemene/*, and an unknown /api/* route all
 *   return 401 with the frozen {error,message} envelope (auth precedes
 *   routing; 404 exists only behind auth). No-dev-bypass: no header, cookie,
 *   query-param, alg=none JWT, or garbage token coerces an identity.
 *   The SPA shell serves 200 HTML (static Pages asset, outside the /api gate).
 *
 * What is SKIP until T-081 lands real OTP identities:
 *   V2 identity-mapped, V3 per-user isolation, V4 durable/cross-device read.
 *
 * Local dry-run (validation per the plan): against `wrangler pages dev` the
 * dev-identity binding injects a synthetic `dev:*` identity, so the 401
 * assertions don't apply. The harness detects that runtime, reports V1 as
 * SKIP(local-dev), and exercises the V2/V4 code paths against the injected
 * identity — proving harness logic before prod. On a non-loopback host an
 * unauthenticated 200 is a hard FAIL, never a dev-mode pass.
 */

import { writeFileSync } from 'node:fs'

const DEFAULT_BASE = 'https://urania-137.pages.dev'

// ---------- argv / env parsing ----------------------------------------------
const argv = process.argv.slice(2)
const flag = (name) => {
  const i = argv.indexOf(`--${name}`)
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null
}
const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--url' &&
  argv[i - 1] !== '--session-a' && argv[i - 1] !== '--session-b' && argv[i - 1] !== '--evidence-json')[0]

const BASE = (process.env.URANIA_API_BASE || flag('url') || positional || DEFAULT_BASE).replace(/\/+$/, '')
const SESSION_A = process.env.CF_ACCESS_SESSION_A || flag('session-a') || ''
const SESSION_B = process.env.CF_ACCESS_SESSION_B || flag('session-b') || ''
const STRICT = argv.includes('--strict')
const EVIDENCE_JSON = flag('evidence-json')

const isLoopback = (() => {
  try { return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(new URL(BASE).hostname) } catch { return false }
})()

// ---------- HTTP helpers ------------------------------------------------------
/** A session spec → request headers. */
function sessionHeaders(spec) {
  if (!spec) return {}
  if (spec.startsWith('cookie:')) return { cookie: `CF_Authorization=${spec.slice('cookie:'.length)}` }
  if (spec.startsWith('service:')) {
    const [, id, secret] = spec.split(':')
    return { 'CF-Access-Client-Id': id, 'CF-Access-Client-Secret': secret }
  }
  return { 'Cf-Access-Jwt-Assertion': spec.startsWith('jwt:') ? spec.slice(4) : spec }
}

/**
 * One captured request/response. Redirects are NOT followed so a CF Access
 * edge challenge (302 → the OTP login) is visible as evidence, not hidden.
 */
async function req(method, path, { headers = {}, body } = {}) {
  const h = { ...headers }
  if (body !== undefined) h['content-type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, {
    method, headers: h, redirect: 'manual',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* HTML / empty */ }
  return {
    method, path, status: res.status,
    location: res.headers.get('location') || '',
    contentType: res.headers.get('content-type') || '',
    json, snippet: text.slice(0, 160).replace(/\s+/g, ' ').trim(),
  }
}

const isAuthBlock = (r) =>
  r.status === 401 ||
  r.status === 403 ||
  ([301, 302, 303, 307, 308].includes(r.status) && /cloudflareaccess|cdn-cgi\/access/i.test(r.location))

/** Frozen ApiError envelope: {error, message} and nothing that leaks data. */
const isErrorEnvelope = (r) =>
  r.json && typeof r.json.error === 'string' && typeof r.json.message === 'string' &&
  !('readings' in r.json) && !('result' in r.json) && !('engine_outputs' in r.json)

// ---------- check runner ------------------------------------------------------
const results = []
const check = async (gate, name, needs, fn) => {
  const missing = needs.filter((n) => (n === 'A' && !SESSION_A) || (n === 'B' && !SESSION_B))
  if (missing.length) {
    const verdict = {
      gate, name, verdict: 'SKIP',
      detail: `requires CF Access session ${missing.join('+')} — blocked on T-081 (no real OTP identity yet)`,
      evidence: [],
    }
    results.push(verdict)
    console.log(`  SKIP  ${gate.padEnd(7)} ${name.padEnd(34)} ${verdict.detail}`)
    return verdict
  }
  let v
  try {
    v = await fn()
  } catch (e) {
    v = { verdict: 'FAIL', detail: `harness error: ${String(e.message).slice(0, 120)}`, evidence: [] }
  }
  const r = { gate, name, ...v }
  results.push(r)
  console.log(`  ${r.verdict.padEnd(5)} ${gate.padEnd(7)} ${name.padEnd(34)} ${r.detail}`)
  for (const ev of r.evidence ?? []) {
    const loc = ev.location ? ` → ${ev.location.slice(0, 60)}` : ''
    console.log(`        ${ev.method} ${ev.path} → ${ev.status}${loc}  ${ev.snippet.slice(0, 100)}`)
  }
  return r
}

// Post-T-066 the Access edge answers unauthenticated requests FIRST with a
// 302 → team OTP login (no JSON body). That IS the auth block; the Worker's
// frozen {error,message} 401 envelope now lives behind the edge and is only
// reachable with a credential that passes the edge but fails Worker
// verification. So: a redirect to cloudflareaccess passes outright; a
// 401/403 must additionally carry the frozen envelope.
const expect401 = (label) => (r) => {
  if (!isAuthBlock(r)) {
    return { verdict: 'FAIL', detail: `${label} NOT blocked: status ${r.status}, envelope=${isErrorEnvelope(r)}` }
  }
  if ([301, 302, 303, 307, 308].includes(r.status)) {
    return { verdict: 'PASS', detail: `${label} blocked at the Access edge (${r.status} → OTP challenge)` }
  }
  return isErrorEnvelope(r)
    ? { verdict: 'PASS', detail: `${label} blocked (${r.status}, {error,message} envelope, no data keys)` }
    : { verdict: 'FAIL', detail: `${label} blocked with ${r.status} but the frozen {error,message} envelope is violated` }
}

// ---------- gates ---------------------------------------------------------------
const main = async () => {
  console.log(`Auth gates harness (T-068) · base ${BASE}`)
  console.log(`sessions: A=${SESSION_A ? 'provided' : 'none'} B=${SESSION_B ? 'provided' : 'none'} · strict=${STRICT}\n`)

  // Preflight: classify the target runtime (auth-enforced vs local dev-identity).
  const probe = await req('GET', '/api/me')
  const devIdentity = probe.status === 200 && typeof probe.json?.id === 'string' && probe.json.id.startsWith('dev:')
  if (probe.status === 200 && !devIdentity && !SESSION_A) {
    console.log(`  FAIL  preflight unauthenticated GET /api/me returned 200 with a NON-dev identity — V1 broken`)
    results.push({ gate: 'preflight', name: 'unauth /api/me', verdict: 'FAIL', detail: 'anonymous identity granted', evidence: [probe] })
    return finish()
  }
  if (devIdentity) {
    const where = isLoopback ? 'local dev runtime' : 'NON-LOOPBACK HOST — dev identity must be inert here'
    console.log(`  note  target injects the dev identity (${probe.json.id}) — ${where}\n`)
    if (!isLoopback) {
      results.push({ gate: 'bypass', name: 'dev-identity inert in prod', verdict: 'FAIL', detail: `dev identity live on ${BASE}`, evidence: [probe] })
      return finish()
    }
  }

  // --- V1 · auth-required (T-069) — runnable today -----------------------------
  if (devIdentity) {
    for (const name of ['me 401', 'folio GET 401', 'folio POST 401', 'folio PATCH 401', 'folio DELETE 401', 'folio import 401', 'selemene 401', 'unknown-route 401']) {
      results.push({ gate: 'V1', name, verdict: 'SKIP', detail: 'local dev-identity runtime injects identity — 401 assertions are prod-only', evidence: [] })
      console.log(`  SKIP  V1      ${name.padEnd(34)} local dev-identity runtime — prod-only assertion`)
    }
  } else {
    await check('V1', 'me 401', [], async () => ({ ...expect401('/api/me')(probe), evidence: [probe] }))
    await check('V1', 'folio GET 401', [], async () => { const r = await req('GET', '/api/folio'); return { ...expect401('/api/folio')(r), evidence: [r] } })
    await check('V1', 'folio POST 401', [], async () => {
      const r = await req('POST', '/api/folio', { body: { nodeId: 'n', nodeLabel: 'l', mode: 'm', title: 't', content: 'c' } })
      return { ...expect401('POST /api/folio (auth precedes body validation)')(r), evidence: [r] }
    })
    await check('V1', 'folio PATCH 401', [], async () => { const r = await req('PATCH', '/api/folio/auth-gates-probe', { body: { favorite: true } }); return { ...expect401('PATCH /api/folio/:id')(r), evidence: [r] } })
    await check('V1', 'folio DELETE 401', [], async () => { const r = await req('DELETE', '/api/folio/auth-gates-probe'); return { ...expect401('DELETE /api/folio/:id')(r), evidence: [r] } })
    await check('V1', 'folio import 401', [], async () => { const r = await req('POST', '/api/folio/import', { body: { entries: [] } }); return { ...expect401('POST /api/folio/import')(r), evidence: [r] } })
    await check('V1', 'selemene 401', [], async () => { const r = await req('GET', '/api/selemene/api/v1/workflows'); return { ...expect401('/api/selemene/*')(r), evidence: [r] } })
    await check('V1', 'unknown-route 401', [], async () => {
      const r = await req('GET', '/api/definitely-not-a-route')
      return { ...expect401('unknown /api/* route (auth precedes routing; 404 is behind-auth only)')(r), evidence: [r] }
    })
  }

  // --- SPA shell serves (static asset, outside the /api gate) -------------------
  await check('SPA', 'shell serves', [], async () => {
    const r = await req('GET', '/')
    if (r.status === 200 && /text\/html/.test(r.contentType)) {
      return { verdict: 'PASS', detail: 'GET / → 200 text/html (Pages static asset; the Worker gate covers /api/* only)', evidence: [r] }
    }
    if ([301, 302, 303, 307, 308].includes(r.status) && /cloudflareaccess|cdn-cgi\/access/i.test(r.location)) {
      return { verdict: 'PASS', detail: 'GET / → Access edge challenge (edge-level enforcement active post-T-081)', evidence: [r] }
    }
    return { verdict: 'FAIL', detail: `GET / → ${r.status} ${r.contentType} — neither SPA HTML nor an Access challenge`, evidence: [r] }
  })

  // --- no-dev-bypass-in-prod (T-073) — runnable today ---------------------------
  // The dev-identity injection reads ONLY the DEV_IDENTITY_EMAIL binding var
  // (frozen contract §c); no client-supplied variant may coerce an identity.
  if (!devIdentity) {
    const forgedNone = (() => {
      const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
      return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ email: 'bypass@example.com', sub: 'forged', aud: 'x', iss: 'x', exp: 4102444800 })}.`
    })()
    const variants = [
      ['header DEV_IDENTITY_EMAIL', { headers: { DEV_IDENTITY_EMAIL: 'bypass@example.com' } }],
      ['header X-Dev-Identity-Email', { headers: { 'X-Dev-Identity-Email': 'bypass@example.com' } }],
      ['header X-Dev-Identity', { headers: { 'X-Dev-Identity': 'bypass@example.com' } }],
      ['query param', { path: '/api/me?dev_identity_email=bypass@example.com&email=bypass@example.com' }],
      ['cookie', { headers: { cookie: 'DEV_IDENTITY_EMAIL=bypass@example.com' } }],
      ['alg=none forged JWT', { headers: { 'Cf-Access-Jwt-Assertion': forgedNone } }],
      ['garbage token', { headers: { 'Cf-Access-Jwt-Assertion': 'not-a-jwt' } }],
    ]
    for (const [label, opt] of variants) {
      await check('bypass', label, [], async () => {
        const r = await req('GET', opt.path || '/api/me', { headers: opt.headers || {} })
        return isAuthBlock(r)
          ? { verdict: 'PASS', detail: `${label} coerces no identity (${r.status})`, evidence: [r] }
          : { verdict: 'FAIL', detail: `${label} GRANTED ACCESS: ${r.status}`, evidence: [r] }
      })
    }
  } else {
    console.log('  SKIP  bypass  all variants                     local dev-identity runtime — prod-only assertion')
    results.push({ gate: 'bypass', name: 'all variants', verdict: 'SKIP', detail: 'local dev runtime — the bypass probes are prod-only', evidence: [] })
  }

  // --- V2 · identity-mapped (T-070) — needs session A ---------------------------
  const identityFor = async (spec) => {
    const r = await req('GET', '/api/me', { headers: sessionHeaders(spec) })
    return r
  }
  const sessionALabel = SESSION_A ? 'session A' : devIdentity ? 'injected dev identity' : null

  if (devIdentity && !SESSION_A) {
    // Local dry-run: exercise the V2/V4 code paths against the injected identity.
    await check('V2', 'identity-mapped (dev dry-run)', [], async () => {
      const r1 = await req('GET', '/api/me')
      const r2 = await req('GET', '/api/me')
      const ok = r1.status === 200 && typeof r1.json?.id === 'string' && typeof r1.json?.email === 'string' &&
        r2.status === 200 && r2.json?.id === r1.json?.id
      return ok
        ? { verdict: 'PASS', detail: `GET /api/me → {id:${r1.json.id.slice(0, 24)}…, email:${r1.json.email}} stable across calls`, evidence: [r1, r2] }
        : { verdict: 'FAIL', detail: `dev /api/me shape wrong or unstable: ${r1.status}/${r2.status}`, evidence: [r1, r2] }
    })
  } else {
    await check('V2', 'identity-mapped', ['A'], async () => {
      const r1 = await identityFor(SESSION_A)
      if (r1.status !== 200) return { verdict: 'FAIL', detail: `session A rejected: ${r1.status} (invalid/expired token?)`, evidence: [r1] }
      const r2 = await identityFor(SESSION_A)
      const ok = typeof r1.json?.id === 'string' && r1.json.id.length > 0 &&
        typeof r1.json?.email === 'string' && r1.json.email.includes('@') &&
        r2.status === 200 && r2.json?.id === r1.json.id
      return ok
        ? { verdict: 'PASS', detail: `{id, email} = ${r1.json.email} · id stable across calls (D1 users-row/last_seen diff is T-070's manual step)`, evidence: [r1, r2] }
        : { verdict: 'FAIL', detail: `bad MeResponse shape or unstable id: ${r1.snippet}`, evidence: [r1, r2] }
    })
  }

  // --- V3 · per-user isolation (T-071) — needs sessions A + B --------------------
  await check('V3', 'per-user isolation', ['A', 'B'], async () => {
    const marker = `auth-gates-v3-${Date.now()}`
    const create = await req('POST', '/api/folio', {
      headers: sessionHeaders(SESSION_A),
      body: { nodeId: 'auth-gates', nodeLabel: 'Auth Gates', mode: 'probe', title: marker, content: `V3 probe ${marker}` },
    })
    if (create.status !== 201) return { verdict: 'FAIL', detail: `A could not create the probe reading: ${create.status}`, evidence: [create] }
    const id = create.json.id
    const bList = await req('GET', '/api/folio', { headers: sessionHeaders(SESSION_B) })
    const bPatch = await req('PATCH', `/api/folio/${encodeURIComponent(id)}`, { headers: sessionHeaders(SESSION_B), body: { favorite: true } })
    const bDelete = await req('DELETE', `/api/folio/${encodeURIComponent(id)}`, { headers: sessionHeaders(SESSION_B) })
    const cleanup = await req('DELETE', `/api/folio/${encodeURIComponent(id)}`, { headers: sessionHeaders(SESSION_A) })
    const leaked = bList.status === 200 && (bList.json?.readings ?? []).some((x) => x.id === id || x.title === marker)
    const crossOk = bPatch.status === 404 && bDelete.status === 404 // cross-user id indistinguishable from unknown
    const ok = bList.status === 200 && !leaked && crossOk
    return ok
      ? { verdict: 'PASS', detail: `B's list excludes A's reading; B PATCH/DELETE of A's id → 404/404 (no existence leak)`, evidence: [create, bList, bPatch, bDelete, cleanup] }
      : { verdict: 'FAIL', detail: `isolation violated: leaked=${leaked} bList=${bList.status} bPatch=${bPatch.status} bDelete=${bDelete.status}`, evidence: [create, bList, bPatch, bDelete, cleanup] }
  })

  // --- V4 · durable / cross-device read (T-072) — needs session A ----------------
  // A fresh HTTP client carrying ONLY the Access credential (no cookies, no
  // localStorage) stands in for the fresh browser profile; the two-profile
  // browser walkthrough remains T-072's manual half.
  await check('V4', 'durable read (fresh client)', devIdentity && !SESSION_A ? [] : ['A'], async () => {
    const headers = devIdentity && !SESSION_A ? {} : sessionHeaders(SESSION_A)
    const marker = `auth-gates-v4-${Date.now()}`
    const raw = JSON.stringify({ probe: marker })
    const create = await req('POST', '/api/folio', {
      headers,
      body: { nodeId: 'auth-gates', nodeLabel: 'Auth Gates', mode: 'probe', title: marker, content: `V4 probe ${marker}`, raw },
    })
    if (create.status !== 201) return { verdict: 'FAIL', detail: `could not create the probe reading (${sessionALabel ?? 'session A'}): ${create.status}`, evidence: [create] }
    const id = create.json.id
    const list = await req('GET', '/api/folio', { headers }) // fresh request, credential only
    const found = (list.json?.readings ?? []).find((x) => x.id === id)
    const cleanup = await req('DELETE', `/api/folio/${encodeURIComponent(id)}`, { headers })
    const ok = list.status === 200 && found && found.content === `V4 probe ${marker}`
    return ok
      ? { verdict: 'PASS', detail: `reading persisted server-side; re-read in a clean client with identical content (D1-backed, not localStorage)`, evidence: [create, list, cleanup] }
      : { verdict: 'FAIL', detail: `durable read failed: list=${list.status} found=${Boolean(found)} contentMatch=${found?.content === `V4 probe ${marker}`}`, evidence: [create, list, cleanup] }
  })

  return finish()
}

// ---------- summary / exit ------------------------------------------------------
function finish() {
  const counts = { PASS: 0, FAIL: 0, SKIP: 0 }
  for (const r of results) counts[r.verdict] = (counts[r.verdict] ?? 0) + 1
  console.log(`\n${counts.PASS} PASS · ${counts.FAIL} FAIL · ${counts.SKIP} SKIP  (${results.length} checks)`)
  const fails = results.filter((r) => r.verdict === 'FAIL')
  if (fails.length) {
    console.log('\nFAILURES:')
    for (const f of fails) console.log(`  ${f.gate} / ${f.name} → ${f.detail}`)
  }
  const skips = results.filter((r) => r.verdict === 'SKIP')
  if (skips.length) {
    console.log('\nSKIPPED (precondition missing — NOT passes):')
    for (const s of skips) console.log(`  ${s.gate} / ${s.name} → ${s.detail}`)
  }
  if (EVIDENCE_JSON) {
    writeFileSync(EVIDENCE_JSON, JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2))
    console.log(`\nevidence written to ${EVIDENCE_JSON}`)
  }
  if (fails.length) process.exit(1)
  if (STRICT && skips.length) {
    console.log('\n--strict: SKIPs are not acceptable for sign-off → exit 2')
    process.exit(2)
  }
  process.exit(0)
}

main()
