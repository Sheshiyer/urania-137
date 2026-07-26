/** Mobile shots (390x844) of home + a node page. Child-owned vite lifecycle. */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const outDir = process.argv[2] ?? '.shots/mobile'
const PORT = 5197
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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  for (const [route, name] of [['/', 'home'], ['/node/engine', 'node_engine']]) {
    await page.goto(`${BASE}/#${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1800)
    await page.screenshot({ path: `${outDir}/${name}.png` })
    console.log(`shot ${name}`)
  }
  await browser.close()
} finally {
  server.kill('SIGKILL')
  setTimeout(() => process.exit(0), 300).unref()
}
