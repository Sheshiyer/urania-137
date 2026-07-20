/**
 * P1_AuthBackend focused tests for T-020 — GET /api/me (identity + user
 * upsert) and the /api/logout redirect, driven through onRequest with the
 * dev-identity guard and an in-memory D1 fake. Live D1 proof is T-026.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import type { Env } from '../lib/env'
import { onRequest } from '../api/[[path]]'
import type { UserRow } from '../lib/db'

/** Minimal in-memory D1 fake covering the two users statements db.ts issues. */
function makeFakeD1() {
  const rows = new Map<string, UserRow>()
  const db = {
    prepare(_sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              const [id, email, now] = args as [string, string, number]
              const existing = rows.get(id)
              if (existing) existing.last_seen_at = now
              else rows.set(id, { id, email, created_at: now, last_seen_at: now })
              return { success: true }
            },
            async first<T>() {
              const [id] = args as [string]
              return (rows.get(id) ?? null) as T | null
            },
          }
        },
      }
    },
  }
  return { db, rows }
}

function makeCtx(request: Request, db: unknown, over: Partial<Env> = {}) {
  const env = {
    DB: db,
    CF_ACCESS_AUD: 'aud-tag',
    CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
    SELEMENE_API_KEY: 'k',
    SELEMENE_API_URL: 'https://engine.example',
    DEV_IDENTITY_EMAIL: 'dev@example.com',
    ...over,
  } as Env
  return { request, env } as unknown as Parameters<typeof onRequest>[0]
}

const ME = 'http://localhost:8788/api/me'
const LOGOUT = 'http://localhost:8788/api/logout'

let fake: ReturnType<typeof makeFakeD1>
beforeEach(() => {
  fake = makeFakeD1()
})

describe('GET /api/me (T-020)', () => {
  it('returns {id,email} matching the verified identity and upserts one row', async () => {
    const res = await onRequest(makeCtx(new Request(ME), fake.db))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { id: string; email: string }
    expect(body).toEqual({ id: 'dev:dev@example.com', email: 'dev@example.com' })
    expect(fake.rows.size).toBe(1)
    const row = fake.rows.get('dev:dev@example.com')!
    expect(row.email).toBe('dev@example.com')
    expect(row.created_at).toBe(row.last_seen_at)
  })

  it('repeat call keeps one row: created_at stable, last_seen_at advances', async () => {
    const first = await onRequest(makeCtx(new Request(ME), fake.db))
    expect(first.status).toBe(200)
    const before = { ...fake.rows.get('dev:dev@example.com')! }
    await new Promise((r) => setTimeout(r, 5)) // ensure a distinct ms tick
    const second = await onRequest(makeCtx(new Request(ME), fake.db))
    expect(second.status).toBe(200)
    expect(fake.rows.size).toBe(1)
    const after = fake.rows.get('dev:dev@example.com')!
    expect(after.created_at).toBe(before.created_at)
    expect(after.last_seen_at).toBeGreaterThan(before.last_seen_at)
  })

  it('response body contains no token material', async () => {
    const res = await onRequest(makeCtx(new Request(ME), fake.db))
    const text = await res.text()
    expect(text).not.toContain('Cf-Access-Jwt-Assertion')
    expect(text).not.toContain('CF_Authorization')
    expect(Object.keys(JSON.parse(text)).sort()).toEqual(['email', 'id'])
  })

  it('unauthenticated request → 401, no upsert', async () => {
    const res = await onRequest(makeCtx(new Request(ME), fake.db, { DEV_IDENTITY_EMAIL: undefined }))
    expect(res.status).toBe(401)
    expect(fake.rows.size).toBe(0)
  })
})

describe('/api/logout (T-020)', () => {
  it('GET → 302 to /cdn-cgi/access/logout', async () => {
    const res = await onRequest(makeCtx(new Request(LOGOUT), fake.db))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/cdn-cgi/access/logout')
  })
  it('POST → 302 to /cdn-cgi/access/logout', async () => {
    const res = await onRequest(makeCtx(new Request(LOGOUT, { method: 'POST' }), fake.db))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/cdn-cgi/access/logout')
  })
  it('logout without auth → 401 (middleware runs on every /api/* request)', async () => {
    const res = await onRequest(makeCtx(new Request(LOGOUT), fake.db, { DEV_IDENTITY_EMAIL: undefined }))
    expect(res.status).toBe(401)
  })
})
