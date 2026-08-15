/**
 * E2E spec — local admin session proof (FV-188, OTP-free).
 *
 * Proves the frozen FV-188 contract against `wrangler pages dev`:
 *   fresh identity → /api/me returns the synthetic identity,
 *   and /api/admin/session returns platform-admin + admin:analytics:read.
 *
 * LOCAL-ONLY: relies on the T-017 dev-identity injection (loopback) plus the
 * local CF_PLATFORM_ADMIN_EMAILS allowlist in .dev.vars. Never point at prod.
 */
import { test, expect } from '@playwright/test'

test('FV-188: /api/me returns the injected identity', async ({ request }) => {
  const res = await request.get('/api/me')
  expect(res.status()).toBe(200)

  const body = await res.json()
  expect(body).toMatchObject({
    id: expect.any(String),
    email: 'dev@urania.local',
  })
})

test('FV-188: /api/admin/session grants platform-admin (admin:analytics:read)', async ({
  request,
}) => {
  const res = await request.get('/api/admin/session')
  expect(res.status()).toBe(200)

  const body = await res.json()
  expect(body).toMatchObject({
    principal: 'platform-admin',
    email: 'dev@urania.local',
    hasAdminAnalyticsRead: true,
  })
  expect(body.roles).toContain('platform-admin')
  expect(body.permissions).toContain('admin:analytics')
})

test('FV-188: SPA shell serves and contains the app markers', async ({ page }) => {
  await page.goto('/')
  // The SPA shell must serve (outside the /api gate).
  await expect(page).toHaveTitle(/Urania 137/)
})
