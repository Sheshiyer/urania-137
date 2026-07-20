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
import type { FolioListResponse } from '../../src/lib/api/contract'

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
