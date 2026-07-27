import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'
import {
  CHAT_SESSION,
  CHAT_TURNS,
  ENGINE_STATUS,
  FIXTURE_LABEL,
  FOLIO_READINGS,
  GRANTED_READING,
  IDENTITY,
  MATRIX_ROWS,
  RELATIONSHIP,
  REVOKED_RELATIONSHIP,
  SUBJECTS,
  SYNTHETIC_FIXTURE_LABELS,
} from './ui-fixtures.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const evidenceRoot = join(root, 'docs/ui/evidence/realignment')
const evidenceRelative = 'docs/ui/evidence/realignment'
const readmePath = join(evidenceRoot, 'README.md')
const baseUrl = new URL(process.argv[2] ?? 'http://127.0.0.1:8788')
const origin = baseUrl.origin

assert.ok(
  /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(origin),
  `visual verification requires a local Wrangler origin, received ${origin}`,
)
assert.ok(statSync(readmePath).isFile(), 'evidence README must exist before the matrix runs')

for (const entry of readdirSync(evidenceRoot, { withFileTypes: true })) {
  if (entry.name === 'README.md') continue
  rmSync(join(evidenceRoot, entry.name), { recursive: true, force: true })
}

const artifactsRoot = join(evidenceRoot, 'rows')
mkdirSync(artifactsRoot, { recursive: true })

function jsonBody(value) {
  return JSON.stringify(value)
}

function relationshipFor(row) {
  return row.fixture === 'revoked' || row.fixture === 'historical'
    ? REVOKED_RELATIONSHIP
    : RELATIONSHIP
}

function folioFor(row) {
  if (row.fixture === 'empty') return []
  return FOLIO_READINGS
}

function expectedFailure(row, path, status) {
  if (row.fixture === 'denied' && path === '/api/folio' && status === 403) return true
  if (row.fixture === 'failed' && path === '/api/relationships' && status === 500) return true
  return false
}

async function installFixtures(page, row, requestLog) {
  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()

    if (url.origin !== origin) {
      requestLog.push({
        method,
        path: `${url.origin}${url.pathname}`,
        status: 204,
        external: true,
        forwarded: false,
      })
      await route.fulfill({
        status: 204,
        contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'text/plain',
        body: '',
      })
      return
    }

    if (!url.pathname.startsWith('/api/')) {
      await route.continue()
      return
    }

    let status = 200
    let body = {}
    let contentType = 'application/json'

    if (url.pathname === '/api/me' && method === 'GET') {
      body = IDENTITY
    } else if (url.pathname === '/api/subjects' && method === 'GET') {
      body = { subjects: SUBJECTS }
    } else if (url.pathname === '/api/folio/import' && method === 'POST') {
      body = { imported: 0 }
    } else if (url.pathname === '/api/folio' && method === 'GET') {
      if (row.fixture === 'denied') {
        status = 403
        body = { error: 'FORBIDDEN', message: 'Owner-scoped Folio access denied.' }
      } else {
        body = { readings: folioFor(row) }
      }
    } else if (url.pathname === '/api/folio' && method === 'POST') {
      status = 201
      body = FOLIO_READINGS[0]
    } else if (/^\/api\/folio\/[^/]+$/.test(url.pathname) && ['PATCH', 'DELETE'].includes(method)) {
      body = method === 'DELETE' ? {} : FOLIO_READINGS[0]
    } else if (url.pathname === '/api/relationships' && method === 'GET') {
      if (row.fixture === 'failed') {
        status = 500
        body = { error: 'FIXTURE_FAILURE', message: 'Consent records are unavailable in this synthetic state.' }
      } else {
        body = { relationships: [relationshipFor(row)] }
      }
    } else if (
      url.pathname === `/api/relationships/${RELATIONSHIP.id}/readings`
      && method === 'GET'
    ) {
      body = { readings: [GRANTED_READING] }
    } else if (url.pathname === '/api/chat/session' && method === 'POST') {
      body = { session: CHAT_SESSION, resumed: true }
    } else if (url.pathname === `/api/chat/session/${CHAT_SESSION.sessionId}` && method === 'GET') {
      body = {
        session: CHAT_SESSION,
        turns: row.fixture === 'composing' ? [] : CHAT_TURNS,
      }
    } else if (url.pathname === '/api/chat/turn' && method === 'POST') {
      if (row.fixture === 'composing') {
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 1800))
      }
      contentType = 'text/event-stream'
      body = ''
    } else if (url.pathname.includes('/api/chat/session/') && url.pathname.endsWith('/events')) {
      contentType = 'text/event-stream'
      body = ''
    } else if (url.pathname.endsWith('/complete') && method === 'POST') {
      body = { session: { ...CHAT_SESSION, chapter: 'complete' } }
    } else if (url.pathname === '/api/selemene/health') {
      body = ENGINE_STATUS.health
    } else if (url.pathname === '/api/selemene/health/ready') {
      body = ENGINE_STATUS.ready
    } else if (url.pathname === '/api/selemene/api/v1/engines') {
      body = { engines: ENGINE_STATUS.engines }
    } else if (url.pathname.startsWith('/api/selemene/')) {
      body = { error: 'FIXTURE_ONLY', message: 'No live Selemene request is permitted.' }
      status = 503
    } else if (method !== 'GET') {
      body = { ok: true }
    } else {
      status = 404
      body = { error: 'UNALLOWLISTED_FIXTURE', message: `No fixture for ${url.pathname}` }
    }

    const expected = expectedFailure(row, url.pathname, status)
    requestLog.push({
      method,
      path: `${url.pathname}${url.search}`,
      status,
      expected,
      mutating: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method),
      forwarded: false,
    })
    await route.fulfill({
      status,
      contentType,
      body: typeof body === 'string' ? body : jsonBody(body),
    })
  })
}

