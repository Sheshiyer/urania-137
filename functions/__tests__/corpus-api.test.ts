/**
 * T-079 fast-follow: Corpus API route tests (ISC-#133, ISC-139).
 *
 * Tests GET /api/corpus (list), GET /api/corpus/:id (detail + R2 body),
 * and GET /api/patterns/search (Vectorize) through onRequest with the
 * dev-identity guard, using the shared fake D1 + fake R2 bucket.
 *
 * All routes must:
 * - Return 401 without authenticated identity (T-008 fail-closed)
 * - Return only the caller's owner-scoped rows
 * - Return 404 for unknown / cross-user lookups (no existence leak)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import type { R2Bucket, VectorizeIndex, Ai } from '@cloudflare/workers-types'
import type { Env } from '../lib/env'
import { onRequest, type CorpusReadingRow, type CorpusListResponse, type CorpusDetailResponse } from '../api/[[path]]'
import { makeFakeD1 } from './fake-d1'

const LOCAL = 'http://localhost:8788'
const A = 'dev:a@example.com'
const B = 'dev:b@example.com'

function makeCtx(request: Request, db: unknown, r2: unknown, vectorize: unknown, ai: unknown, devEmail: string | undefined) {
  const env = {
    DB: db,
    CF_ACCESS_AUD: 'aud-tag',
    CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
    SELEMENE_API_KEY: 'k',
    SELEMENE_API_URL: 'https://engine.example',
    DEV_IDENTITY_EMAIL: devEmail,
    READINGS_BUCKET: r2,
    PATTERN_INDEX: vectorize,
    AI: ai,
  } as Env
  return { request, env } as unknown as Parameters<typeof onRequest>[0]
}

const asA = (req: Request, db: unknown, r2: unknown, vec: unknown, ai: unknown) =>
  makeCtx(req, db, r2, vec, ai, 'a@example.com')
const asB = (req: Request, db: unknown, r2: unknown, vec: unknown, ai: unknown) =>
  makeCtx(req, db, r2, vec, ai, 'b@example.com')

const CORPUS = `${LOCAL}/api/corpus`
const SEARCH = `${LOCAL}/api/patterns/search`

type CatalogueRow = CorpusReadingRow & { user_id: string }

function makeCatalogueRow(over: Partial<CatalogueRow> = {}): CatalogueRow {
  return {
    id: 'cat-1',
    sha256: 'a'.repeat(64),
    user_id: A,
    title: 'Daily reading',
    mode: 'Solo',
    source_type: 'engine/daily',
    created_at: 1_750_000_000_000,
    is_synastry: 0,
    canonical_uri: 'https://selemene.example/readings/abc',
    ...over,
  }
}

let fake: ReturnType<typeof makeFakeD1>
let r2: R2Bucket
let vectorize: VectorizeIndex
let ai: Ai

beforeEach(() => {
  fake = makeFakeD1()
  r2 = makeFakeR2(fake.r2Objects) as unknown as R2Bucket
  vectorize = { query: async () => ({ matches: [] }) } as unknown as VectorizeIndex
  ai = { run: async () => ({ data: [new Array(384).fill(0)] }) } as unknown as Ai
})

function makeFakeR2(objects: Map<string, { key: string; body: string }>): { get: (key: string) => Promise<{ text: () => Promise<string> } | null> } {
  return {
    get: async (key: string) => {
      const obj = objects.get(key)
      if (!obj) return null
      return { text: async () => obj.body }
    },
  }
}

describe('GET /api/corpus (catalogue list)', () => {
  async function seed() {
    fake.catalogueReadings.set('cat-1', makeCatalogueRow({ title: 'Alpha tides', mode: 'Solo', created_at: 1_751_000_000_000 }))
    fake.catalogueReadings.set('cat-2', makeCatalogueRow({ id: 'cat-2', sha256: 'b'.repeat(64), title: 'Beta drive', mode: 'Solo', created_at: 1_752_000_000_000 }))
    fake.catalogueReadings.set('cat-3', makeCatalogueRow({ id: 'cat-3', sha256: 'c'.repeat(64), title: 'Gamma synastry', mode: 'Synastry', created_at: 1_753_000_000_000 }))
    // User B's data — must not leak to A.
    fake.catalogueReadings.set('cat-b1', makeCatalogueRow({ id: 'cat-b1', sha256: 'z'.repeat(64), user_id: B, title: 'B private reading', mode: 'Solo', created_at: 1_754_000_000_000 }))
  }

  it('returns only caller rows, newest first, as CorpusListResponse', async () => {
    await seed()
    const res = await onRequest(asA(new Request(CORPUS), fake.db, r2, vectorize, ai))
    expect(res.status).toBe(200)
    const body = (await res.json()) as CorpusListResponse
    expect(body.readings).toHaveLength(3)
    expect(body.total).toBe(3)
    expect(body.readings.map((r) => r.title)).toEqual(['Gamma synastry', 'Beta drive', 'Alpha tides'])
    // No internal fields leak.
    for (const r of body.readings) {
      expect(Object.keys(r).sort()).toEqual(
        ['canonical_uri', 'created_at', 'id', 'is_synastry', 'mode', 'sha256', 'source_type', 'title'].sort(),
      )
    }
  })

  it('?search= narrows to title substring matches', async () => {
    await seed()
    const res = await onRequest(asA(new Request(`${CORPUS}?search=beta`), fake.db, r2, vectorize, ai))
    const body = (await res.json()) as CorpusListResponse
    expect(body.readings.map((r) => r.title)).toEqual(['Beta drive'])
  })

  it('?mode=Synastry filters by mode', async () => {
    await seed()
    const res = await onRequest(asA(new Request(`${CORPUS}?mode=Synastry`), fake.db, r2, vectorize, ai))
    const body = (await res.json()) as CorpusListResponse
    expect(body.readings).toHaveLength(1)
    expect(body.readings[0].title).toBe('Gamma synastry')
    expect(body.readings[0].mode).toBe('Synastry')
  })

  it('user B sees none of user A readings', async () => {
    await seed()
    const res = await onRequest(asB(new Request(CORPUS), fake.db, r2, vectorize, ai))
    const body = (await res.json()) as CorpusListResponse
    expect(body.readings.map((r) => r.title)).toEqual(['B private reading'])
  })

  it('unauthenticated → 401', async () => {
    const res = await onRequest(makeCtx(new Request(CORPUS), fake.db, r2, vectorize, ai, undefined))
    expect(res.status).toBe(401)
  })
})

describe('GET /api/corpus/:id (reading detail + R2 body)', () => {
  beforeEach(() => {
    fake.catalogueReadings.set('cat-1', makeCatalogueRow({ sha256: 'aaa...', title: 'Alpha tides' }))
    fake.r2Objects.set('corpus/readings/aaa.../reading.html', {
      key: 'corpus/readings/aaa.../reading.html',
      body: '<html><body>Full reading HTML</body></html>',
    })
  })

  it('returns metadata + R2 HTML body for owner', async () => {
    const res = await onRequest(asA(new Request(`${CORPUS}/aaa...`), fake.db, r2, vectorize, ai))
    expect(res.status).toBe(200)
    const body = (await res.json()) as CorpusDetailResponse
    expect(body.reading.title).toBe('Alpha tides')
    expect(body.reading.sha256).toBe('aaa...')
    expect(body.content_html).toBe('<html><body>Full reading HTML</body></html>')
  })

  it('cross-user lookup → 404 (no existence leak)', async () => {
    const res = await onRequest(asB(new Request(`${CORPUS}/aaa...`), fake.db, r2, vectorize, ai))
    expect(res.status).toBe(404)
    const err = (await res.json()) as { error: string }
    expect(err.error).toBe('NOT_FOUND')
  })

  it('unknown sha256 → 404', async () => {
    const res = await onRequest(asA(new Request(`${CORPUS}/unknown`), fake.db, r2, vectorize, ai))
    expect(res.status).toBe(404)
  })

  it('R2 object missing → 404', async () => {
    fake.catalogueReadings.set('cat-x', makeCatalogueRow({ sha256: 'xxx...', title: 'No R2 body' }))
    // No r2Objects entry for corpus/readings/xxx.../reading.html
    const res = await onRequest(asA(new Request(`${CORPUS}/xxx...`), fake.db, r2, vectorize, ai))
    expect(res.status).toBe(404)
  })

  it('unauthenticated → 401', async () => {
    const res = await onRequest(makeCtx(new Request(`${CORPUS}/aaa...`), fake.db, r2, vectorize, ai, undefined))
    expect(res.status).toBe(401)
  })
})

describe('GET /api/patterns/search (Vectorize similarity)', () => {
  it('returns empty results array when no matches', async () => {
    const res = await onRequest(asA(new Request(`${SEARCH}?q=moon`), fake.db, r2, vectorize, ai))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { results: unknown[]; query_embedding: boolean }
    expect(body.results).toEqual([])
    expect(body.query_embedding).toBe(true)
  })

  it('returns results from vectorize with score + metadata', async () => {
    const mockMatch = { id: 'vec-1', score: 0.92, metadata: { title: 'Moon pattern', owner_email: 'a@example.com' } }
    const vecWithResults = {
      query: async () => ({ matches: [mockMatch] }),
    } as unknown as VectorizeIndex
    const res = await onRequest(asA(new Request(`${SEARCH}?q=moon`), fake.db, r2, vecWithResults, ai))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { results: Array<{ id: string; score: number; metadata: Record<string, unknown> }> }
    expect(body.results).toHaveLength(1)
    expect(body.results[0].id).toBe('vec-1')
    expect(body.results[0].score).toBe(0.92)
  })

  it('missing q parameter → 400', async () => {
    const res = await onRequest(asA(new Request(`${SEARCH}`), fake.db, r2, vectorize, ai))
    expect(res.status).toBe(400)
  })

  it('empty q parameter → 400', async () => {
    const res = await onRequest(asA(new Request(`${SEARCH}?q=`), fake.db, r2, vectorize, ai))
    expect(res.status).toBe(400)
  })

  it('AI binding missing → 502 (embedding generation fails)', async () => {
    const envNoAI = {
      DB: fake.db,
      CF_ACCESS_AUD: 'aud-tag',
      CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
      SELEMENE_API_KEY: 'k',
      SELEMENE_API_URL: 'https://engine.example',
      DEV_IDENTITY_EMAIL: 'a@example.com',
      READINGS_BUCKET: r2,
      PATTERN_INDEX: vectorize,
    } as unknown as Env
    const ctx = { request: new Request(`${SEARCH}?q=test`), env: envNoAI } as unknown as Parameters<typeof onRequest>[0]
    const res = await onRequest(ctx)
    expect(res.status).toBe(502)
    const err = (await res.json()) as { error: string }
    expect(err.error).toBe('EMBEDDING_FAILED')
  })
})
