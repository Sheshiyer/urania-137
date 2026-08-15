#!/usr/bin/env node
/**
 * OTP-free admin CLI (local-only) — FV-188 / T-088 / ISC-188 enabler.
 *
 * Exercises the SAME routes the FV-188 production-admin-session proof will
 * capture, but against `wrangler pages dev` on loopback, where the frozen
 * T-017 dev-identity injection synthesizes an identity and the local-only
 * CF_PLATFORM_ADMIN_EMAILS allowlist elevates it to `platform-admin`.
 *
 *   node scripts/ops/admin-session.mjs                      # GET /api/me + /api/admin/session
 *   node scripts/ops/admin-session.mjs --base http://localhost:8788
 *   node scripts/ops/admin-session.mjs --raw                # print raw JSON (no summary)
 *
 * LOCAL-ONLY. If --base points at a production hostname, the dev-identity
 * guard cannot fire (no loopback hostname) and every request fails closed
 * with 401 — which is the correct production posture. This script deliberately
 * does NOT send any credential; it relies solely on the local injection.
 *
 * Exit 0 when the admin session resolves platform-admin + admin:analytics:read;
 * exit 1 on any failure (used as a CI-able gate locally).
 */
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_BASE = 'http://localhost:8788'

function parseArgs(argv) {
  const out = { base: process.env.URANIA_API_BASE ?? DEFAULT_BASE, raw: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--base' && argv[i + 1]) out.base = argv[++i]
    else if (a === '--raw') out.raw = true
  }
  return out
}

function isLoopback(base) {
  try {
    const h = new URL(base).hostname
    return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(h)
  } catch {
    return false
  }
}

async function getJson(base, pathname) {
  const url = new URL(pathname, base)
  const res = await fetch(url)
  let body = null
  try {
    body = await res.json()
  } catch {
    // non-JSON (e.g. HTML shell) → body stays null
  }
  return { status: res.status, body }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!isLoopback(args.base)) {
    console.error(
      `admin-session.mjs is LOCAL-ONLY. --base ${args.base} is not loopback; ` +
        `the dev-identity guard cannot fire there and every request will 401 (correct prod posture).`,
    )
    process.exit(2)
  }

  const me = await getJson(args.base, '/api/me')
  const admin = await getJson(args.base, '/api/admin/session')

  if (args.raw) {
    console.log(JSON.stringify({ me, admin }, null, 2))
  } else {
    const meOk = me.status === 200 && me.body?.email === 'dev@urania.local'
    const adminOk =
      admin.status === 200 &&
      admin.body?.principal === 'platform-admin' &&
      admin.body?.hasAdminAnalyticsRead === true &&
      Array.isArray(admin.body?.roles) &&
      admin.body.roles.includes('platform-admin') &&
      Array.isArray(admin.body?.permissions) &&
      admin.body.permissions.includes('admin:analytics')

    console.log(`GET /api/me            → ${me.status}  ${meOk ? 'PASS' : 'FAIL'}  email=${me.body?.email ?? '(none)'}`)
    console.log(
      `GET /api/admin/session → ${admin.status}  ${adminOk ? 'PASS' : 'FAIL'}  principal=${admin.body?.principal ?? '(none)'}  roles=${JSON.stringify(admin.body?.roles ?? [])}`,
    )

    if (!meOk || !adminOk) {
      console.error('\nFV-188 local admin proof FAILED. Full response:')
      console.error(JSON.stringify({ me, admin }, null, 2))
      process.exit(1)
    }
    console.log('\nFV-188 local admin-session proof: OK (platform-admin + admin:analytics:read)')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

// Re-export for node --test compatibility (pure helpers).
export { isLoopback, getJson, parseArgs }
