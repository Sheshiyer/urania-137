import type { D1Database } from '@cloudflare/workers-types'

/**
 * Typed bindings for the Pages Functions (T-005). The four config keys are the
 * frozen contract every route consumes. DEV_IDENTITY_EMAIL is the dev-only
 * identity injection — it MUST be unset in production (the prod-safe guard, T-008).
 */
export interface Env {
  DB: D1Database
  CF_ACCESS_AUD: string
  CF_ACCESS_TEAM_DOMAIN: string
  SELEMENE_API_KEY: string
  SELEMENE_API_URL: string
  /** Present only in local `wrangler pages dev`; never in Pages production. */
  DEV_IDENTITY_EMAIL?: string
}
