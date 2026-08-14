import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildSplitHostProbePlan,
  runSplitHostProbes,
  validateSplitHostTargets,
} from './split-host-gates.mjs'
import { buildAlertProbePlan, redactProbe } from '../ops/alert-probe.mjs'

const TARGETS = {
  protectedHostname: 'urania.tryambakam.space',
  publicHostname: 'urania-landing.tryambakam.space',
  accessAud: 'a'.repeat(64),
  alertDestinationId: 'dest-123',
}

test('validateSplitHostTargets enforces the split-host shape', () => {
  assert.deepEqual(validateSplitHostTargets(TARGETS), [])
  assert.ok(validateSplitHostTargets({}).length > 0)
  const collapsed = { ...TARGETS, publicHostname: TARGETS.protectedHostname }
  assert.ok(validateSplitHostTargets(collapsed).some((i) => i.includes('differ')))
})

test('buildSplitHostProbePlan builds read-only probes and honors deny-mutations', () => {
  const probes = buildSplitHostProbePlan(TARGETS, {
    smokeClientId: 'id',
    smokeClientSecret: 'secret',
    denyMutations: true,
  })
  assert.equal(probes.length, 3)
  for (const probe of probes) assert.equal(probe.method, 'GET')

  const noSmoke = buildSplitHostProbePlan(TARGETS, { denyMutations: true })
  assert.equal(noSmoke.length, 2)
  assert.ok(noSmoke.every((p) => p.name !== 'protected-service-token-smoke'))
})

test('runSplitHostProbes classifies pass/fail correctly', async () => {
  const probes = buildSplitHostProbePlan(TARGETS, { denyMutations: true })
  const fetchImpl = async (url) => {
    if (url.includes('urania.tryambakam.space')) {
      return { status: 302, location: 'https://red-queen-4dfa.cloudflareaccess.com/cdn-cgi/access/login', text: async () => '' }
    }
    return { status: 200, location: '', text: async () => '<html><body>landing only</body></html>' }
  }
  const report = await runSplitHostProbes(probes, { fetchImpl })
  assert.equal(report.ok, true, JSON.stringify(report.results))

  // A public host that leaks an app marker must fail.
  const leaky = await runSplitHostProbes(probes, {
    fetchImpl: async (url) => {
      if (url.includes('urania.tryambakam.space')) {
        return { status: 302, location: 'https://red-queen-4dfa.cloudflareaccess.com/cdn-cgi/access/login', text: async () => '' }
      }
      return { status: 200, location: '', text: async () => '<html><body>/api/me</body></html>' }
    },
  })
  assert.equal(leaky.ok, false)
  assert.ok(leaky.results.some((r) => r.name === 'public-landing-is-open-and-clean' && r.ok === false))
})

test('alert probe fails closed until a notification destination is bound', () => {
  const result = buildAlertProbePlan(TARGETS, { token: 'probe-token-1234567890', expectDelivery: true })
  assert.equal(result.ok, false)
  assert.match(result.error, /notification destination/i)
})

test('alert probe plan (no delivery expectation) points at the app probe route', () => {
  const result = buildAlertProbePlan(TARGETS, { token: 'probe-token-1234567890', expectDelivery: false })
  assert.equal(result.ok, true)
  assert.equal(result.plan.url, 'https://urania.tryambakam.space/api/alert-probe')
  assert.equal(result.plan.method, 'POST')
  assert.equal(result.plan.expectDelivery, false)
})

test('alert probe rejects a missing/short token', () => {
  const noToken = buildAlertProbePlan(TARGETS, { token: '', expectDelivery: true })
  assert.equal(noToken.ok, false)
  assert.match(noToken.error, /token/)
})

test('redactProbe strips tokens and emails', () => {
  const out = redactProbe('token abcdefghijklmnopqrstuvwxyz1234 and user@example.com ok')
  assert.ok(!out.includes('abcdefghijklmnopqrstuvwxyz1234'))
  assert.ok(!out.includes('user@example.com'))
  assert.ok(out.includes('[REDACTED]'))
})
