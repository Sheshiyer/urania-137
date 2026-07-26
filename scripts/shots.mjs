/**
 * Visual-verification harness: spawns `vite dev`, screenshots the logged-in
 * flow (home + node pages + modal/chat when drivable), then kills the server.
 * The server is a child of this process — nothing is left running.
 *
 * Usage: node scripts/shots.mjs [outDir] [routes...]
 *   node scripts/shots.mjs .shots/before / /node/engine
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const outDir = process.argv[2] ?? '.shots/latest'
const routes = process.argv.slice(3)
const ROUTES = routes.length
  ? routes
  : ['/', '/node/birth', '/node/engine', '/node/folio', '/node/witness', '/node/bridge', '/node/compat', '/node/transit']

const PORT = 5199
const BASE = `http://localhost:${PORT}`

mkdirSync(outDir, { recursive: true })

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stderr.on('data', () => {})

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

const name = (r) => (r === '/' ? 'home' : r.replaceAll('/', '_').replace(/^_/, ''))

try {
  await waitForServer()
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 945 } })
  page.on('pageerror', (e) => console.error('[pageerror]', e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('[console]', m.text().slice(0, 200))
  })

  for (const route of ROUTES) {
    await page.goto(`${BASE}/#${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1400)
    await page.screenshot({ path: `${outDir}/${name(route)}.png` })
    console.log(`shot ${route} -> ${outDir}/${name(route)}.png`)
  }
  await browser.close()
} finally {
  server.kill('SIGKILL')
  setTimeout(() => process.exit(0), 300).unref()
}