async function maskIdentity(page) {
  const visibleEmails = await page.locator('body').evaluate((body) => {
    const visible = body.innerText.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) ?? []
    return [...new Set(visible)]
  })
  assert.ok(
    visibleEmails.every((email) => email.toLowerCase().endsWith('.test')),
    `visible non-test email: ${visibleEmails.join(', ')}`,
  )

  await page.evaluate((label) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    for (const node of nodes) {
      if (node.textContent && /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(node.textContent)) {
        node.textContent = node.textContent.replace(
          /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
          label,
        )
      }
    }
    const marker = document.createElement('span')
    marker.className = 'sr-only'
    marker.setAttribute('data-evidence-fixture', label)
    marker.textContent = label
    document.body.appendChild(marker)
  }, FIXTURE_LABEL)
}

async function exerciseGraphEquivalent(page) {
  const lens = page.locator('[data-graph-lens]').first()
  if (!(await lens.count())) return false
  if (await page.getByRole('dialog').count()) {
    assert.equal(
      await page.getByRole('button', { name: 'list', exact: true }).count() > 0,
      true,
      'dialog-backed graph route lost its list lens control',
    )
    return true
  }
  const initial = await lens.getAttribute('data-graph-lens')
  const list = page.getByRole('button', { name: 'list', exact: true }).first()
  await list.click()
  await page.locator('[data-graph-lens="list"] ol').first().waitFor({ state: 'visible' })
  if (initial === 'graph') {
    await page.getByRole('button', { name: 'graph', exact: true }).first().click()
    await page.locator('[data-graph-lens="graph"]').first().waitFor({ state: 'visible' })
  }
  return true
}

async function performAction(page, row) {
  if (row.action === 'open-begin') {
    await page.getByRole('button', { name: /begin a reading/i }).first().click()
    await page.getByRole('dialog', { name: /begin a reading/i }).waitFor({ state: 'visible' })
  }
}

async function settleSurfaceMotion(page) {
  await page.evaluate(async () => {
    const finiteDialogAnimations = [...document.querySelectorAll('dialog')]
      .flatMap((dialog) => dialog.getAnimations())
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
    await Promise.race([
      Promise.allSettled(finiteDialogAnimations.map((animation) => animation.finished)),
      new Promise((resolve) => window.setTimeout(resolve, 1500)),
    ])
  })
}

