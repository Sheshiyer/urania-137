#!/usr/bin/env node
/**
 * R-3 — Split-host production smoke gates (read-only).
 *
 * Proves the split-host topology AFTER deploy, before attestation:
 *   1. The protected application hostname is behind Cloudflare Access
 *      (unauthenticated → 302 challenge to cloudflareaccess/cdn-cgi/access).
 *   2. A service-token smoke credential reaches the protected app (200),
 *      proving the owner-scoped session path works without a human OTP.
 *   3. The public landing hostname is NOT behind Access (200, no challenge)
 *      and contains no application/API markers (leak check).
 *
 * `--deny-mutations` is the frozen release.yml posture: the probe refuses to
 * issue anything other than GET/HEAD. Any attempt to configure a mutation (or
 * a probe plan that would need one) fails closed.
 *
 *   node scripts/verify/split-host-gates.mjs \
 *     --targets .release-input/production-targets.json \
 *     --smoke-client-id "$CF_ACCESS_SMOKE_CLIENT_ID" \
 *     --smoke-client-secret "$CF_ACCESS_SMOKE_CLIENT_SECRET" \
 *     --deny-mutations
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const FORBIDDEN_APP_MARKERS = ['/api/me', '/api/subjects', 'CF_ACCESS_AUD', 'AppShell', '#/console']

/** Validate the split-host shape (no network). */
export function validateSplitHostTargets(targets) {
  const issues = []
  if (!targets?.protectedHostname) issues.push('protectedHostname required')
  if (!targets?.publicHostname) issues.push('publicHostname required')
  if (!targets?.accessAud) issues.push('accessAud required')
  if (targets?.protectedHostname && targets?.publicHostname && targets.protectedHostname === targets.publicHostname) {
    issues.push('protectedHostname must differ from publicHostname (split-host)')
  }
  return issues
}

/**
 * Build the read-only probe plan. Returns probes as { name, url, method,
 * headers, expect } where expect is a predicate receiving { status, location,
 * body }. Fails closed if `denyMutations` is set and any probe would need a
 * non-GET/HEAD method.
 */
export function buildSplitHostProbePlan(targets, { smokeClientId = null, smokeClientSecret = null, denyMutations = true } = {}) {
  const shapeIssues = validateSplitHostTargets(targets)
  if (shapeIssues.length > 0) throw new Error(`split-host targets invalid: ${shapeIssues.join('; ')}`)

  const protectedUrl = `https://${targets.protectedHostname}/`
  const publicUrl = `https://${targets.publicHostname}/`

  const probes = [
    {
      name: 'protected-unauthenticated-is-challenged',
      url: protectedUrl,
      method: 'GET',
      headers: {},
      expect: ({ status, location }) =>
        [301, 302, 303, 307, 308].includes(status) && /cloudflareaccess|cdn-cgi\/access/i.test(location || ''),
      reason: 'protected host must redirect an unauthenticated GET to the CF Access challenge',
    },
    {
      name: 'public-landing-is-open-and-clean',
      url: publicUrl,
      method: 'GET',
      headers: {},
      expect: ({ status, location, body }) => {
        if ([301, 302, 303, 307, 308].includes(status) && /cloudflareaccess|cdn-cgi\/access/i.test(location || '')) return false
        if (status !== 200) return false
        for (const marker of FORBIDDEN_APP_MARKERS) if (body?.includes(marker)) return false
        return true
      },
      reason: 'public host must serve 200 without an Access challenge and without app markers',
    },
  ]

  if (smokeClientId && smokeClientSecret) {
    probes.push({
      name: 'protected-service-token-smoke',
      url: protectedUrl,
      method: 'GET',
      headers: {
        'CF-Access-Client-Id': smokeClientId,
        'CF-Access-Client-Secret': smokeClientSecret,
      },
      expect: ({ status }) => status === 200,
      reason: 'service-token smoke credential must reach the protected app (200)',
    })
  }

  if (denyMutations) {
    const mutating = probes.filter((p) => MUTATING_METHODS.has(p.method.toUpperCase()))
    if (mutating.length > 0) {
      throw new Error(`--deny-mutations forbids non-read probes: ${mutating.map((p) => p.name).join(', ')}`)
    }
  }

  return probes
}

/**
 * Run the probe plan via an injectable fetch. `fetchImpl` receives (url, init)
 * and returns { status, location, body } (a minimal Response-like object).
 * Returns { ok, results }.
 */
export async function runSplitHostProbes(probes, { fetchImpl }) {
  const results = []
  for (const probe of probes) {
    const res = await fetchImpl(probe.url, {
      method: probe.method,
      headers: probe.headers,
      redirect: 'manual',
    })
    const status = res.status ?? 500
    const location = res.headers?.get?.('location') ?? res.location ?? ''
    const body = res.text ? await res.text() : (res.body ?? '')
    const ok = probe.expect({ status, location, body })
    results.push({ name: probe.name, ok, status, detail: ok ? probe.reason : `${probe.reason} (status ${status})` })
  }
  return { ok: results.every((r) => r.ok), results }
}

function parseArgs(argv) {
  const args = { targets: null, smokeClientId: null, smokeClientSecret: null, denyMutations: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--targets') args.targets = argv[++index]
    else if (arg === '--smoke-client-id') args.smokeClientId = argv[++index]
    else if (arg === '--smoke-client-secret') args.smokeClientSecret = argv[++index]
    else if (arg === '--deny-mutations') args.denyMutations = true
    else throw new Error(`unknown argument: ${arg}`)
  }
  if (!args.targets) throw new Error('split-host-gates requires --targets <file>')
  return args
}

const invokedAs = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === invokedAs) {
  try {
    const args = parseArgs(process.argv.slice(2))
    const targets = JSON.parse(readFileSync(resolve(args.targets), 'utf8'))
    const probes = buildSplitHostProbePlan(targets, {
      smokeClientId: args.smokeClientId,
      smokeClientSecret: args.smokeClientSecret,
      denyMutations: args.denyMutations,
    })
    const report = await runSplitHostProbes(probes, { fetchImpl: fetch })
    console.log(JSON.stringify(report, null, 2))
    if (!report.ok) process.exitCode = 1
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2))
    process.exitCode = 1
  }
}
