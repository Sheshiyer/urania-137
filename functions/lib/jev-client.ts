/**
 * Lightweight TypeSafe Jev client for Cloudflare Workers.
 *
 * Uses the raw HTTP API (POST https://api.typesafe.ai/v1/systemone) instead of
 * the Node.js SDK — no runtime dependencies beyond the Workers `fetch` global.
 * Retries 429/5xx once with exponential backoff; all other errors surface
 * immediately.
 */

const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone'
const JEV_MODEL = 'jev-latest'
const DEFAULT_TIMEOUT_MS = 8_000

// --- Question builders ---

export interface ChoiceQuestion<T extends Record<string, unknown> = Record<string, string>> {
  type: 'choice'
  instructions: string
  criteria: T
}

export interface ScoreQuestion {
  type: 'score'
  instructions: string
  criteria: string[]
}

export interface NoulQuestion {
  type: 'noul'
  instructions?: string
  criteria?: { true?: string; false?: string }
}

export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion

export function choice<T extends Record<string, string>>(
  instructions: string,
  criteria: T,
): ChoiceQuestion<T> {
  return { type: 'choice', instructions, criteria }
}

export function score(instructions: string, criteria: string[]): ScoreQuestion {
  return { type: 'score', instructions, criteria }
}

export function noul(
  instructions?: string,
  criteria?: { true?: string; false?: string },
): NoulQuestion {
  return { type: 'noul', ...(instructions ? { instructions } : {}), ...(criteria ? { criteria } : {}) }
}

// --- Response types ---

export interface ChoiceResponse {
  type: 'choice'
  choice: string
  probabilities: Record<string, number>
  confidence: number
}

export interface ScoreResponse {
  type: 'score'
  score: number
  legend: Record<string, string>
  probabilities: Record<string, number>
  confidence: number
}

export interface NoulResponse {
  type: 'noul'
  noul: number
}

export type Answer = ChoiceResponse | ScoreResponse | NoulResponse

// --- Request / Result ---

export interface JevRequest {
  state: unknown
  questions: Record<string, Question>
  model?: string
}

export interface JevResult {
  model: string
  answers: Record<string, Answer>
  usage: { input_tokens: number; output_tokens: number }
}

// --- Client ---

export interface JevClientOptions {
  apiKey: string
  timeoutMs?: number
}

export class JevError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Jev API ${status}: ${body.slice(0, 200)}`)
    this.name = 'JevError'
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function jevSystemOne(
  request: JevRequest,
  opts: JevClientOptions,
): Promise<JevResult> {
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const body = JSON.stringify({
    state: request.state,
    model: request.model ?? JEV_MODEL,
    questions: request.questions,
  })
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${opts.apiKey}`,
    'Content-Type': 'application/json',
  }

  let lastError: Error | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * attempt))

    let res: Response
    try {
      res = await fetchWithTimeout(JEV_ENDPOINT, { method: 'POST', headers, body }, timeout)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      continue
    }

    if (res.status === 429 || res.status >= 500) {
      lastError = new JevError(res.status, await res.text())
      continue
    }

    if (!res.ok) {
      throw new JevError(res.status, await res.text())
    }

    return (await res.json()) as JevResult
  }

  throw lastError ?? new Error('Jev request failed')
}

/**
 * Convenience: create a bound client from a TYPESAFE_API_KEY. Returns null when
 * the key is absent so callers can degrade gracefully.
 */
export function createJevClient(
  apiKey: string | undefined,
): ((request: JevRequest) => Promise<JevResult>) | null {
  if (!apiKey) return null
  return (request) => jevSystemOne(request, { apiKey })
}
