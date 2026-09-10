/**
 * Local E2E — WitnessRun activity cards / POST /api/chat/interpret.
 *
 * L0 is deterministic (no model). L1 hits the narrator LLM proxy, then
 * Nebius/NVIDIA fallback. LOCAL-ONLY via T-017 dev-identity.
 */
import { test, expect } from '@playwright/test'

test.describe.configure({ timeout: 90_000 })

async function saveFixtureReading(request: Parameters<typeof test>[0] extends never ? never : {
  post: (url: string, options: { data: unknown }) => Promise<{ status: () => number; json: () => Promise<{ id: string }> }>
}) {
  const res = await request.post('/api/folio', {
    data: {
      nodeId: 'birth',
      nodeLabel: 'Birth Witness',
      mode: 'numerology',
      title: 'Number codes',
      content: 'Life path: 7.\n\nExpression: 3.\n\nA synthesis paragraph about seeking and witness.',
    },
  })
  expect(res.status()).toBe(201)
  const body = await res.json()
  expect(body.id).toBeTruthy()
  return body.id as string
}

test('L0 interpret returns the source reading without a model', async ({ request }) => {
  const readingId = await saveFixtureReading(request)
  const res = await request.post('/api/chat/interpret', {
    data: {
      readingId,
      route: 'pattern',
      question: 'Why does life path 7 feel relevant now?',
      depth: 0,
      idempotencyKey: `e2e-l0-${Date.now()}`,
    },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.degraded).toBe(false)
  expect(body.answer).toContain('Life path: 7')
  expect(body.provenance.model).toBe('none')
})

test('L1 pattern card + custom question returns a non-degraded interpretation', async ({ request }) => {
  const readingId = await saveFixtureReading(request)
  const res = await request.post('/api/chat/interpret', {
    data: {
      readingId,
      route: 'pattern',
      question: 'Why does this feel relevant now?',
      depth: 1,
      idempotencyKey: `e2e-l1-${Date.now()}`,
    },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.degraded, JSON.stringify({ failure: body.failure, answer: body.answer })).toBe(false)
  expect(typeof body.answer).toBe('string')
  expect(body.answer.length).toBeGreaterThan(20)
  expect(body.route).toBe('pattern')
  expect(body.agentId).toBe('aletheios')
})

test('WitnessRun: type a custom question, press Ask, get a live answer', async ({ page, request }) => {
  const readingId = await saveFixtureReading(request)
  const profile = await request.post('/api/subjects', {
    data: {
      role: 'self',
      name: 'Asha',
      birth_date: '1990-12-31',
      birth_time: '07:30',
      birth_time_confidence: 'exact',
      birth_location_query: 'Bengaluru, India',
    },
  })
  expect(profile.status()).toBe(201)
  await page.goto(`/#/chat?reading=${encodeURIComponent(readingId)}`)
  await expect(page.locator('[data-witness-run]')).toBeVisible({ timeout: 15_000 })
  await page.getByLabel('Ask about this reading').fill('Why does this feel relevant now?')
  await page.getByRole('button', { name: 'Ask' }).click()
  await expect(page.locator('[data-witness-turn-status="answered"]')).toBeVisible({ timeout: 80_000 })
  await expect(page.getByText(/optional interpretive layer did not respond/i)).toHaveCount(0)
})
