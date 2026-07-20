/**
 * T-053 — contract conformance: every folio request/response matches the
 * FROZEN shared types in src/lib/api/contract.ts — at compile time (the
 * type-level assertions below fail `tsc` on contract drift) and at runtime
 * (each endpoint's response is run through a strict shape detector, and the
 * detector itself is proven to bite via drift injection).
 *
 * Locked shapes (frozen in Phase 0 — this file VERIFIES, never edits):
 *   ReadingDTO        — exactly 8 keys (id,nodeId,nodeLabel,mode,title,content,createdAt,favorite)
 *   FolioListResponse — { readings } only
 *   ImportResponse    — { imported } only
 *   ApiError          — { error, message }
 *   PATCH body        — { favorite: boolean }; DELETE success — 200 with {}
 *   ownership failure — uniform 404 { error:'NOT_FOUND' } (unknown ≡ cross-user)
 *   400s              — messages carry the offending field name
 */
import { describe, it, expect, beforeEach } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import type { Env } from '../lib/env'
import { onRequest } from '../api/[[path]]'
import { makeFakeD1 } from './fake-d1'
import type {
  ApiError,
  FolioListResponse,
  ImportRequest,
  ImportResponse,
  ReadingDTO,
  SaveReadingRequest,
  User,
  MeResponse,
} from '../../src/lib/api/contract'

// ---------------------------------------------------------------------------
// Compile-time bindings — any drift in the frozen contract turns `tsc` red.
// ---------------------------------------------------------------------------
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false
const assertType = <T extends true>(): T => true as T

assertType<Equal<keyof ReadingDTO, 'id' | 'nodeId' | 'nodeLabel' | 'mode' | 'title' | 'content' | 'createdAt' | 'favorite'>>()
assertType<Equal<keyof FolioListResponse, 'readings'>>()
assertType<Equal<keyof ImportResponse, 'imported'>>()
assertType<Equal<keyof ImportRequest, 'entries'>>()
assertType<Equal<keyof SaveReadingRequest, 'nodeId' | 'nodeLabel' | 'mode' | 'title' | 'content'>>()
assertType<Equal<keyof ApiError, 'error' | 'message'>>()
assertType<Equal<MeResponse, User>>()
assertType<Equal<ReadingDTO['createdAt'], number>>()
assertType<Equal<ReadingDTO['favorite'], boolean>>()
assertType<Equal<ImportResponse['imported'], number>>()

// Client-boundary request builders — the exact shapes folioStore/folioImport
// send, bound to the frozen request types at compile time.
const clientSaveBody = (e: SaveReadingRequest): string => JSON.stringify(e)
const clientPatchBody = (favorite: boolean): string => JSON.stringify({ favorite })
const clientImportBody = (entries: ReadingDTO[]): string => JSON.stringify({ entries } satisfies ImportRequest)
void clientSaveBody
void clientPatchBody
void clientImportBody

// ---------------------------------------------------------------------------
// Runtime shape detectors — strict: exact key sets + primitive types.
// ---------------------------------------------------------------------------
const READING_KEYS = ['content', 'createdAt', 'favorite', 'id', 'mode', 'nodeId', 'nodeLabel', 'title']

function assertKeySet(x: unknown, keys: string[], label: string): asserts x is Record<string, unknown> {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) throw new Error(`${label}: not a plain object`)
  const got = Object.keys(x as object).sort()
  if (JSON.stringify(got) !== JSON.stringify([...keys].sort())) {
    throw new Error(`${label}: key drift — got [${got}] want [${keys}]`)
  }
}

function assertReadingDTOShape(x: unknown, label = 'ReadingDTO'): asserts x is ReadingDTO {
  assertKeySet(x, READING_KEYS, label)
  const r = x as Record<string, unknown>
  if (typeof r.id !== 'string') throw new Error(`${label}.id: not a string`)
  if (typeof r.nodeId !== 'string') throw new Error(`${label}.nodeId: not a string`)
  if (typeof r.nodeLabel !== 'string') throw new Error(`${label}.nodeLabel: not a string`)
  if (typeof r.mode !== 'string') throw new Error(`${label}.mode: not a string`)
  if (typeof r.title !== 'string') throw new Error(`${label}.title: not a string`)
  if (typeof r.content !== 'string') throw new Error(`${label}.content: not a string`)
  if (typeof r.createdAt !== 'number') throw new Error(`${label}.createdAt: not a number`)
  if (typeof r.favorite !== 'boolean') throw new Error(`${label}.favorite: not a boolean`)
}

