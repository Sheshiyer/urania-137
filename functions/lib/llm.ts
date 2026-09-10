import type { Env } from './env'

/**
 * Shared OpenAI-compatible chat-completions client.
 *
 * The selemene-llm-proxy workers.dev host returns Cloudflare 1010 (bot fight)
 * when the request has no browser-like User-Agent — python urllib and the
 * default Workers `fetch` both get blocked. Pages Functions therefore send
 * this UA on every proxy hop, then fall through to NVIDIA / Nebius using
 * keys from the Worker env (sourced locally from ~/.claude/.env).
 */
export const LLM_USER_AGENT =
  'Mozilla/5.0 (compatible; urania-137-functions/1.0; +https://urania.tryambakam.space)'

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface DirectInferenceProvider {
  id: 'nebius' | 'nvidia'
  url: string
  model: string
  envKey: 'NEBIUS_API_KEY' | 'NVIDIA_API_KEY'
}

/** Order matches the live llm-proxy failover after Command Code. */
export const DIRECT_INFERENCE_PROVIDERS: readonly DirectInferenceProvider[] = [
  {
    id: 'nebius',
    url: 'https://api.tokenfactory.nebius.com/v1/chat/completions',
    model: 'deepseek-ai/DeepSeek-V4-Pro',
    envKey: 'NEBIUS_API_KEY',
  },
  {
    id: 'nvidia',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    // llama-3.3-nemotron-super-49b-v1.5 reached EOL on 2026-08-26 (NIM 410).
    model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    envKey: 'NVIDIA_API_KEY',
  },
]

export function directProviderKey(env: Env, provider: DirectInferenceProvider): string | undefined {
  const value = env[provider.envKey]?.trim()
  return value ? value : undefined
}

export function hasDirectInferenceKeys(env: Env): boolean {
  return DIRECT_INFERENCE_PROVIDERS.some((provider) => Boolean(directProviderKey(env, provider)))
}

export interface ChatCompletionMessage {
  content: string | null
  tool_calls?: Array<{ function?: { name?: unknown; arguments?: unknown } }>
}

export function extractChatMessage(body: unknown): ChatCompletionMessage | null {
  if (typeof body !== 'object' || body === null) return null
  const message = (body as { choices?: Array<{ message?: { content?: unknown; tool_calls?: ChatCompletionMessage['tool_calls'] } }> })
    .choices?.[0]?.message
  if (!message) return null
  const content = typeof message.content === 'string' && message.content.trim() ? message.content.trim() : null
  const tool_calls = Array.isArray(message.tool_calls) ? message.tool_calls : undefined
  if (!content && !tool_calls?.length) return null
  return { content, tool_calls }
}

export async function completeChatCompletions(
  input: {
    url: string
    headers: Record<string, string>
    body: unknown
    timeoutMs: number
  },
  fetchImpl: FetchLike = fetch,
): Promise<ChatCompletionMessage | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), input.timeoutMs)
  try {
    const response = await fetchImpl(input.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': LLM_USER_AGENT,
        ...input.headers,
      },
      body: JSON.stringify(input.body),
      signal: controller.signal,
    })
    if (!response.ok) return null
    return extractChatMessage(await response.json())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function completeDirectProviders(
  env: Env,
  body: unknown,
  timeoutMs: number,
  fetchImpl: FetchLike = fetch,
): Promise<ChatCompletionMessage | null> {
  for (const provider of DIRECT_INFERENCE_PROVIDERS) {
    const apiKey = directProviderKey(env, provider)
    if (!apiKey) continue
    const message = await completeChatCompletions(
      {
        url: provider.url,
        headers: { authorization: `Bearer ${apiKey}` },
        body: {
          ...((typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>),
          model: provider.model,
        },
        timeoutMs,
      },
      fetchImpl,
    )
    if (message) return message
  }
  return null
}
