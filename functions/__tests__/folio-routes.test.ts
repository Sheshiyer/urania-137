/**
 * T-041..T-044 — /api/folio route-level tests through onRequest with the
 * dev-identity guard (two identities share one in-memory D1) covering the
 * frozen contract shapes: list + filters, save, PATCH {favorite}/DELETE with
 * the ownership guard, and idempotent import.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import type { Env } from '../lib/env'
import { onRequest } from '../api/[[path]]'
import { createReading, setReadingFavorite, upsertUser } from '../lib/db'
import { makeFakeD1 } from './fake-d1'
import type { FolioListResponse, ReadingDTO } from '../../src/lib/api/contract'

const LOCAL = 'http://localhost:8788'
const A = 'dev:a@example.com'
const B = 'dev:b@example.com'

function makeCtx(request: Request, db: unknown, devEmail: string | undefined) {
  const env = {
    DB: db,
    CF_ACCESS_AUD: 'aud-tag',
    CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
    SELEMENE_API_KEY: 'k',
    SELEMENE_API_URL: 'https://engine.example',
    DEV_IDENTITY_EMAIL: devEmail,
  } as Env
  return { request, env } as unknown as Parameters<typeof onRequest>[0]
}

const asA = (req: Request, db: unknown) => makeCtx(req, db, 'a@example.com')
const asB = (req: Request, db: unknown) => makeCtx(req, db, 'b@example.com')

const FOLIO = `${LOCAL}/api/folio`

const saveBody = (over: Record<string, unknown> = {}) => ({
  nodeId: 'moon',
  nodeLabel: 'Moon',
  mode: 'daily',
  title: 'Daily reading',
  content: 'Some content',
  ...over,
})

const post = (body: unknown, url = FOLIO) =>
  new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

let fake: ReturnType<typeof makeFakeD1>
let db: D1Database
beforeEach(async () => {
  fake = makeFakeD1()
  db = fake.db as unknown as D1Database
  await upsertUser(db, { id: A, email: 'a@example.com' })
  await upsertUser(db, { id: B, email: 'b@example.com' })
})

describe('GET /api/folio (T-041)', () => {
  async function seed() {
    for (const title of ['Alpha tides', 'Beta drive', 'Gamma harmony']) {
      await createReading(db, A, { nodeId: 'moon', nodeLabel: 'Moon', mode: 'daily', title, content: `content of ${title}` })
      await new Promise((r) => setTimeout(r, 2))
    }
    await createReading(db, B, { nodeId: 'sun', nodeLabel: 'Sun', mode: 'daily', title: 'B only reading', content: 'b' })
  }

  it('returns only the caller readings, newest first, as FolioListResponse', async () => {
    await seed()
    const res = await onRequest(asA(new Request(FOLIO), fake.db))
    expect(res.status).toBe(200)
    const body = (await res.json()) as FolioListResponse
    expect(Object.keys(body)).toEqual(['readings'])
    expect(body.readings).toHaveLength(3)
    expect(body.readings.map((r) => r.title)).toEqual(['Gamma harmony', 'Beta drive', 'Alpha tides'])
    for (const r of body.readings) {
      expect(Object.keys(r).sort()).toEqual(
        ['content', 'createdAt', 'favorite', 'id', 'mode', 'nodeId', 'nodeLabel', 'title'].sort(),
      )
    }
  })

  it('?search= narrows to title/content substring matches', async () => {
    await seed()
    const res = await onRequest(asA(new Request(`${FOLIO}?search=beta`), fake.db))
    const body = (await res.json()) as FolioListResponse
    expect(body.readings.map((r) => r.title)).toEqual(['Beta drive'])
  })

  it('?favorites=true narrows to favorites only; other truthy values do not', async () => {
    await seed()
    const list = (await (await onRequest(asA(new Request(FOLIO), fake.db))).json()) as FolioListResponse
    await setReadingFavorite(db, A, list.readings[1].id, true)
    const favs = (await (await onRequest(asA(new Request(`${FOLIO}?favorites=true`), fake.db))).json()) as FolioListResponse
    expect(favs.readings.map((r) => r.id)).toEqual([list.readings[1].id])
    const notFav = (await (await onRequest(asA(new Request(`${FOLIO}?favorites=1`), fake.db))).json()) as FolioListResponse
    expect(notFav.readings).toHaveLength(3)
  })

  it('user B sees none of user A readings', async () => {
    await seed()
    const body = (await (await onRequest(asB(new Request(FOLIO), fake.db))).json()) as FolioListResponse
    expect(body.readings.map((r) => r.title)).toEqual(['B only reading'])
  })

  it('unauthenticated → 401', async () => {
    const res = await onRequest(makeCtx(new Request(FOLIO), fake.db, undefined))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/folio (T-042)', () => {
  it('201 with the stored DTO (server id + createdAt + favorite=false), then listed by the owner only', async () => {
    const res = await onRequest(asA(post(saveBody({ title: 'Saved one' })), fake.db))
    expect(res.status).toBe(201)
    const created = (await res.json()) as ReadingDTO
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(created.createdAt).toBeGreaterThan(0)
    expect(created.favorite).toBe(false)
    expect(created).toMatchObject(saveBody({ title: 'Saved one' }))
    expect('raw' in created).toBe(false)

    const mine = (await (await onRequest(asA(new Request(FOLIO), fake.db))).json()) as FolioListResponse
    expect(mine.readings.map((r) => r.id)).toContain(created.id)
    const other = (await (await onRequest(asB(new Request(FOLIO), fake.db))).json()) as FolioListResponse
    expect(other.readings).toHaveLength(0)
  })

  it('accepts the optional raw string (stored, not returned in the DTO)', async () => {
    const res = await onRequest(asA(post(saveBody({ raw: '{"engine":true}' })), fake.db))
    expect(res.status).toBe(201)
    const created = (await res.json()) as ReadingDTO
    expect(fake.readings.get(created.id)!.raw).toBe('{"engine":true}')
  })

  it('missing required field → 400 with no row written', async () => {
    for (const field of ['nodeId', 'nodeLabel', 'mode', 'title', 'content']) {
      const body = saveBody()
      delete (body as Record<string, unknown>)[field]
      const res = await onRequest(asA(post(body), fake.db))
      expect(res.status).toBe(400)
      const err = (await res.json()) as { error: string; message: string }
      expect(err.error).toBe('BAD_REQUEST')
      expect(err.message).toContain(field)
    }
    expect(fake.readings.size).toBe(0)
  })

  it('non-JSON / non-object body → 400 with no row written', async () => {
    expect((await onRequest(asA(post('not-json{{'), fake.db))).status).toBe(400)
    expect((await onRequest(asA(post([1, 2, 3]), fake.db))).status).toBe(400)
    expect((await onRequest(asA(post(null), fake.db))).status).toBe(400)
    expect(fake.readings.size).toBe(0)
  })

  it('non-string optional raw → 400', async () => {
    const res = await onRequest(asA(post(saveBody({ raw: 42 })), fake.db))
    expect(res.status).toBe(400)
    expect(fake.readings.size).toBe(0)
  })

  it('unauthenticated → 401, no row written', async () => {
    const res = await onRequest(makeCtx(post(saveBody()), fake.db, undefined))
    expect(res.status).toBe(401)
    expect(fake.readings.size).toBe(0)
  })
})
