/**
 * T-040 — readings data-access layer (functions/lib/db.ts) against the shared
 * in-memory D1 fake, seeded with two users. Locks the acceptance behavior:
 * user scoping, created_at DESC order, search + favorites filters, ownership
 * on get/updateFavorite/delete (cross-user → null/false, no mutation), and
 * idempotent bulk import (stable per-user dedupe key).
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

const reading = (over: Partial<ReadingDTO> = {}): ReadingDTO => ({
  id: 'legacy-1',
  nodeId: 'moon',
  nodeLabel: 'Moon',
  mode: 'daily',
  title: 'Daily reading',
  content: 'Some content',
  createdAt: 1_750_000_000_000,
  favorite: false,
  ...over,
})

async function seedThree(userId: string) {
  const r1 = await createReading(db, userId, { nodeId: 'moon', nodeLabel: 'Moon', mode: 'daily', title: 'Alpha tides', content: 'first' })
  await new Promise((r) => setTimeout(r, 2))
  const r2 = await createReading(db, userId, { nodeId: 'mars', nodeLabel: 'Mars', mode: 'transit', title: 'Beta drive', content: 'second' })
  await new Promise((r) => setTimeout(r, 2))
  const r3 = await createReading(db, userId, { nodeId: 'venus', nodeLabel: 'Venus', mode: 'natal', title: 'Gamma harmony', content: 'third' })
  return [r1, r2, r3]
}

describe('createReading + listReadings (T-040)', () => {
  it('listByUser returns only the caller rows, newest first', async () => {
    const [a1, a2, a3] = await seedThree(A)
    await createReading(db, B, { nodeId: 'sun', nodeLabel: 'Sun', mode: 'daily', title: 'B only', content: 'b' })

    const list = await listReadings(db, A)
    expect(list.map((r) => r.id)).toEqual([a3.id, a2.id, a1.id])
    expect(list.every((r) => r.title !== 'B only')).toBe(true)

    const bList = await listReadings(db, B)
    expect(bList).toHaveLength(1)
    expect(bList[0].title).toBe('B only')
  })

  it('server-set fields: uuid id, created_at, favorite=false; raw stored but not in the DTO', async () => {
    const r = await createReading(db, A, {
      nodeId: 'moon', nodeLabel: 'Moon', mode: 'daily', title: 'T', content: 'C', raw: '{"engine":true}',
    })
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(r.createdAt).toBeGreaterThan(0)
    expect(r.favorite).toBe(false)
    expect('raw' in r).toBe(false)
    expect(fake.readings.get(r.id)!.raw).toBe('{"engine":true}')
  })

  it('search filters by title OR content substring (case-insensitive)', async () => {
    await seedThree(A)
    expect((await listReadings(db, A, { search: 'alpha' })).map((r) => r.title)).toEqual(['Alpha tides'])
    expect((await listReadings(db, A, { search: 'SECOND' })).map((r) => r.title)).toEqual(['Beta drive'])
    expect(await listReadings(db, A, { search: 'nothing-matches' })).toEqual([])
  })

  it('favoritesOnly returns only favorite=1 rows', async () => {
    const [a1, a2] = await seedThree(A)
    await setReadingFavorite(db, A, a2.id, true)
    const favs = await listReadings(db, A, { favoritesOnly: true })
    expect(favs.map((r) => r.id)).toEqual([a2.id])
    expect(favs[0].favorite).toBe(true)
    expect((await listReadings(db, A)).map((r) => r.id)).toContain(a1.id)
  })
})

describe('ownership guard (T-040)', () => {
  it('getById / updateFavorite / delete are null/false with no mutation cross-user', async () => {
    const [a1] = await seedThree(A)

    expect(await getReadingById(db, B, a1.id)).toBeNull()
    expect(await setReadingFavorite(db, B, a1.id, true)).toBeNull()
    expect(await deleteReading(db, B, a1.id)).toBe(false)

    const row = fake.readings.get(a1.id)!
    expect(row.user_id).toBe(A)
    expect(row.favorite).toBe(0) // provably unchanged

    // Owner paths work.
    expect(await getReadingById(db, A, a1.id)).not.toBeNull()
    const updated = await setReadingFavorite(db, A, a1.id, true)
    expect(updated?.favorite).toBe(true)
    expect(await deleteReading(db, A, a1.id)).toBe(true)
    expect(await getReadingById(db, A, a1.id)).toBeNull()
  })

  it('unknown id → null/false for the owner too', async () => {
    expect(await getReadingById(db, A, 'nope')).toBeNull()
    expect(await setReadingFavorite(db, A, 'nope', true)).toBeNull()
    expect(await deleteReading(db, A, 'nope')).toBe(false)
  })
})

describe('bulkImportReadings (T-044 mechanism)', () => {
  const payload = () => [
    reading({ id: 'legacy-1', title: 'One', createdAt: 1_751_000_000_000 }),
    reading({ id: 'legacy-2', title: 'Two', favorite: true, createdAt: 1_752_000_000_000 }),
    reading({ id: '', title: 'No legacy id', createdAt: 1_753_000_000_000 }),
  ]

  it('imports all entries; re-running the same payload imports 0 (idempotent)', async () => {
    const first = await bulkImportReadings(db, A, payload())
    expect(first).toEqual({ imported: 3 })
    expect(fake.readings.size).toBe(3)

    const second = await bulkImportReadings(db, A, payload())
    expect(second).toEqual({ imported: 0 })
    expect(fake.readings.size).toBe(3)
  })

  it('preserves legacy createdAt + favorite; rows surface in listByUser', async () => {
    await bulkImportReadings(db, A, payload())
    const list = await listReadings(db, A)
    expect(list).toHaveLength(3)
    expect(list[0].createdAt).toBe(1_753_000_000_000) // newest first
    const favs = await listReadings(db, A, { favoritesOnly: true })
    expect(favs.map((r) => r.title)).toEqual(['Two'])
  })

  it('dedupe keys are per-user: B importing the same payload gets B-owned rows', async () => {
    await bulkImportReadings(db, A, payload())
    const bResult = await bulkImportReadings(db, B, payload())
    expect(bResult).toEqual({ imported: 3 })
    expect(fake.readings.size).toBe(6)
    expect([...fake.readings.values()].filter((r) => r.user_id === B)).toHaveLength(3)
    // A's rows untouched.
    expect([...fake.readings.values()].filter((r) => r.user_id === A)).toHaveLength(3)
  })

  it('import ids are deterministic (same user + same legacy id ⇒ same row id)', async () => {
    await bulkImportReadings(db, A, [reading({ id: 'legacy-9' })])
    const first = await listReadings(db, A)
    await bulkImportReadings(db, A, [reading({ id: 'legacy-9' })])
    const second = await listReadings(db, A)
    expect(second).toHaveLength(1)
    expect(second[0].id).toBe(first[0].id)
    expect(first[0].id).toMatch(/^imp_[0-9a-f]{64}$/)
  })

  it('empty payload imports nothing', async () => {
    expect(await bulkImportReadings(db, A, [])).toEqual({ imported: 0 })
    expect(fake.readings.size).toBe(0)
  })
})
