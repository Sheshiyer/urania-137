/**
 * Interaction shots: hover a home planet (emerald ACTIVE PATH), then open the
 * Folio Archive modal (info child) to verify the new card grammar.
 * Server lifecycle: spawns vite dev as a child and kills it on exit.
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const outDir = process.argv[2] ?? '.shots/interact'
const PORT = 5198
const BASE = `http://localhost:${PORT}`
mkdirSync(outDir, { recursive: true })

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
})

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now()
  for (;;) {
    try {
      const res = await fetch(BASE)
      if (res.ok) return
    } catch {}
    if (Date.now() - start > timeoutMs) throw new Error('vite dev server did not come up')
    await new Promise((r) => setTimeout(r, 400))
  }
}

try {
  await waitForServer()
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 945 } })

  // 1. Home — hover the Sky Weather planet: emerald active path + hover ring.
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.getByRole('button', { name: 'Sky Weather' }).hover()
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${outDir}/home-hover.png` })
  console.log('shot home-hover')

  // 2. Node page — open an info child's modal (Folio → Saved Reports).
  await page.goto(`${BASE}/#/node/folio`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.getByRole('button', { name: 'Saved Reports' }).click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${outDir}/folio-modal.png` })
  console.log('shot folio-modal')

  // 3. Engine node — hover an orb.
  await page.goto(`${BASE}/#/node/engine`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.getByRole('button', { name: 'I Ching' }).click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${outDir}/engine-selected.png` })
  console.log('shot engine-selected (chat sheet attempted)')

  await browser.close()
} finally {
  server.kill('SIGKILL')
  setTimeout(() => process.exit(0), 300).unref()
}
