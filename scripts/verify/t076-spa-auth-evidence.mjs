/**
 * T-076 — live SPA auth-polish evidence capture.
 *
 * Drives https://urania.tryambakam.space with a real CF_Authorization session
 * cookie and captures the authenticated SPA states:
 *   1. home with the identity chip (email + logout affordance)
 *   2. Folio loading skeleton (delayed /api/folio)
 *   3. Folio loaded state (D1-backed list / empty state)
 *   4. Folio friendly error state (aborted /api/folio)
 *   5. logout wiring: clicking Logout must NAVIGATE to /api/logout
 *      (intercepted + aborted — NEVER followed, so the session stays valid)
 *
 * Usage:
 *   CF_ACCESS_TOKEN_FILE=/tmp/urania-session-a.jwt node scripts/verify/t076-spa-auth-evidence.mjs
 *
 * The token is read from the file at runtime, never printed, never committed.
 */

import { chromium } from 'playwright'
import { readFileSync, mkdirSync } from 'node:fs'

const BASE = process.env.T076_BASE_URL || 'https://urania.tryambakam.space'
const OUT = process.env.T076_OUT_DIR || 'docs/auth/evidence'
const tokenFile = process.env.CF_ACCESS_TOKEN_FILE || '/tmp/urania-session-a.jwt'
const token = readFileSync(tokenFile, 'utf8').trim()
if (!token) throw new Error(`empty token file: ${tokenFile}`)

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await context.addCookies([
  { name: 'CF_Authorization', value: token, domain: new URL(BASE).hostname, path: '/', httpOnly: true, secure: true },
])

const results = []
const page = await context.newPage()

// --- 1. Authenticated home — identity chip renders email + Logout ---------
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
const chip = page.locator('a[href="/api/logout"]')
const chipVisible = await chip.isVisible()
const chipLabel = (await chip.getAttribute('aria-label')) ?? ''
results.push(['identity chip visible with logout anchor', chipVisible && chipLabel.startsWith('Log out ')])
await page.screenshot({ path: `${OUT}/t076-1-home-identity-chip.png` })

// --- 2. Folio loading skeleton (delay /api/folio so the skeleton paints) --
// fetch+fulfill instead of continue: a delayed continue races Playwright's
// duplicate-request handling and can die with "Route is already handled".
await page.route('**/api/folio**', async (route) => {
  if (route.request().method() !== 'GET' || new URL(route.request().url()).pathname !== '/api/folio') return route.continue()
  await new Promise((r) => setTimeout(r, 1500))
  const res = await route.fetch()
  await route.fulfill({ response: res })
})
await page.goto(`${BASE}/#/node/folio`, { waitUntil: 'networkidle' })
// SVG orb labels render without spaces ("SavedReports").
await page.locator('text=SavedReports').first().click({ force: true })
await page.waitForSelector('[aria-label="Loading saved reports"]', { timeout: 5000 })
results.push(['folio loading skeleton rendered while /api/folio in flight', true])
await page.screenshot({ path: `${OUT}/t076-2-folio-loading-skeleton.png` })

// --- 3. Folio loaded state (D1-backed list; empty for this account) -------
// This account's GET /api/folio = {"readings":[]}, so the loaded state is the
// empty state. If the account ever has entries, the list satisfies this too.
const loaded = await page
  .locator('text=No saved reports yet')
  .or(page.locator('button[title="Delete"]').first())
  .first()
  .waitFor({ timeout: 15000 })
  .then(() => true)
  .catch(() => false)
results.push(['folio reached loaded state (D1-backed list or empty state)', loaded])
await page.screenshot({ path: `${OUT}/t076-3-folio-loaded.png` })
await page.unrouteAll()

// --- 4. Folio friendly error state (block /api/folio with a 500 envelope) --
await page.route('**/api/folio**', (route) =>
  route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'internal', message: 'T-076 simulated failure' }) }),
)
// Force a refetch by retyping in the search box (debounced server-side search).
await page.locator('input[aria-label="Search saved reports"]').fill('zz-no-match')
await page.waitForSelector('text=Could not load your saved reports.', { timeout: 10000 })
const retryVisible = await page.locator('button:has-text("Retry")').isVisible()
results.push(['folio friendly error state with retry (not a blank panel)', retryVisible])
await page.screenshot({ path: `${OUT}/t076-4-folio-error-state.png` })
await page.unrouteAll()

// --- 5. Logout wiring — click must NAVIGATE to /api/logout; abort it ------
// The 302 to /cdn-cgi/access/logout would invalidate the session, so the
// navigation is intercepted and aborted before it leaves the browser.
let logoutRequestUrl = null
await context.route('**/api/logout**', (route) => {
  logoutRequestUrl = route.request().url()
  return route.abort()
})
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.locator('a[href="/api/logout"]').click()
await page.waitForTimeout(1000)
results.push(['logout click navigated to /api/logout (aborted before session teardown)', logoutRequestUrl !== null && logoutRequestUrl.startsWith(`${BASE}/api/logout`)])
console.log(`logout navigation target (aborted): ${logoutRequestUrl}`)

await browser.close()

let failed = 0
for (const [name, ok] of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) failed++
}
console.log(`evidence screenshots in ${OUT}/`)
process.exit(failed === 0 ? 0 : 1)