function assertApiErrorShape(x: unknown, label = 'ApiError'): asserts x is ApiError {
  assertKeySet(x, ['error', 'message'], label)
  const e = x as unknown as ApiError
  if (typeof e.error !== 'string' || typeof e.message !== 'string') {
    throw new Error(`${label}: error/message must be strings`)
  }
}

// ---------------------------------------------------------------------------
// Route driver (same pattern as folio-routes.test.ts, two dev identities).
// ---------------------------------------------------------------------------
const LOCAL = 'http://localhost:8788'

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

const jsonReq = (method: string, path: string, body?: unknown) =>
  new Request(`${LOCAL}${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

async function call(ctx: Parameters<typeof onRequest>[0]) {
  const res = await onRequest(ctx)
  return { status: res.status, body: (await res.json()) as unknown }
}

let db: D1Database
beforeEach(() => {
  db = makeFakeD1().db as unknown as D1Database
})

const asA = (req: Request) => makeCtx(req, db, 'a@example.com')
const asB = (req: Request) => makeCtx(req, db, 'b@example.com')

const SAVE: SaveReadingRequest = {
  nodeId: 'moon', nodeLabel: 'Moon', mode: 'daily', title: 'T', content: 'C',
}

async function seedAsA(): Promise<ReadingDTO> {
  const r = await call(asA(jsonReq('POST', '/api/folio', SAVE)))
  if (r.status !== 201) throw new Error('seed failed')
  return r.body as ReadingDTO
}

describe('response shapes match the frozen contract exactly', () => {
  it('POST /api/folio → 201 + exact ReadingDTO', async () => {
    const r = await call(asA(jsonReq('POST', '/api/folio', SAVE)))
    expect(r.status).toBe(201)
    assertReadingDTOShape(r.body, 'POST /api/folio response')
    const dto: ReadingDTO = r.body
    expect(dto.favorite).toBe(false)
  })

  it('GET /api/folio → {readings} only; every item an exact ReadingDTO', async () => {
    await seedAsA()
    const r = await call(asA(jsonReq('GET', '/api/folio')))
    expect(r.status).toBe(200)
    assertKeySet(r.body, ['readings'], 'FolioListResponse')
    const list: FolioListResponse = r.body as unknown as FolioListResponse
    expect(Array.isArray(list.readings)).toBe(true)
    for (const item of list.readings) assertReadingDTOShape(item, 'list item')
  })

  it('PATCH /api/folio/:id {favorite:boolean} → 200 + exact ReadingDTO', async () => {
    const seeded = await seedAsA()
    const r = await call(asA(jsonReq('PATCH', `/api/folio/${seeded.id}`, { favorite: true })))
    expect(r.status).toBe(200)
    assertReadingDTOShape(r.body, 'PATCH response')
    expect((r.body as ReadingDTO).favorite).toBe(true)
  })

  it('DELETE /api/folio/:id → 200 with body exactly {}', async () => {
    const seeded = await seedAsA()
    const r = await call(asA(jsonReq('DELETE', `/api/folio/${seeded.id}`)))
    expect(r.status).toBe(200)
    assertKeySet(r.body, [], 'DELETE success body')
  })

  it('POST /api/folio/import → ImportResponse is {imported} ONLY', async () => {
    const entries: ReadingDTO[] = [
      { id: 'l1', nodeId: 'n', nodeLabel: 'N', mode: 'm', title: 't', content: 'c', createdAt: 1, favorite: false },
    ]
    const r = await call(asA(jsonReq('POST', '/api/folio/import', { entries } satisfies ImportRequest)))
    expect(r.status).toBe(200)
    assertKeySet(r.body, ['imported'], 'ImportResponse')
    const ir: ImportResponse = r.body as unknown as ImportResponse
    expect(ir.imported).toBe(1)
  })

  it('ownership failure is a uniform 404 NOT_FOUND — unknown id ≡ cross-user id', async () => {
    const seeded = await seedAsA()
    const cross = await call(asB(jsonReq('PATCH', `/api/folio/${seeded.id}`, { favorite: true })))
    const unknown = await call(asA(jsonReq('PATCH', `/api/folio/${'0'.repeat(8)}-0000-0000-0000-000000000000`, { favorite: true })))
    expect(cross.status).toBe(404)
    expect(unknown.status).toBe(404)
    expect(cross.body).toEqual(unknown.body) // byte-identical — no existence leak
    assertApiErrorShape(cross.body)
    expect((cross.body as ApiError).error).toBe('NOT_FOUND')
    const crossDel = await call(asB(jsonReq('DELETE', `/api/folio/${seeded.id}`)))
    const unknownDel = await call(asA(jsonReq('DELETE', `/api/folio/${'0'.repeat(8)}-0000-0000-0000-000000000000`)))
    expect(crossDel.status).toBe(404)
    expect(crossDel.body).toEqual(unknownDel.body)
  })

  it('unauthenticated folio request → 401 ApiError envelope', async () => {
    const r = await call(makeCtx(jsonReq('GET', '/api/folio'), db, undefined))
    expect(r.status).toBe(401)
    assertApiErrorShape(r.body)
    expect((r.body as ApiError).error).toBe('UNAUTHORIZED')
  })
})

describe('400s carry the offending field name', () => {
  it.each(['nodeId', 'nodeLabel', 'mode', 'title', 'content'] as const)(
    'POST missing/non-string %s → 400 naming the field',
    async (field) => {
      const body: Record<string, unknown> = { ...SAVE, [field]: 42 }
      const r = await call(asA(jsonReq('POST', '/api/folio', body)))
      expect(r.status).toBe(400)
      assertApiErrorShape(r.body)
      expect((r.body as ApiError).message).toContain(field)
    },
  )

  it('POST with non-string raw → 400 naming raw', async () => {
    const r = await call(asA(jsonReq('POST', '/api/folio', { ...SAVE, raw: 7 })))
    expect(r.status).toBe(400)
    expect((r.body as ApiError).message).toContain('raw')
  })

  it('POST with unparseable JSON body → 400', async () => {
    const req = new Request(`${LOCAL}/api/folio`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{nope' })
    const r = await call(asA(req))
    expect(r.status).toBe(400)
    assertApiErrorShape(r.body)
  })

  it('PATCH without boolean favorite → 400 naming favorite', async () => {
    const seeded = await seedAsA()
    for (const body of [{}, { favorite: 'yes' }, { favorite: 1 }]) {
      const r = await call(asA(jsonReq('PATCH', `/api/folio/${seeded.id}`, body)))
      expect(r.status).toBe(400)
      expect((r.body as ApiError).message).toContain('favorite')
    }
  })

  it('import without entries array → 400 naming entries', async () => {
    for (const body of [{}, { entries: 'nope' }, { entries: 5 }]) {
      const r = await call(asA(jsonReq('POST', '/api/folio/import', body)))
      expect(r.status).toBe(400)
      expect((r.body as ApiError).message).toContain('entries')
    }
  })
})

describe('drift injection — the shape detector itself is proven to bite', () => {
  const valid: ReadingDTO = { id: 'x', nodeId: 'n', nodeLabel: 'N', mode: 'm', title: 't', content: 'c', createdAt: 1, favorite: false }

  it('accepts a valid DTO; rejects every injected drift', () => {
    expect(() => assertReadingDTOShape(valid)).not.toThrow()
    // field-type drift
    expect(() => assertReadingDTOShape({ ...valid, createdAt: '1' })).toThrow(/createdAt/)
    expect(() => assertReadingDTOShape({ ...valid, favorite: 1 })).toThrow(/favorite/)
    expect(() => assertReadingDTOShape({ ...valid, id: 7 })).toThrow(/\.id/)
    // missing key
    const { title: _omit, ...missing } = valid
    expect(() => assertReadingDTOShape(missing)).toThrow(/key drift/)
    // extra key (e.g. a leaked raw/user_id)
    expect(() => assertReadingDTOShape({ ...valid, raw: '{}' })).toThrow(/key drift/)
    expect(() => assertReadingDTOShape({ ...valid, user_id: 'u' })).toThrow(/key drift/)
    // envelope drift
    expect(() => assertKeySet({ readings: [], total: 1 }, ['readings'], 'FolioListResponse')).toThrow(/key drift/)
    expect(() => assertKeySet({ imported: 1, skipped: 0 }, ['imported'], 'ImportResponse')).toThrow(/key drift/)
    expect(() => assertApiErrorShape({ error: 'X' })).toThrow(/key drift/)
  })
})
