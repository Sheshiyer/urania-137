/**
 * Quick-reply shots: mock the chat API at two closed-vocabulary beats and
 * screenshot the ChatSheet — (1) the time_confidence enum chips, (2) the
 * assembly chapter's growth-green final Confirm. Server lifecycle: spawns
 * vite dev as a child and kills it on exit.
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const outDir = process.argv[2] ?? '.shots/chatreplies'
const PORT = 5199
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

const ts = new Date().toISOString()
const msg = (id, role, text, chapter) => ({
  id,
  sessionId: 'sess-mock',
  role,
  blocks: [{ kind: 'text', text }],
  chapter,
  createdAt: ts,
})

/** Session at the beat under test; seed passes through from the client's POST. */
function sessionAt(beat, seed) {
  const base = {
    sessionId: 'sess-mock',
    userId: 'user-mock',
    seed,
    subjectIndex: 0,
    prefilledCount: 0,
    createdAt: ts,
    updatedAt: ts,
  }
  if (beat === 'time_confidence') {
    return {
      ...base,
      chapter: 'subjects',
      intake: { subjects: [{ role: 'primary', name: 'Asha', birth_date: '1990-12-31', birth_time: '07:30' }] },
    }
  }
  // assembly
  return {
    ...base,
    chapter: 'assembly',
    intake: {
      mode: seed.mode ?? 'integrated-kundali',
      language: 'en',
      report_level: 'L0',
      consciousness_level: 2,
      subjects: [
        {
          role: 'primary',
          name: 'Asha',
          birth_date: '1990-12-31',
          birth_time: '07:30',
          birth_time_confidence: 'exact',
          birth_location_query: 'Bengaluru, India',
        },
      ],
    },
  }
}

const BEAT_TURNS = {
  time_confidence: (s) => [
    msg('m1', 'user', '07:30', 'subjects'),
    msg('m2', 'narrator', 'Asha — how well is that time known: exact | approximate | unknown?', 'subjects'),
  ],
  assembly: (s) => [
    msg(
      'm1',
      'narrator',
      'FINAL ASSEMBLED REQUEST — doorway: witness\nmode: integrated-kundali · level L0 · en · C2\nsubjects: 1. Asha · 1990-12-31 07:30 (exact) · Bengaluru, India\nrelationship: none (solo)\nConfirm to hand off to the engines?',
      'assembly',
    ),
  ],
}

try {
  await waitForServer()
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 945 } })

  for (const beat of ['time_confidence', 'assembly']) {
    await page.route('**/api/chat/session', (route) => {
      const body = route.request().postDataJSON()
      route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ session: sessionAt(beat, body.seed) }) })
    })
    await page.route('**/api/chat/session/*', (route) => {
      const session = sessionAt(beat, { kind: 'witness', mode: 'integrated-kundali' })
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ session, turns: BEAT_TURNS[beat](session) }),
      })
    })

    await page.goto(`${BASE}/#/node/witness`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1800)
    await page.getByRole('button', { name: /Integrated Kundali/i }).first().click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${outDir}/chat-${beat}.png` })
    console.log(`shot chat-${beat}`)
    await page.unroute('**/api/chat/session')
    await page.unroute('**/api/chat/session/*')
    // Fresh page per beat — the sheet's backdrop intercepts pointer events.
    await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' })
  }

  await browser.close()
  server.kill()
  process.exit(0)
} finally {
  server.kill()
}
