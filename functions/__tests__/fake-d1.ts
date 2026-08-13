/**
 * Shared in-memory D1 fake for the functions test suites (T-040/T-052 style —
 * the p1 suites used per-file fakes; the readings surface needs one fake
 * covering users + readings, shared by the DAL and route tests).
 *
 * It implements the exact statements issued by functions/lib/db.ts, dispatched
 * on normalized SQL text — semantics mirror D1: bound params only, changes
 * counted in meta.changes, scoping enforced per row.
 */
import type { ReadingRow, UserRow } from '../lib/db'
import type { ReadingInterpretationRow } from '../lib/interpretations/db'
import type { CorpusReadingRow } from '../api/[[path]]'

const ok = (changes: number) => ({ success: true, meta: { changes, duration: 0, last_row_id: 0, served_by: 'fake' } })

export function makeFakeD1() {
  const users = new Map<string, UserRow>()
  const readings = new Map<string, ReadingRow>()
  const interpretations = new Map<string, ReadingInterpretationRow>()
  const catalogueReadings = new Map<string, CorpusReadingRow & { user_id: string }>()
  const r2Objects = new Map<string, { key: string; body: string }>()

  function run(sql: string, args: unknown[]) {
    if (sql.startsWith('INSERT INTO reading_interpretations')) {
      const [
        id, reading_id, owner_user_id, idempotency_key, route,
        interpretation_depth, consciousness_level, question, answer,
        context_packet_hash, fact_lock_hash, source_refs_json, provenance_json, created_at,
      ] = args as [
        string, string, string, string, string,
        number, number, string, string,
        string, string, string, string | null, number,
      ]
      const conflict = [...interpretations.values()].some(
        (row) => row.owner_user_id === owner_user_id && row.idempotency_key === idempotency_key,
      )
      if (conflict) return ok(0) // ON CONFLICT(owner_user_id, idempotency_key) DO NOTHING
      interpretations.set(id, {
        id,
        reading_id,
        owner_user_id,
        idempotency_key,
        route,
        interpretation_depth,
        consciousness_level,
        question,
        answer,
        context_packet_hash,
        fact_lock_hash,
        source_refs_json,
        provenance_json,
        created_at,
      })
      return ok(1)
    }
    if (sql.startsWith('INSERT INTO users')) {
      const [id, email, now] = args as [string, string, number]
      const existing = users.get(id)
      if (existing) existing.last_seen_at = now
      else users.set(id, { id, email, created_at: now, last_seen_at: now })
      return ok(1)
    }
    if (sql.startsWith('INSERT INTO readings')) {
      // Two shapes: createReading (raw bound, favorite literal 0) and
      // bulkImportReadings (ON CONFLICT, raw NULL literal, favorite bound).
      const isImport = sql.includes('ON CONFLICT')
      const [id, user_id, node_id, node_label, mode, title, content, a8, a9] = args as [
        string, string, string, string, string, string, string, string | number | null, number,
      ]
      const raw = isImport ? null : (a8 as string | null)
      const favorite = isImport ? (a8 as number) : 0
      const created_at = a9
      if (readings.has(id)) return ok(0) // ON CONFLICT(id) DO NOTHING
      readings.set(id, { id, user_id, node_id, node_label, mode, title, content, raw, favorite, created_at })
      return ok(1)
    }
    if (sql.startsWith('UPDATE readings SET favorite')) {
      const [id, userId, fav] = args as [string, string, number]
      const row = readings.get(id)
      if (!row || row.user_id !== userId) return ok(0)
      row.favorite = fav
      return ok(1)
    }
    if (sql.startsWith('DELETE FROM readings')) {
      const [id, userId] = args as [string, string]
      const row = readings.get(id)
      if (!row || row.user_id !== userId) return ok(0)
      readings.delete(id)
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
    if (
      sql.startsWith('SELECT') &&
      sql.includes('FROM reading_interpretations') &&
      sql.includes('WHERE owner_user_id = ?1 AND idempotency_key = ?2')
    ) {
      const [ownerUserId, idempotencyKey] = args as [string, string]
      const row = [...interpretations.values()].find(
        (item) => item.owner_user_id === ownerUserId && item.idempotency_key === idempotencyKey,
      )
      return row ? { ...row } : null
    }
    if (
      sql.startsWith('SELECT') &&
      sql.includes('FROM reading_interpretations') &&
      sql.includes('WHERE id = ?1 AND owner_user_id = ?2')
    ) {
      const [id, ownerUserId] = args as [string, string]
      const row = interpretations.get(id)
      return row && row.owner_user_id === ownerUserId ? { ...row } : null
    }
    // catalogue_readings: SELECT single row by sha256 + user_id (GET /api/corpus/:id)
    if (sql.startsWith('SELECT id, sha256') && sql.includes('FROM catalogue_readings') && sql.includes('WHERE user_id = ?1 AND sha256 = ?2')) {
      const [userId, sha256] = args as [string, string]
      for (const [, row] of catalogueReadings) {
        if (row.user_id === userId && row.sha256 === sha256) {
          return { ...row }
        }
      }
      return null
    }
    // catalogue_readings: SELECT COUNT(*) for total count
    if (sql.startsWith('SELECT COUNT(*) as total FROM catalogue_readings')) {
      const userId = args[0] as string
      let rows = [...catalogueReadings.values()].filter((r) => r.user_id === userId)
      const search = args.length > 1 ? (args[1] as string) : undefined
      const mode = args.length > 2 ? (args[2] as string) : undefined
      if (search !== undefined && search.trim().length > 0) {
        const needle = search.trim().toLowerCase()
        rows = rows.filter((r) => r.title.toLowerCase().includes(needle))
      }
      if (mode !== undefined && mode.trim().length > 0) {
        rows = rows.filter((r) => r.mode === mode.trim())
      }
      return { total: rows.length }
    }
    throw new Error(`fake D1: unsupported first() SQL: ${sql}`)
  }

  function all(sql: string, args: unknown[]): unknown[] {
    if (
      sql.startsWith('SELECT') &&
      sql.includes('FROM reading_interpretations') &&
      sql.includes('WHERE reading_id = ?1 AND owner_user_id = ?2')
    ) {
      const [readingId, ownerUserId] = args as [string, string]
      return [...interpretations.values()]
        .filter((row) => row.reading_id === readingId && row.owner_user_id === ownerUserId)
        .sort((a, b) => b.created_at - a.created_at)
        .map((row) => ({ ...row }))
    }
    if (sql.includes('FROM readings') && sql.includes('ORDER BY created_at DESC')) {
      const [userId, favFlag, term] = args as [string, number, string]
      const needle = term.toLowerCase()
      return [...readings.values()]
        .filter((r) => r.user_id === userId)
        .filter((r) => favFlag === 0 || r.favorite === 1)
        .filter(
          (r) =>
            term === '' ||
            r.title.toLowerCase().includes(needle) ||
            r.content.toLowerCase().includes(needle),
        )
        .sort((a, b) => b.created_at - a.created_at)
        .map((r) => ({ ...r }))
    }
    // catalogue_readings: SELECT list with optional filters (GET /api/corpus)
    if (sql.includes('FROM catalogue_readings') && sql.includes('ORDER BY created_at DESC')) {
      const userId = args[0] as string
      const search = args.length > 1 ? (args[1] as string) : undefined
      const mode = args.length > 2 ? (args[2] as string) : undefined
      let rows = [...catalogueReadings.values()].filter((r) => r.user_id === userId)
      if (search !== undefined && search.trim().length > 0) {
        const needle = `%${search.trim()}%`.toLowerCase()
        rows = rows.filter((r) => r.title.toLowerCase().includes(needle.replace(/%/g, '')))
      }
      if (mode !== undefined && mode.trim().length > 0) {
        rows = rows.filter((r) => r.mode === mode.trim())
      }
      return rows
        .sort((a, b) => b.created_at - a.created_at)
        .map((r) => ({ ...r }))
    }
    throw new Error(`fake D1: unsupported all() SQL: ${sql}`)
  }

  const db = {
    prepare(rawSql: string) {
      const sql = rawSql.replace(/\s+/g, ' ').trim()
      return {
        bind(...args: unknown[]) {
          return {
            run: () => Promise.resolve(run(sql, args)),
            first: <T>() => Promise.resolve((first(sql, args) ?? null) as T | null),
            all: <T>() => Promise.resolve({ results: all(sql, args) as T[], success: true, meta: ok(0).meta }),
          }
        },
      }
    },
    async batch(statements: { run: () => Promise<{ meta?: { changes?: number } }> }[]) {
      const out = []
      for (const st of statements) out.push(await st.run())
      return out
    },
  }

  return { db, users, readings, interpretations, catalogueReadings, r2Objects }
}

export type FakeD1 = ReturnType<typeof makeFakeD1>
