import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const arg = (name) => {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const positionalBase = process.argv.slice(2).find((value, index, args) => {
  const previous = args[index - 1]
  return !value.startsWith('--') && previous !== '--base'
})
const BASE = (arg('base') || process.env.URANIA_PAGES_BASE_URL || positionalBase || 'http://localhost:8788').replace(/\/+$/, '')
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]

async function verifyViewport(browser, viewport) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()

  await page.route('**/api/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'dialog-verifier', email: 'dialog-verifier@example.test' }),
    }),
  )
  await page.route('**/api/subjects', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        subjects: [
          {
            id: 'subject-verifier',
            role: 'self',
            name: 'Dialog Verifier',
            birth_date: '1990-01-01',
            birth_time: '12:00',
            birth_time_confidence: 'unknown',
            birth_location_query: 'Test',
            normalized_location: null,
            createdAt: '2026-07-27T00:00:00.000Z',
            updatedAt: '2026-07-27T00:00:00.000Z',
          },
        ],
      }),
    }),
  )
  await page.route('**/api/chat/session', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'verification_stub', message: 'Dialog lifecycle verifier intentionally keeps chat offline.' }),
    }),
  )

  await page.goto(`${BASE}/#/node/birth`, { waitUntil: 'domcontentloaded' })
  const doorway = page.getByRole('button', { name: /^Birth Blueprint\b/ })
  await doorway.waitFor({ state: 'visible' })
  await doorway.focus()
  await doorway.click()

  const dialog = page.getByRole('dialog', { name: 'Birth Blueprint', exact: true })
  await dialog.waitFor({ state: 'visible' })
  assert.equal(await dialog.getAttribute('aria-modal'), 'true', `${viewport.name}: dialog must be modal`)
  assert.equal(
    await page.evaluate(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement) ?? false),
    true,
    `${viewport.name}: focus must enter the dialog`,
  )

  const tabStops = await dialog.locator(
    'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ).count()
  assert.ok(tabStops > 0, `${viewport.name}: dialog must have a focusable close control`)
  for (let index = 0; index <= tabStops; index += 1) {
    await page.keyboard.press('Tab')
    assert.equal(
      await page.evaluate(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement) ?? false),
      true,
      `${viewport.name}: Tab ${index + 1} escaped the dialog`,
    )
  }

  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'detached' })
  assert.equal(
    await doorway.evaluate((element) => element === document.activeElement),
    true,
    `${viewport.name}: focus must return to the child doorway`,
  )

  await context.close()
  console.log(`  PASS  ${viewport.name} ${viewport.width}×${viewport.height}`)
}

const browser = await chromium.launch()
try {
  for (const viewport of VIEWPORTS) await verifyViewport(browser, viewport)
  console.log(`Instrument dialog: PASS at ${BASE}`)
} finally {
  await browser.close()
}
