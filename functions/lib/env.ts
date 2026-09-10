import type { D1Database, R2Bucket, VectorizeIndex, Ai } from '@cloudflare/workers-types'

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
  /**
   * W2: shared secret for the upstream llm-proxy chat endpoint. When set, the
   * narrator fetch sends it as `x-chat-key`; when unset nothing is sent and
   * the LLM path is unchanged (inert by default). Must match the proxy's own
   * CHAT_PROXY_TOKEN secret when that side enforces auth.
   */
  CHAT_PROXY_TOKEN?: string
  /**
   * Live narrator LLM endpoint (the selemene-llm-proxy worker, OpenAI-compatible
   * `/v1/chat/completions`). When set, the narrator speaks through the proxy
   * (command-code primary, NVIDIA NIM backup); when unset the narrator falls
   * back to `SELEMENE_API_URL` (legacy engine path) and then to deterministic
   * templates. Non-secret — committed in wrangler.toml [vars].
   */
  NARRATOR_LLM_URL?: string
  /**
   * Direct NVIDIA NIM key. Optional fallback when the selemene-llm-proxy hop
   * is blocked (Cloudflare 1010) or returns non-OK. Never committed; set in
   * `.dev.vars` / Pages secrets from the operator Claude env.
   */
  NVIDIA_API_KEY?: string
  /**
   * Direct Nebius Token Factory key (`NEBIUS_FACTORY_API_TOKEN` in ~/.claude/.env).
   * Optional fallback beside NVIDIA. Never committed.
   */
  NEBIUS_API_KEY?: string
  /**
   * Comma-separated, server-side presentation allowlist. This may reveal an
   * operator lens in the UI but grants no API authority.
   */
  OPERATOR_EMAILS?: string
  /**
   * T-088 — fail-closed authority allowlist. The ONLY backend source of
   * `platform-admin` role assignment (ISA 2026-07-26 23:22): Access rule
   * groups are policy labels, not IdP group claims, so an exact
   * case-insensitive email match here is required before `admin:analytics:read`
   * (and every other admin permission) is granted. Unset/empty → no one is
   * platform-admin. Set as a Pages production secret, never committed.
   */
  CF_PLATFORM_ADMIN_EMAILS?: string
  /**
   * T-088 — bounded, unguessable bearer token for the out-of-band alert-probe
   * endpoint (scripts/ops/alert-probe.mjs). The probe POSTs this token; the
   * route verifies it in constant time and forwards to the notification
   * destination. Unset → the route fails closed (501) and never fabricates
   * delivery. Set as a Pages production secret, never committed.
   */
  ALERT_PROBE_TOKEN?: string
  /**
   * Webhook URL of the Cloudflare notification destination bound as
   * `alertDestinationId` in production-targets. The alert-probe route POSTs a
   * non-data-bearing probe event here; unset → acknowledged but delivered=false.
   */
  ALERT_DESTINATION_URL?: string
  /** Cloudflare alerting destination UUID (echoed in the probe receipt). */
  ALERT_DESTINATION_ID?: string
  /**
   * R2 bucket holding corpus HTML renders (ISC-#139) — 53 readings
   * (51 Solo + 2 Synastry).
   * Keys: corpus/readings/{sha256}/reading.html
   */
  READINGS_BUCKET?: R2Bucket
  /**
   * Vectorize index with corpus pattern embeddings (ISC-#132/#138).
   * 384-dimension, cosine metric, bge-small-en-v1.5, top_k=10.
   */
  PATTERN_INDEX?: VectorizeIndex
  /** Workers AI binding for embedding generation (@cf/baai/bge-small-en-v1.5). */
  AI?: Ai
}
