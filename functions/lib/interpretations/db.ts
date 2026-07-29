/**
 * Task 5 — repository layer for `reading_interpretations` (migration 0008).
 *
 * Every method binds owner_user_id; a cross-owner id matches zero rows, so a
 * cross-owner lookup and a lookup by nonexistent reading id return the same
 * null — no existence leak. Saving an interpretation is always an INSERT: it
 * never updates the `readings` row it references.
 */
import type { D1Database } from '@cloudflare/workers-types'

/** Row shape of the `reading_interpretations` table (migration 0008). */
export interface ReadingInterpretationRow {
  id: string
  reading_id: string
  owner_user_id: string
  idempotency_key: string
  route: string
  interpretation_depth: number
  consciousness_level: number
  question: string
  answer: string
  context_packet_hash: string
  fact_lock_hash: string
  source_refs_json: string
  provenance_json: string | null
  created_at: number
}

export interface NewReadingInterpretation {
  readingId: string
  idempotencyKey: string
  route: string
  interpretationDepth: number
  consciousnessLevel: number
  question: string
  answer: string
  contextPacketHash: string
  factLockHash: string
  sourceRefs: string[]
  provenance?: unknown
}

const COLS =
  `id, reading_id, owner_user_id, idempotency_key, route, interpretation_depth, ` +
  `consciousness_level, question, answer, context_packet_hash, fact_lock_hash, ` +
  `source_refs_json, provenance_json, created_at`

/**
 * Idempotent immutable save: the same (ownerUserId, idempotencyKey) pair
 * always resolves to the same row. A retried save with an identical key
 * hits ON CONFLICT DO NOTHING and the existing row is returned — never a
 * duplicate insert, and the source `readings` row is never touched.
 */
export async function saveReadingInterpretation(
  db: D1Database,
  ownerUserId: string,
  input: NewReadingInterpretation,
): Promise<ReadingInterpretationRow> {
  const id = crypto.randomUUID()
  const createdAt = Date.now()
  await db
    .prepare(
      `INSERT INTO reading_interpretations (
         id, reading_id, owner_user_id, idempotency_key, route,
         interpretation_depth, consciousness_level, question, answer,
         context_packet_hash, fact_lock_hash, source_refs_json, provenance_json, created_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
       ON CONFLICT(owner_user_id, idempotency_key) DO NOTHING`,
    )
    .bind(
      id,
      input.readingId,
      ownerUserId,
      input.idempotencyKey,
      input.route,
      input.interpretationDepth,
      input.consciousnessLevel,
      input.question,
      input.answer,
      input.contextPacketHash,
      input.factLockHash,
      JSON.stringify(input.sourceRefs),
      input.provenance === undefined ? null : JSON.stringify(input.provenance),
      createdAt,
    )
    .run()

  const existing = await getReadingInterpretationByIdempotencyKey(db, ownerUserId, input.idempotencyKey)
  if (!existing) {
    throw new Error(
      `saveReadingInterpretation: row missing after insert for owner ${ownerUserId} key ${input.idempotencyKey}`,
    )
  }
  return existing
}

/** Fetch by owner + idempotency key (the natural idempotent-save lookup). */
export async function getReadingInterpretationByIdempotencyKey(
  db: D1Database,
  ownerUserId: string,
  idempotencyKey: string,
): Promise<ReadingInterpretationRow | null> {
  return db
    .prepare(
      `SELECT ${COLS} FROM reading_interpretations WHERE owner_user_id = ?1 AND idempotency_key = ?2`,
    )
    .bind(ownerUserId, idempotencyKey)
    .first<ReadingInterpretationRow>()
}

/**
 * List interpretations linked to a canonical reading id, scoped to the
 * caller. A nonexistent reading id and another owner's reading id both
 * simply match zero rows — indistinguishable, no existence leak.
 */
export async function listReadingInterpretationsByReadingId(
  db: D1Database,
  ownerUserId: string,
  readingId: string,
): Promise<ReadingInterpretationRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${COLS} FROM reading_interpretations
       WHERE reading_id = ?1 AND owner_user_id = ?2
       ORDER BY created_at DESC`,
    )
    .bind(readingId, ownerUserId)
    .all<ReadingInterpretationRow>()
  return results ?? []
}

/**
 * Fetch a single interpretation by its own id, scoped to the caller.
 * Cross-owner id and nonexistent id both return null.
 */
export async function getReadingInterpretationById(
  db: D1Database,
  ownerUserId: string,
  id: string,
): Promise<ReadingInterpretationRow | null> {
  return db
    .prepare(`SELECT ${COLS} FROM reading_interpretations WHERE id = ?1 AND owner_user_id = ?2`)
    .bind(id, ownerUserId)
    .first<ReadingInterpretationRow>()
}
