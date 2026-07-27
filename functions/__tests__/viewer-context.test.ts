import { describe, expect, it } from 'vitest'
import type { Env } from '../lib/env'
import { onRequest } from '../api/[[path]]'

function makeDb() {
  const users = new Map<
    string,
    { id: string; email: string; created_at: number; last_seen_at: number }
  >()
  return {
    prepare() {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              const [id, email, now] = args as [string, string, number]
              users.set(id, {
                id,
                email,
                created_at: users.get(id)?.created_at ?? now,
                last_seen_at: now,
              })
              return { success: true }
            },
            async first() {
              return users.get(args[0] as string) ?? null
            },
          }
        },
      }
    },
  }
}

function makeCtx(email: string | undefined, operatorEmails = 'operator@example.com') {
  const request = new Request('http://localhost:8788/api/viewer-context', {
    headers: {
      'x-operator': 'true',
      'x-admin-role': 'platform-admin',
    },
  })
  const env = {
    DB: makeDb(),
    CF_ACCESS_AUD: 'aud-tag',
    CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
    SELEMENE_API_KEY: 'k',
    SELEMENE_API_URL: 'https://engine.example',
    DEV_IDENTITY_EMAIL: email,
    OPERATOR_EMAILS: operatorEmails,
  } as unknown as Env
  return { request, env } as unknown as Parameters<typeof onRequest>[0]
}

describe('GET /api/viewer-context', () => {
  it('derives operator presentation from the verified server identity and allowlist', async () => {
    const res = await onRequest(makeCtx('Operator@Example.com ', ' other@example.com, OPERATOR@example.com '))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ capabilities: { operator: true } })
  })

  it('ignores client role headers for a non-operator identity', async () => {
    const res = await onRequest(makeCtx('reader@example.com'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ capabilities: { operator: false } })
  })

  it('fails closed before capability derivation when authentication is absent', async () => {
    const res = await onRequest(makeCtx(undefined))
    expect(res.status).toBe(401)
  })
})
