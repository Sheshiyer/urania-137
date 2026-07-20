/**
 * T-016 — D1 users helpers against the `DB` binding and the `users` table from
 * migration 0001. Phase 1 ships users-only helpers; Phase 3 (T-040..) extends
 * THIS file additively with readings CRUD — keep exports additive.
 *
 * Timestamps are unix ms, set Worker-side (never by the client).
 */
import type { D1Database } from '@cloudflare/workers-types'

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