async function browserAssertions(page, row, requestLog, consoleLog, pageErrors) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  assert.ok(
    dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `${row.id} overflows ${dimensions.scrollWidth}/${dimensions.clientWidth}`,
  )

  const clipped = await page.evaluate(() => {
    const selectors = [
      '[aria-label="Urania 137 — home"]',
      'header [aria-label="Product sections"] button',
      '[aria-label^="Open settings"]',
      'header.fixed a[href="/api/logout"]',
    ]
    return selectors.flatMap((selector) => (
      [...document.querySelectorAll(selector)].flatMap((element) => {
        const style = getComputedStyle(element)
        if (style.display === 'none' || style.visibility === 'hidden') return []
        const rect = element.getBoundingClientRect()
        return rect.width > 0
          && rect.height > 0
          && (rect.left < -1 || rect.right > innerWidth + 1 || rect.top < -1 || rect.bottom > innerHeight + 1)
          ? [{ selector, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }]
          : []
      })
    ))
  })
  assert.deepEqual(clipped, [], `${row.id} clips global controls`)

  const rawOpen = await page.locator('details[open]').evaluateAll((details) => (
    details.filter((detail) => detail.querySelector('pre, code')).length
  ))
  assert.equal(rawOpen, 0, `${row.id} opens raw JSON by default`)

  const longLiveRegions = await page.locator('[aria-live]').evaluateAll((regions) => (
    regions.flatMap((region) => {
      const text = region.textContent?.trim() ?? ''
      return text.length > 400 ? [text.length] : []
    })
  ))
  assert.deepEqual(longLiveRegions, [], `${row.id} has a mutating long-form live region`)

  const asyncBoundary = page.locator('[data-async-state]').first()
  if (await asyncBoundary.count()) {
    assert.ok((await asyncBoundary.innerText()).trim().length > 0, `${row.id} async state has no written text`)
  }

  const dialog = page.getByRole('dialog').first()
  if (await dialog.count()) {
    assert.equal(await dialog.getAttribute('aria-modal'), 'true', `${row.id} dialog is not modal`)
    assert.ok(await dialog.getAttribute('aria-labelledby'), `${row.id} dialog lacks a title relationship`)
  }

  const focusScope = (await dialog.count()) ? dialog : page.locator('body')
  const focusable = focusScope.locator(
    'button:not([disabled]):visible, a[href]:visible, input:not([disabled]):visible',
  ).first()
  if (await focusable.count()) {
    await focusable.focus()
    assert.equal(
      await focusable.evaluate((element) => document.activeElement === element),
      true,
      `${row.id} primary action is not keyboard reachable`,
    )
  }

  const unexpectedHttp = requestLog.filter((entry) => entry.status >= 400 && !entry.expected)
  assert.deepEqual(unexpectedHttp, [], `${row.id} has unexpected fixture HTTP failures`)
  assert.deepEqual(
    requestLog.filter((entry) => entry.mutating && entry.forwarded),
    [],
    `${row.id} forwarded a mutation`,
  )
  assert.deepEqual(pageErrors, [], `${row.id} raised page errors`)
  const unexpectedConsole = consoleLog.filter((entry) => (
    entry.type === 'error'
    && !/403|500|Failed to load resource/i.test(entry.text)
  ))
  assert.deepEqual(unexpectedConsole, [], `${row.id} raised unexpected console errors`)
}

function repoPath(path) {
  return relative(root, path).split('\\').join('/')
}

function writeArtifact(rowDirectory, name, value) {
  const path = join(rowDirectory, name)
  writeFileSync(
    path,
    typeof value === 'string' ? `${value.trim()}\n` : `${JSON.stringify(value, null, 2)}\n`,
  )
  return repoPath(path)
}

const serverProbe = await fetch(origin, { redirect: 'manual' })
assert.ok(serverProbe.ok, `local Wrangler did not answer at ${origin}`)

const browser = await chromium.launch({ headless: true })
const manifestRows = []

