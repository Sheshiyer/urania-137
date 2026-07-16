import { AssetGenerateRequest, AssetGenerateResponse, SelemeneHealth, SelemeneReady } from '../types'

/**
 * All calls go through the same-origin serverless proxy (`/api/selemene/*`),
 * which injects the secret `X-API-Key` server-side and sidesteps CORS. The key
 * is never present in the browser bundle. See `api/selemene/[...path].ts`.
 *
 * Override the proxy base with `VITE_SELEMENE_PROXY_BASE` only if you host the
 * proxy elsewhere; the API key itself is never a client-side variable.
 */
const PROXY_BASE = (import.meta.env.VITE_SELEMENE_PROXY_BASE || '/api/selemene').replace(/\/+$/, '')

/** Generate a witness report/asset for a given mode (the primary Selemene surface). */
export async function generateAsset(request: AssetGenerateRequest): Promise<AssetGenerateResponse> {
  const res = await fetch(`${PROXY_BASE}/api/v1/assets/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Selemene API ${res.status}: ${text.slice(0, 400) || res.statusText}`)
  }
  return res.json()
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${PROXY_BASE}${path}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Selemene ${path} ${res.status}`)
  return res.json()
}

/** Live engine/system status — powers the real Engine Status surface. */
export const fetchHealth = () => getJson<SelemeneHealth>('/health')
export const fetchReady = () => getJson<SelemeneReady>('/health/ready')
export const fetchEngines = () => getJson<{ engines: string[] }>('/api/v1/engines').then((r) => r.engines)
