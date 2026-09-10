import type { Env } from '../env'
import {
  completeChatCompletions,
  completeDirectProviders,
  hasDirectInferenceKeys,
  type FetchLike,
} from '../llm'
import type { InterpretationModelPort, ModelCompletionInput } from './types'

const INTERPRETATION_TIMEOUT_MS = 25_000

export type { FetchLike }

function proxyBase(env: Env): string {
  return (env.NARRATOR_LLM_URL ?? env.SELEMENE_API_URL ?? '').replace(/\/+$/, '')
}

function completionBody(input: ModelCompletionInput, extra: Record<string, unknown> = {}) {
  return {
    messages: [
      { role: 'system', content: input.system },
      { role: 'user', content: input.user },
    ],
    temperature: 0.2,
    ...extra,
  }
}

/** Existing OpenAI-compatible proxy behind a narrow, replaceable model port. */
export function createLlmProxyModel(
  env: Env,
  fetchImpl: FetchLike = fetch,
): InterpretationModelPort {
  const base = proxyBase(env)
  const configured = base.length > 0 || hasDirectInferenceKeys(env)

  return {
    id: 'selemene-llm-proxy',
    configured,
    async complete(input: ModelCompletionInput): Promise<string | null> {
      if (base) {
        const headers: Record<string, string> = {}
        if (env.SELEMENE_API_KEY) headers['x-api-key'] = env.SELEMENE_API_KEY
        if (env.CHAT_PROXY_TOKEN) headers['x-chat-key'] = env.CHAT_PROXY_TOKEN
        const proxied = await completeChatCompletions(
          {
            url: `${base}/v1/chat/completions`,
            headers,
            body: completionBody(input),
            timeoutMs: INTERPRETATION_TIMEOUT_MS,
          },
          fetchImpl,
        )
        if (proxied?.content) return proxied.content
      }
      const direct = await completeDirectProviders(
        env,
        completionBody(input),
        INTERPRETATION_TIMEOUT_MS,
        fetchImpl,
      )
      return direct?.content ?? null
    },
  }
}
