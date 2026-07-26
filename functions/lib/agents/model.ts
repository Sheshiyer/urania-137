import type { Env } from '../env'
import type { InterpretationModelPort, ModelCompletionInput } from './types'

const INTERPRETATION_TIMEOUT_MS = 25_000

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** Existing OpenAI-compatible proxy behind a narrow, replaceable model port. */
export function createLlmProxyModel(
  env: Env,
  fetchImpl: FetchLike = fetch,
): InterpretationModelPort {
  const base = (env.NARRATOR_LLM_URL ?? env.SELEMENE_API_URL ?? '').replace(/\/+$/, '')

  return {
    id: 'selemene-llm-proxy',
    configured: base.length > 0,
    async complete(input: ModelCompletionInput): Promise<string | null> {
      if (!base) return null
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), INTERPRETATION_TIMEOUT_MS)
      try {
        const headers: Record<string, string> = { 'content-type': 'application/json' }
        if (env.SELEMENE_API_KEY) headers['x-api-key'] = env.SELEMENE_API_KEY
        if (env.CHAT_PROXY_TOKEN) headers['x-chat-key'] = env.CHAT_PROXY_TOKEN
        const response = await fetchImpl(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: [
              { role: 'system', content: input.system },
              { role: 'user', content: input.user },
            ],
            temperature: 0.2,
          }),
          signal: controller.signal,
        })
        if (!response.ok) return null
        const body = (await response.json()) as {
          choices?: Array<{ message?: { content?: unknown } }>
        }
        const content = body.choices?.[0]?.message?.content
        return typeof content === 'string' && content.trim() ? content.trim() : null
      } catch {
        return null
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
