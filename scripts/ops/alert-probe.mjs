#!/usr/bin/env node
/**
 * R-3 — Alert delivery probe (read-only, fail-closed).
 *
 * Proves the production alert destination actually delivers before attestation
 * stamps `probes.ok`. The alert pipeline is exercised OUT-OF-BAND: a bounded
 * probe token is POSTed to the protected app's alert-probe endpoint, which the
 * app forwards to its notification destination; the probe then verifies
 * delivery idempotently.
 *
 * NOTE (live dependency, T-088): the function-level auth/authorization layer
 * (`functions/lib/authorization.ts`, `functions/lib/csrf.ts`, smoke-principal
 * classification) now EXISTS, and the protected app exposes
 * `POST /api/alert-probe` which acknowledges a valid bearer token in constant
 * time. What is not yet wired is the in-app FORWARDING step: no notification
 * destination is bound to the route, so the app cannot attest real delivery.
 * Until that destination is bound, this script fails closed (with `--expect-delivery`)
 * rather than fabricating success.
 *
 * Frozen release.yml invocation:
 *   node scripts/ops/alert-probe.mjs \
 *     --targets .release-input/production-targets.json \
 *     --token "$ALERT_PROBE_TOKEN" \
 *     --expect-delivery
 *
 * The plan builder + redaction are exported for the node test suite.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const TOKEN_RE = /^[A-Za-z0-9._-]{16,}$/

/** Redact the probe token (and any raw email/hex) from operator output. */
export function redactProbe(text) {
  return String(text ?? '')
    .replace(/\b[A-Za-z0-9._-]{20,}\b/g, '[REDACTED]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED]')
}

/**
 * Build the alert probe plan. `destinationId` (Cloudflare notification
 * destination) is required in the targets file; a missing/invalid token or
 * destination fails closed. Returns { ok, plan | error }.
 */
export function buildAlertProbePlan(targets, { token, expectDelivery = true } = {}) {
  const issues = []
  if (!TOKEN_RE.test(token ?? '')) issues.push('probe token missing or too short')
  if (!targets?.alertDestinationId) issues.push('alertDestinationId missing from targets')
  if (!targets?.protectedHostname) issues.push('protectedHostname missing from targets')
  if (issues.length > 0) return { ok: false, error: `alert probe precondition failed: ${issues.join('; ')}` }

  // Fail-closed: the in-app route + authorization layer exist (T-088), but the
  // route does not yet forward to a bound notification destination. With
  // --expect-delivery the probe therefore cannot attest delivery.
  if (expectDelivery) {
    return {
      ok: false,
      error:
        'alert-probe route exists (T-088) but no notification destination is ' +
        'bound yet; real alert delivery cannot be attested. Bind the ' +
        'notification destination to POST /api/alert-probe before production ' +
        'attestation stamps probes.ok.',
    }
  }
  return {
    ok: true,
    plan: {
      method: 'POST',
      url: `https://${targets.protectedHostname}/api/alert-probe`,
      body: { token: '[REDACTED]' },
      expectDelivery: false,
    },
  }
}

function parseArgs(argv) {
  const args = { targets: null, token: '', expectDelivery: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--targets') args.targets = argv[++index]
    else if (arg === '--token') args.token = argv[++index]
    else if (arg === '--expect-delivery') args.expectDelivery = true
    else throw new Error(`unknown argument: ${arg}`)
  }
  if (!args.targets) throw new Error('alert-probe requires --targets <file>')
  return args
}

const invokedAs = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === invokedAs) {
  try {
    const args = parseArgs(process.argv.slice(2))
    const targets = JSON.parse(readFileSync(resolve(args.targets), 'utf8'))
    const result = buildAlertProbePlan(targets, { token: args.token, expectDelivery: args.expectDelivery })
    if (!result.ok) {
      console.error(JSON.stringify({ ok: false, error: redactProbe(result.error) }, null, 2))
      process.exitCode = 1
    } else {
      console.log(JSON.stringify({ ok: true, plan: result.plan }, null, 2))
    }
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: redactProbe(error instanceof Error ? error.message : String(error)) }, null, 2))
    process.exitCode = 1
  }
}
