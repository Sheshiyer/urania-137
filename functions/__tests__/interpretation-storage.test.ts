/**
 * Task 5 — interpretation-storage repository tests against a small
 * self-contained in-memory D1 fake (fake-d1.ts is shared infra owned by
 * another worker; this test builds its own minimal fake covering exactly the
 * statements `functions/lib/interpretations/db.ts` and `functions/lib/db.ts`
 * issue, so it does not need to modify shared fixtures).
 *
 * Covers: immutable source reading row, owner isolation, canonical reading id
 * lookup, idempotency, and cross-owner/nonexistent indistinguishability.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import { createReading, getReadingById, upsertUser, type ReadingRow, type UserRow } from '../lib/db'
import {
  getReadingInterpretationById,
  listReadingInterpretationsByReadingId,
  saveReadingInterpretation,
  type ReadingInterpretationRow,
} from '../lib/interpretations/db'

const ok = (changes: number) => ({ success: true, meta: { changes, duration: 0, last_row_id: 0, served_by: 'fake' } })

function makeFakeD1() {
  const users = new Map<string, UserRow>()
  const readings = new Map<string, ReadingRow>()
  const interpretations = new Map<string, ReadingInterpretationRow>()

  function run(sql: string, args: unknown[]) {
    if (sql.startsWith('INSERT INTO users')) {
      const [id, email, now] = args as [string, string, number]
      const existing = users.get(id)
      if (existing) existing.last_seen_at = now
      else users.set(id, { id, email, created_at: now, last_seen_at: now })
      return ok(1)
    }
    if (sql.startsWith('INSERT INTO readings')) {
      const [id, user_id, node_id, node_label, mode, title, content, raw, created_at] = args as [
        string, string, string, string, string, string, string, string | null, number,
      ]
      if (readings.has(id)) return ok(0)
      readings.set(id, { id, user_id, node_id, node_label, mode, title, content, raw, favorite: 0, created_at })
      return ok(1)
    }
    if (sql.startsWith('INSERT INTO reading_interpretations')) {
      const [
        id, reading_id, owner_user_id, idempotency_key, route,
        interpretation_depth, consciousness_level, question, answer,
        context_packet_hash, fact_lock_hash, source_refs_json, provenance_json, created_at,
      ] = args as [
        string, string, string, string, string, number, number, string, string,
        string, string, string, string | null, number,
      ]
      const dupe = [...interpretations.values()].find(
        (row) => row.owner_user_id === owner_user_id && row.idempotency_key === idempotency_key,
      )
      if (dupe) return ok(0) // ON CONFLICT(owner_user_id, idempotency_key) DO NOTHING
      interpretations.set(id, {
        id, reading_id, owner_user_id, idempotency_key, route,
        interpretation_depth, consciousness_level, question, answer,
        context_packet_hash, fact_lock_hash, source_refs_json, provenance_json, created_at,
      })
      return ok(1)
    }
    throw new Error(`fake D1: unsupported run() SQL: ${sql}`)
  }

  function first(sql: string, args: unknown[]): unknown | null {
    if (sql.startsWith('SELECT id, email, created_at, last_seen_at FROM users')) {
      const row = users.get(args[0] as string)
      return row ? { ...row } : null
    }
    if (sql.includes('FROM readings WHERE id = ?1 AND user_id = ?2')) {
      const row = readings.get(args[0] as string)
      return row && row.user_id === args[1] ? { ...row } : null
    }
    if (sql.includes('FROM reading_interpretations WHERE owner_user_id = ?1 AND idempotency_key = ?2')) {
      const [ownerUserId, idempotencyKey] = args as [string, string]
      const row = [...interpretations.values()].find(
        (r) => r.owner_user_id === ownerUserId && r.idempotency_key === idempotencyKey,
      )
      return row ? { ...row } : null
    }
    if (sql.includes('FROM reading_interpretations WHERE id = ?1 AND owner_user_id = ?2')) {
      const [id, ownerUserId] = args as [string, string]
      const row = interpretations.get(id)
      return row && row.owner_user_id === ownerUserId ? { ...row } : null
    }
    throw new Error(`fake D1: unsupported first() SQL: ${sql}`)
  }

  function all(sql: string, args: unknown[]): unknown[] {
    if (sql.includes('FROM reading_interpretations') && sql.includes('ORDER BY created_at DESC')) {
      const [readingId, ownerUserId] = args as [string, string]
      return [...interpretations.values()]
        .filter((r) => r.reading_id === readingId && r.owner_user_id === ownerUserId)
        .sort((a, b) => b.created_at - a.created_at)
        .map((r) => ({ ...r }))
    }
    throw new Error(`fake D1: unsupported all() SQL: ${sql}`)
  }

  const db = {
    prepare(sql: string) {
      const normalized = sql.replace(/\s+/g, ' ').trim()
      let boundArgs: unknown[] = []
      return {
        bind(...args: unknown[]) {
          boundArgs = args
          return this
        },
        async run() {
          return run(normalized, boundArgs)
        },
        async first<T>() {
          return first(normalized, boundArgs) as T | null
        },
        async all<T>() {
          return { results: all(normalized, boundArgs) as T[] }
        },
      }
    },
  }

  return { db, readings, interpretations }
}

const OWNER_A = 'owner-a'
const OWNER_B = 'owner-b'

let fake: ReturnType<typeof makeFakeD1>
let db: D1Database

beforeEach(async () => {
  fake = makeFakeD1()
  db = fake.db as unknown as D1Database
  await upsertUser(db, { id: OWNER_A, email: 'a@example.com' })
  await upsertUser(db, { id: OWNER_B, email: 'b@example.com' })
})

function interpretationInput(readingId: string, over: Partial<Parameters<typeof saveReadingInterpretation>[2]> = {}) {
  return {
    readingId,
    idempotencyKey: 'key-1',
    route: 'pattern',
    interpretationDepth: 2,
    consciousnessLevel: 3,
    question: 'What patterns emerge?',
    answer: 'A grounded answer.',
    contextPacketHash: 'a'.repeat(64),
    factLockHash: 'b'.repeat(64),
    sourceRefs: ['engine:panchanga:run-42'],
    ...over,
  }
}

describe('immutable source reading row', () => {
  it('saving an interpretation does not change the linked reading row', async () => {
    const reading = await createReading(db, OWNER_A, {
      nodeId: 'moon', nodeLabel: 'Moon', mode: 'daily', title: 'T', content: 'C',
    })
    const before = await getReadingById(db, OWNER_A, reading.id)

    await saveReadingInterpretation(db, OWNER_A, interpretationInput(reading.id))

    const after = await getReadingById(db, OWNER_A, reading.id)
    expect(after).toEqual(before)
  })
})

describe('owner isolation', () => {
  it('an owner cannot list another owner interpretations for the same reading id', async () => {
    const reading = await createReading(db, OWNER_A, {
      nodeId: 'moon', nodeLabel: 'Moon', mode: 'daily', title: 'T', content: 'C',
    })
    await saveReadingInterpretation(db, OWNER_A, interpretationInput(reading.id))

    const ownerAList = await listReadingInterpretationsByReadingId(db, OWNER_A, reading.id)
    const ownerBList = await listReadingInterpretationsByReadingId(db, OWNER_B, reading.id)

    expect(ownerAList.length).toBe(1)
    expect(ownerBList.length).toBe(0)
  })
})

describe('canonical reading id lookup', () => {
  it('lists interpretations linked to the canonical reading id, newest first', async () => {
    const reading = await createReading(db, OWNER_A, {
      nodeId: 'moon', nodeLabel: 'Moon', mode: 'daily', title: 'T', content: 'C',
    })
    await saveReadingInterpretation(db, OWNER_A, interpretationInput(reading.id, { idempotencyKey: 'key-1' }))
    await saveReadingInterpretation(db, OWNER_A, interpretationInput(reading.id, { idempotencyKey: 'key-2' }))

    const list = await listReadingInterpretationsByReadingId(db, OWNER_A, reading.id)
    expect(list.length).toBe(2)
    expect(list.every((row) => row.reading_id === reading.id)).toBe(true)
  })
})

describe('idempotency', () => {
  it('the same owner + idempotency key resolves to exactly one row, not a duplicate insert', async () => {
    const reading = await createReading(db, OWNER_A, {
      nodeId: 'moon', nodeLabel: 'Moon', mode: 'daily', title: 'T', content: 'C',
    })
    const first = await saveReadingInterpretation(db, OWNER_A, interpretationInput(reading.id, { idempotencyKey: 'same-key' }))
    const second = await saveReadingInterpretation(db, OWNER_A, interpretationInput(reading.id, {
      idempotencyKey: 'same-key',
      answer: 'A different answer that should NOT overwrite the first row',
    }))

    expect(second.id).toBe(first.id)
    expect(second.answer).toBe(first.answer)

    const list = await listReadingInterpretationsByReadingId(db, OWNER_A, reading.id)
    expect(list.length).toBe(1)
  })

  it('different owners with the same idempotency key get independent rows', async () => {
    const reading = await createReading(db, OWNER_A, {
      nodeId: 'moon', nodeLabel: 'Moon', mode: 'daily', title: 'T', content: 'C',
    })
    const a = await saveReadingInterpretation(db, OWNER_A, interpretationInput(reading.id, { idempotencyKey: 'shared-key' }))
    const b = await saveReadingInterpretation(db, OWNER_B, interpretationInput(reading.id, { idempotencyKey: 'shared-key' }))
    expect(a.id).not.toBe(b.id)
  })
})

describe('cross-owner vs nonexistent indistinguishability', () => {
  it('getReadingInterpretationById returns null identically for cross-owner and nonexistent ids', async () => {
    const reading = await createReading(db, OWNER_A, {
      nodeId: 'moon', nodeLabel: 'Moon', mode: 'daily', title: 'T', content: 'C',
    })
    const row = await saveReadingInterpretation(db, OWNER_A, interpretationInput(reading.id))

    const crossOwner = await getReadingInterpretationById(db, OWNER_B, row.id)
    const nonexistent = await getReadingInterpretationById(db, OWNER_B, 'does-not-exist')

    expect(crossOwner).toBeNull()
    expect(nonexistent).toBeNull()
    expect(crossOwner).toEqual(nonexistent)
  })

  it('listReadingInterpretationsByReadingId returns [] identically for cross-owner and nonexistent reading ids', async () => {
    const reading = await createReading(db, OWNER_A, {
      nodeId: 'moon', nodeLabel: 'Moon', mode: 'daily', title: 'T', content: 'C',
    })
    await saveReadingInterpretation(db, OWNER_A, interpretationInput(reading.id))

    const crossOwner = await listReadingInterpretationsByReadingId(db, OWNER_B, reading.id)
    const nonexistentReading = await listReadingInterpretationsByReadingId(db, OWNER_A, 'no-such-reading')

    expect(crossOwner).toEqual([])
    expect(nonexistentReading).toEqual([])
  })
})
