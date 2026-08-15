import { defineConfig, devices } from '@playwright/test'

/**
 * Urania E2E — local admin-session proof (FV-188 / T-088) against
 * `wrangler pages dev` on loopback. No OTP: the T-017 dev-identity injection
 * (functions/lib/dev-identity.ts) synthesizes an identity on loopback +
 * non-production runtime, and the local-only CF_PLATFORM_ADMIN_EMAILS allowlist
 * elevates it to `platform-admin` (see .dev.vars).
 *
 * Run:  npm run e2e            (requires `npm run dev` running on :8788)
 *       npm run e2e:headed     (headed, slow-mo)
 *
 * This suite is LOCAL-ONLY by construction. It must NEVER be pointed at a
 * production hostname: production has no dev-identity path and a synthetic
 * assertion would fail closed (401) — which is the desired posture, not a bug.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8788',
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
