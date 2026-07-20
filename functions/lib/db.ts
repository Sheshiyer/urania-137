/**
 * T-016 — D1 users helpers against the `DB` binding and the `users` table from
 * migration 0001. Phase 1 ships users-only helpers; Phase 3 (T-040..) extends
 * THIS file additively with readings CRUD — keep exports additive.
 *
 * Timestamps are unix ms, set Worker-side (never by the client).
 */
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types'
import type { ReadingDTO } from '../../src/lib/api/contract'
import { sha256Hex } from './cf-access'

/** Row shape of the `users` table (migration 0001). */
export interface UserRow {
  id: string
  email: string
  created_at: number
  last_seen_at: number
}

/**
 * Insert the user with created_at === last_seen_at === now, or — when the id
 * already exists — advance only last_seen_at (created_at and email stay as
 * first recorded). Returns the resulting row.
 */
export async function upsertUser(
  db: D1Database,
  user: { id: string; email: string },
): Promise<UserRow> {
  const now = Date.now()
  await db
    .prepare(
      `INSERT INTO users (id, email, created_at, last_seen_at)
       VALUES (?1, ?2, ?3, ?3)
       ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
    )
    .bind(user.id, user.email, now)
    .run()
  const row = await getUserById(db, user.id)
  if (!row) throw new Error(`upsertUser: users row missing after upsert for id ${user.id}`)
  return row
}

/** Fetch a user row by primary key, or null when absent. */
export async function getUserById(db: D1Database, id: string): Promise<UserRow | null> {
  return db
    .prepare(`SELECT id, email, created_at, last_seen_at FROM users WHERE id = ?1`)
    .bind(id)
    .first<UserRow>()
}

// ---------------------------------------------------------------------------
// T-040 — readings data-access layer (additive; users helpers above unchanged)
//
// Every method takes and binds a user_id: scoping is enforced in SQL, so a
// cross-user id simply matches zero rows (null/false, no mutation) and never
// leaks another user's data. Row⇄DTO mapping follows the frozen contract
// (src/lib/api/contract.ts); `raw` is stored but not part of ReadingDTO.
// ---------------------------------------------------------------------------

/** Row shape of the `readings` table (migration 0001). */
export interface ReadingRow {
  id: string
  user_id: string
  node_id: string
  node_label: string
  mode: string
  title: string
  content: string
  raw: string | null
  favorite: number
  created_at: number
}

/** Insert payload for createReading (the frozen SaveReadingRequest + optional raw). */
export interface NewReading {
  nodeId: string
  nodeLabel: string
  mode: string
  title: string
  content: string
  raw?: string | null
}

export interface ListReadingsOptions {
  /** Substring filter over title + content (case-insensitive). */
  search?: string
  /** When true, only favorite rows. */
  favoritesOnly?: boolean
}

/** Row → frozen ReadingDTO (camelCase, favorite as boolean, raw dropped). */
export function readingRowToDTO(row: ReadingRow): ReadingDTO {
  return {
    id: row.id,
    nodeId: row.node_id,
    nodeLabel: row.node_label,
    mode: row.mode,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    favorite: row.favorite === 1,
  }
}

const READING_COLS = `id, user_id, node_id, node_label, mode, title, content, raw, favorite, created_at`

/**
 * List the caller's readings, newest first. The search/favorites predicates
 * are always bound (?2/?3) and conditionally active, so the query plan and
 * the bind order stay fixed:
 *   ?1 user_id · ?2 favorites flag (0|1) · ?3 search term ('' = off).
 */
export async function listReadings(
  db: D1Database,
  userId: string,
  opts: ListReadingsOptions = {},
): Promise<ReadingDTO[]> {
  const { results } = await db
    .prepare(
      `SELECT ${READING_COLS} FROM readings
       WHERE user_id = ?1
         AND (?2 = 0 OR favorite = 1)
         AND (?3 = '' OR instr(lower(title), lower(?3)) > 0 OR instr(lower(content), lower(?3)) > 0)
       ORDER BY created_at DESC`,
    )
    .bind(userId, opts.favoritesOnly ? 1 : 0, (opts.search ?? '').trim())
    .all<ReadingRow>()
  return (results ?? []).map(readingRowToDTO)
}

/** Fetch one reading by id, scoped to the owner (cross-user → null). */
export async function getReadingById(
  db: D1Database,
  userId: string,
  id: string,
): Promise<ReadingDTO | null> {
  const row = await db
    .prepare(`SELECT ${READING_COLS} FROM readings WHERE id = ?1 AND user_id = ?2`)
    .bind(id, userId)
    .first<ReadingRow>()
  return row ? readingRowToDTO(row) : null
}

/**
 * Insert a new reading with a Worker-generated uuid, server-set created_at,
 * and favorite=false (the client never sets these). Returns the stored DTO.
 */
export async function createReading(
  db: D1Database,
  userId: string,
  input: NewReading,
): Promise<ReadingDTO> {
  const id = crypto.randomUUID()
  const createdAt = Date.now()
  await db
    .prepare(
      `INSERT INTO readings (id, user_id, node_id, node_label, mode, title, content, raw, favorite, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9)`,
    )
    .bind(id, userId, input.nodeId, input.nodeLabel, input.mode, input.title, input.content, input.raw ?? null, createdAt)
    .run()
  const created = await getReadingById(db, userId, id)
  if (!created) throw new Error(`createReading: readings row missing after insert for id ${id}`)
  return created
}

/**
 * Explicitly set the favorite flag (the frozen PATCH contract sends
 * `{ favorite: boolean }`, not a toggle). Returns the updated DTO, or null
 * when the id does not exist FOR THIS USER (unknown id and cross-user id are
 * indistinguishable — no existence leak).
 */
export async function setReadingFavorite(
  db: D1Database,
  userId: string,
  id: string,
  favorite: boolean,
): Promise<ReadingDTO | null> {
  const res = await db
    .prepare(`UPDATE readings SET favorite = ?3 WHERE id = ?1 AND user_id = ?2`)
    .bind(id, userId, favorite ? 1 : 0)
    .run()
  if ((res.meta?.changes ?? 0) === 0) return null
  return getReadingById(db, userId, id)
}

/** Delete a reading owned by the caller. false = no such row for this user. */
export async function deleteReading(db: D1Database, userId: string, id: string): Promise<boolean> {
  const res = await db
    .prepare(`DELETE FROM readings WHERE id = ?1 AND user_id = ?2`)
    .bind(id, userId)
    .run()
  return (res.meta?.changes ?? 0) > 0
}

/**
 * T-044 mechanism — idempotent bulk import of legacy localStorage entries.
 *
 * Dedupe key per entry: the legacy id when present, else a SHA-256 content
 * hash. The D1 row id is derived deterministically as
 * `imp_<sha256(user_id + '\n' + dedupeKey)>`, so:
 *   - re-running the same payload hits ON CONFLICT(id) DO NOTHING → skipped;
 *   - the key is namespaced per user, so two users importing the same legacy
 *     Folio each get their own rows (no cross-user PK collision).
 * The legacy createdAt/favorite are preserved. Returns the frozen
 * ImportResponse shape ({ imported } — rows actually written).
 */
export async function bulkImportReadings(
  db: D1Database,
  userId: string,
  entries: ReadingDTO[],
): Promise<{ imported: number }> {
  if (entries.length === 0) return { imported: 0 }
  const statements: D1PreparedStatement[] = []
  for (const entry of entries) {
    const legacyId = typeof entry.id === 'string' ? entry.id.trim() : ''
    const dedupeKey =
      legacyId.length > 0
        ? `legacy:${legacyId}`
        : `content:${await sha256Hex(
            [entry.nodeId, entry.nodeLabel, entry.mode, entry.title, entry.content, String(entry.createdAt), String(entry.favorite)].join('\n'),
          )}`
    const id = `imp_${await sha256Hex(`${userId}\n${dedupeKey}`)}`
    const createdAt = Number.isFinite(entry.createdAt) ? entry.createdAt : Date.now()
    statements.push(
      db
        .prepare(
          `INSERT INTO readings (id, user_id, node_id, node_label, mode, title, content, raw, favorite, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8, ?9)
           ON CONFLICT(id) DO NOTHING`,
        )
        .bind(id, userId, entry.nodeId, entry.nodeLabel, entry.mode, entry.title, entry.content, entry.favorite ? 1 : 0, createdAt),
    )
  }
  const results = await db.batch(statements)
  const imported = results.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0)
  return { imported }
}