try {
  for (const row of MATRIX_ROWS) {
    const context = await browser.newContext({
      viewport: row.viewport,
      colorScheme: 'dark',
      locale: 'en-GB',
      timezoneId: 'UTC',
      reducedMotion: row.reducedMotion ? 'reduce' : 'no-preference',
      serviceWorkers: 'block',
    })
    const page = await context.newPage()
    const requestLog = []
    const consoleLog = []
    const pageErrors = []
    page.on('console', (message) => {
      consoleLog.push({ type: message.type(), text: message.text().slice(0, 500) })
    })
    page.on('pageerror', (error) => {
      pageErrors.push(error.message.slice(0, 500))
    })
    await installFixtures(page, row, requestLog)

    const target = `${origin}/${row.route}`
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.locator('body').waitFor({ state: 'visible' })
    if (row.fixture === 'composing') {
      await page.getByLabel('The narrator is composing').waitFor({ state: 'visible', timeout: 5000 })
    } else {
      await page.waitForTimeout(250)
    }
    await performAction(page, row)
    const graphEquivalent = await exerciseGraphEquivalent(page)
    await settleSurfaceMotion(page)
    await maskIdentity(page)
    await browserAssertions(page, row, requestLog, consoleLog, pageErrors)

    const axeResult = await new AxeBuilder({ page }).analyze()
    const blocking = axeResult.violations.filter(
      ({ impact }) => impact === 'serious' || impact === 'critical',
    )
    assert.deepEqual(
      blocking.map(({ id, impact, nodes }) => ({
        id,
        impact,
        nodes: nodes.map(({ target, failureSummary, html }) => ({
          target,
          failureSummary,
          html: html.slice(0, 300),
        })),
      })),
      [],
      `${row.id} has serious/critical Axe violations`,
    )

    const rowDirectory = join(artifactsRoot, row.id)
    mkdirSync(rowDirectory, { recursive: true })
    const screenshotPath = join(rowDirectory, `${row.id}.png`)
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
      animations: 'disabled',
    })
    const domText = await page.locator('body').innerText()
    const domTextPath = writeArtifact(rowDirectory, 'dom.txt', domText)
    const requestsPath = writeArtifact(rowDirectory, 'requests.json', requestLog)
    const consolePath = writeArtifact(rowDirectory, 'console.json', {
      console: consoleLog,
      pageErrors,
    })
    const axePath = writeArtifact(rowDirectory, 'axe.json', {
      url: row.route,
      violations: axeResult.violations.map(({ id, impact, description, nodes }) => ({
        id,
        impact,
        description,
        nodes: nodes.length,
      })),
    })

    manifestRows.push({
      id: row.id,
      fixtureLabel: FIXTURE_LABEL,
      screenshot: repoPath(screenshotPath),
      domText: domTextPath,
      requests: requestsPath,
      console: consolePath,
      axe: axePath,
      route: row.route,
      viewport: row.viewport,
      fixture: row.fixture,
      surface: row.surface,
      reducedMotion: Boolean(row.reducedMotion),
      graphEquivalent,
      forwardedMutations: 0,
      blockingAxeViolations: 0,
    })
    await context.close()
    console.log(`ui visual PASS ${row.id}`)
  }
} finally {
  await browser.close()
}

const manifestPath = join(evidenceRoot, 'manifest.json')
writeFileSync(manifestPath, `${JSON.stringify({
  schemaVersion: 1,
  base: 'local-wrangler',
  syntheticFixtureLabels: SYNTHETIC_FIXTURE_LABELS,
  rows: manifestRows,
}, null, 2)}\n`)

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return filesUnder(path)
    return entry.isFile() ? [repoPath(path)] : []
  })
}

const allowlistRelative = `${evidenceRelative}/allowlist.txt`
const allowlist = [...new Set([...filesUnder(evidenceRoot), allowlistRelative])].sort()
writeFileSync(join(evidenceRoot, 'allowlist.txt'), `${allowlist.join('\n')}\n`)

assert.equal(manifestRows.length, MATRIX_ROWS.length)
console.log(`UI visual matrix PASS: ${manifestRows.length} deterministic rows`)
