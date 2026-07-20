/**
 * T-052 — additional db-layer coverage (functions/lib/db.ts) against the
 * shared in-memory D1 fake, complementary to db-readings.test.ts (T-040,
 * unmodified). Focus: cross-user scope on the FILTER paths (search/favorites),
 * explicit-set (non-toggle) favorite semantics, and import dedupe edge cases.
 *
 * Mutation-sanity: every test in the "scope guards" describe is written so
 * that DROPPING a user_id scope or ownership guard in db.ts turns it red —
 * the live mutation experiment proving this is recorded in issue #143 and
 * docs/auth/2026-07-20-t054-phase3-exit-gate.md.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import type { ReadingDTO } from '../../src/lib/api/contract'
import {
  bulkImportReadings,
  createReading,
  deleteReading,
  getReadingById,
  listReadings,
  readingRowToDTO,
  setReadingFavorite,
  upsertUser,
} from '../lib/db'
import { makeFakeD1 } from './fake-d1'

const A = 'user-a'
const B = 'user-b'

let fake: ReturnType<typeof makeFakeD1>
let db: D1Database

beforeEach(async () => {
  fake = makeFakeD1()
  db = fake.db as unknown as D1Database
  await upsertUser(db, { id: A, email: 'a@example.com' })
  await upsertUser(db, { id: B, email: 'b@example.com' })
})

const seed = (userId: string, over: Partial<ReadingDTO> = {}) =>
  createReading(db, userId, {
    nodeId: over.nodeId ?? 'moon',
    nodeLabel: over.nodeLabel ?? 'Moon',
    mode: over.mode ?? 'daily',
    title: over.title ?? 'title',
    content: over.content ?? 'content',
  })

describe('scope guards on filter paths (T-052 — red if a user_id scope is dropped)', () => {
  it("search never crosses users: A's search for B's unique title/content → []", async () => {
    await seed(B, { title: 'B-unique-zqx-title', content: 'B-unique-zqx-content' })
    await seed(A, { title: 'A ordinary', content: 'A ordinary' })

    expect(await listReadings(db, A, { search: 'zqx' })).toEqual([])
    expect((await listReadings(db, B, { search: 'zqx' })).length).toBe(1)
    // Unscoped search would return B's rows for A → this assertion turns red.
  })

  it("favoritesOnly never crosses users: B's favorite is invisible in A's favorites list", async () => {
    const bRow = await seed(B, { title: 'B fav' })
    await setReadingFavorite(db, B, bRow.id, true)
    const aRow = await seed(A, { title: 'A not fav' })

    const aFavs = await listReadings(db, A, { favoritesOnly: true })
    expect(aFavs).toEqual([])
    await setReadingFavorite(db, A, aRow.id, true)
    const aFavs2 = await listReadings(db, A, { favoritesOnly: true })
    expect(aFavs2.map((r) => r.id)).toEqual([aRow.id])
  })

  it('combined search + favoritesOnly stays scoped', async () => {
    const bRow = await seed(B, { title: 'needle shared-title' })
    await setReadingFavorite(db, B, bRow.id, true)
    const aRow = await seed(A, { title: 'needle shared-title' })

    // A sees their own row by search, but NOT in favorites (not favorited);
    // an unscoped favorites+search would leak B's favorited row.
    expect((await listReadings(db, A, { search: 'needle' })).map((r) => r.id)).toEqual([aRow.id])
    expect(await listReadings(db, A, { search: 'needle', favoritesOnly: true })).toEqual([])
    expect((await listReadings(db, B, { search: 'needle', favoritesOnly: true })).map((r) => r.id)).toEqual([bRow.id])
  })

  it('cross-user setReadingFavorite does not mutate the row (tamper-evident)', async () => {
    const aRow = await seed(A, { title: 'A target' })
    expect(await setReadingFavorite(db, B, aRow.id, true)).toBeNull()
    expect(fake.readings.get(aRow.id)!.favorite).toBe(0)
    expect(await deleteReading(db, B, aRow.id)).toBe(false)
    expect(fake.readings.has(aRow.id)).toBe(true)
    expect(await getReadingById(db, B, aRow.id)).toBeNull()
  })
})

describe('setReadingFavorite is an explicit SET, not a toggle (frozen PATCH contract)', () => {
  it('true→true stays true; true→false clears; false→false stays false', async () => {
    const r = await seed(A)
    expect((await setReadingFavorite(db, A, r.id, true))!.favorite).toBe(true)
    expect((await setReadingFavorite(db, A, r.id, true))!.favorite).toBe(true) // idempotent set
    expect((await setReadingFavorite(db, A, r.id, false))!.favorite).toBe(false)
    expect((await setReadingFavorite(db, A, r.id, false))!.favorite).toBe(false)
  })
})

describe('readingRowToDTO — frozen ReadingDTO mapping', () => {
  it('maps snake_case → camelCase, favorite 1→true, drops raw/user_id; exact 8-key shape', () => {
    const dto = readingRowToDTO({
      id: 'x', user_id: 'u', node_id: 'n', node_label: 'N', mode: 'm',
      title: 't', content: 'c', raw: '{"k":1}', favorite: 1, created_at: 123,
    })
    expect(dto).toEqual({
      id: 'x', nodeId: 'n', nodeLabel: 'N', mode: 'm',
      title: 't', content: 'c', createdAt: 123, favorite: true,
    })
    expect(Object.keys(dto).sort()).toEqual(
      ['content', 'createdAt', 'favorite', 'id', 'mode', 'nodeId', 'nodeLabel', 'title'],
    )
    expect('raw' in dto).toBe(false)
    expect('user_id' in dto).toBe(false)
  })
})

describe('bulkImportReadings — dedupe edge cases (T-052)', () => {
  const entry = (over: Partial<ReadingDTO> = {}): ReadingDTO => ({
    id: 'legacy-x', nodeId: 'n', nodeLabel: 'N', mode: 'm',
    title: 't', content: 'c', createdAt: 1_750_000_000_000, favorite: false,
    ...over,
  })

  it('entry WITHOUT an id dedupes via content hash (re-import → 0)', async () => {
    const noId = entry({ id: undefined as unknown as string })
    expect(await bulkImportReadings(db, A, [noId])).toEqual({ imported: 1 })
    expect(await bulkImportReadings(db, A, [noId])).toEqual({ imported: 0 })
    const [row] = [...fake.readings.values()]
    expect(row.id).toMatch(/^imp_[0-9a-f]{64}$/)
  })

  it('whitespace-only legacy id falls back to the content-hash dedupe key', async () => {
    const blank = entry({ id: '   ' })
    expect(await bulkImportReadings(db, A, [blank])).toEqual({ imported: 1 })
    expect(await bulkImportReadings(db, A, [entry({ id: '' })])).toEqual({ imported: 0 })
  })

  it('non-finite createdAt is replaced with a finite server time', async () => {
    await bulkImportReadings(db, A, [entry({ createdAt: NaN })])
    const [row] = [...fake.readings.values()]
    expect(Number.isFinite(row.created_at)).toBe(true)
    expect(row.created_at).toBeGreaterThan(1_750_000_000_000)
  })

  it('delete-then-reimport re-creates the row (dedupe is storage-level, not a log)', async () => {
    const e = entry({ id: 'legacy-del' })
    await bulkImportReadings(db, A, [e])
    const [first] = await listReadings(db, A)
    expect(first.id.startsWith('imp_')).toBe(true)
    expect(await deleteReading(db, A, first.id)).toBe(true)
    expect(await bulkImportReadings(db, A, [e])).toEqual({ imported: 1 })
    const [second] = await listReadings(db, A)
    expect(second.id).toBe(first.id) // same deterministic id resurrected
  })

  it('two users importing an id-less entry get disjoint rows (per-user content-hash namespace)', async () => {
    const noId = entry({ id: undefined as unknown as string })
    await bulkImportReadings(db, A, [noId])
    expect(await bulkImportReadings(db, B, [noId])).toEqual({ imported: 1 })
    const ids = [...fake.readings.values()].map((r) => r.id)
    expect(new Set(ids).size).toBe(2)
    expect(ids.every((id) => id.startsWith('imp_'))).toBe(true)
  })

  it('imported rows store raw as NULL (raw is create-only)', async () => {
    await bulkImportReadings(db, A, [entry({ id: 'legacy-raw' })])
    const [row] = [...fake.readings.values()]
    expect(row.raw).toBeNull()
  })
})
