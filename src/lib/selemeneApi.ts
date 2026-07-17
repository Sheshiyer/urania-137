import {
  AssetGenerateRequest,
  AssetGenerateResponse,
  BirthData,
  EngineResult,
  SelemeneHealth,
  SelemeneReady,
  SelemeneWorkflow,
  WorkflowResult,
} from '../types'

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

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${PROXY_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Selemene ${path} ${res.status}: ${text.slice(0, 300) || res.statusText}`)
  }
  return res.json()
}

/** Live engine/system status — powers the real Engine Status surface. */
export const fetchHealth = () => getJson<SelemeneHealth>('/health')
export const fetchReady = () => getJson<SelemeneReady>('/health/ready')
export const fetchEngines = () => getJson<{ engines: string[] }>('/api/v1/engines').then((r) => r.engines)
export const fetchWorkflows = () => getJson<{ workflows: SelemeneWorkflow[] }>('/api/v1/workflows').then((r) => r.workflows)

/** A workflow's definition — `engine_ids` lets us spot engines it drops silently. */
export const fetchWorkflow = (id: string) =>
  getJson<{ id: string; name: string; description: string; engine_ids: string[] }>(`/api/v1/workflows/${id}`)

/**
 * The deterministic surface — a composed workflow across several engines.
 * Note the engine composes best-effort: an engine that errors is simply absent
 * from `engine_outputs` (e.g. numerology without `birth_data.name`), so callers
 * should compare against the workflow's declared engine list.
 */
export const runWorkflow = (workflowId: string, birth: BirthData) =>
  postJson<WorkflowResult>(`/api/v1/workflows/${workflowId}`, { birth_data: birth })

/** A single consciousness engine, computed directly. */
export const calculateEngine = (engineId: string, birth: BirthData) =>
  postJson<EngineResult>(`/api/v1/engines/${engineId}/calculate`, { birth_data: birth })
