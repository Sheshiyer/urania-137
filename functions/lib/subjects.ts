/**
 * Subjects DAL (Threshold W1-A) — D1 access for the `subjects` table from
 * migration 0004: persistent subject profiles. The Threshold writes the
 * caller's `self` row exactly once (upsert); circle members persist only via
 * explicit opt-in. Doorway chat sessions prefill from these rows — injected
 * server-side, never trusted from the client (W1-B).
 *
 * User scoping mirrors the readings DAL (functions/lib/db.ts): every read/
 * write binds `user_id` in SQL, so a cross-user id matches zero rows
 * (null/false, no mutation) and never leaks another user's data.
 *
 * Timestamps are unix ms in the table (users/readings convention), mapped to
 * the ISO 8601 strings of the `SubjectProfile` contract at the row boundary.
 * Validation reuses the state machine's own calendar/time validators — the
 * same rules that govern chat intake govern direct profile writes.
 */
import type { D1Database } from '@cloudflare/workers-types'
import type { NormalizedLocation, SubjectInput, SubjectProfile } from './chat/types'
import { isValidISODate, isValidTime } from './chat/stateMachine'

/** Row shape of the `subjects` table (migration 0004). */
export interface SubjectRow {
  id: string
  user_id: string
  role: string
  name: string
  birth_date: string
  birth_time: string
  birth_time_confidence: string
  birth_location_query: string
  normalized_location: string // JSON
  created_at: number
  updated_at: number
}

const TIME_CONFIDENCES = ['exact', 'approximate', 'unknown'] as const
/** Role tokens: lowercase slug — 'self' | 'partner' | 'family' | … */
const ROLE_RE = /^[a-z][a-z0-9-]{0,31}$/

// ---------------------------------------------------------------------------
// Row ⇄ contract mapping
// ---------------------------------------------------------------------------

export function subjectRowToProfile(row: SubjectRow): SubjectProfile {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    birth_date: row.birth_date,
    birth_time: row.birth_time,
    birth_time_confidence: row.birth_time_confidence as SubjectProfile['birth_time_confidence'],
    birth_location_query: row.birth_location_query,
    normalized_location: JSON.parse(row.normalized_location) as NormalizedLocation,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

/** Map a stored profile into an intake slot (self → role `primary`). */
export function profileToIntakeSubject(p: SubjectProfile): SubjectInput {
  return {
    role: 'primary',
    name: p.name,
    birth_date: p.birth_date,
    birth_time: p.birth_time,
    birth_time_confidence: p.birth_time_confidence,
    birth_location_query: p.birth_location_query,
    normalized_location: p.normalized_location,
  }
}

// ---------------------------------------------------------------------------
// Validation — the machine's rules, applied to direct writes
// ---------------------------------------------------------------------------

/** The repo's existing convention for a manually entered (ungeocoded) place. */
function manualLocation(query: string): NormalizedLocation {
  return { display_name: query, latitude: 0, longitude: 0, timezone: 'Asia/Kolkata', provider: 'manual', confidence: 'manual' }
}

function isNormalizedLocation(x: unknown): x is NormalizedLocation {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.display_name === 'string' &&
    typeof o.latitude === 'number' &&
    typeof o.longitude === 'number' &&
    typeof o.timezone === 'string' &&
    typeof o.provider === 'string' &&
    typeof o.confidence === 'string'
  )
}

export type SubjectValidation =
  | { ok: true; value: SubjectInput & { role: string } }
  | { ok: false; error: string }

/**
 * Structurally validate a client-supplied profile body. `normalized_location`
 * may be omitted — the manual-entry convention fills it (the client geocodes;
 * the server trusts only structure, consistent with chat intake).
 */
export function validateSubjectBody(x: unknown): SubjectValidation {
  if (!x || typeof x !== 'object') return { ok: false, error: 'expected a JSON object body' }
  const o = x as Record<string, unknown>

  const role = typeof o.role === 'string' ? o.role.trim() : ''
  if (!ROLE_RE.test(role)) return { ok: false, error: "role must be a lowercase slug like 'self', 'partner', 'family'" }

  const name = typeof o.name === 'string' ? o.name.trim() : ''
  if (!name) return { ok: false, error: 'name is required' }

  const birthDate = typeof o.birth_date === 'string' ? o.birth_date.trim() : ''
  if (!isValidISODate(birthDate)) return { ok: false, error: 'birth_date must be a real date in YYYY-MM-DD form' }

  const birthTime = typeof o.birth_time === 'string' ? o.birth_time.trim() : ''
  if (!isValidTime(birthTime)) return { ok: false, error: 'birth_time must be HH:MM (24-hour)' }

  const confidence = typeof o.birth_time_confidence === 'string' ? o.birth_time_confidence.trim() : ''
  if (!(TIME_CONFIDENCES as readonly string[]).includes(confidence)) {
    return { ok: false, error: `birth_time_confidence must be one of: ${TIME_CONFIDENCES.join(' | ')}` }
  }

  const query = typeof o.birth_location_query === 'string' ? o.birth_location_query.trim() : ''
  if (!query) return { ok: false, error: 'birth_location_query is required' }

  let normalized: NormalizedLocation
  if (o.normalized_location === undefined || o.normalized_location === null) {
    normalized = manualLocation(query)
  } else if (isNormalizedLocation(o.normalized_location)) {
    normalized = o.normalized_location
  } else {
    return { ok: false, error: 'normalized_location must carry display_name, latitude, longitude, timezone, provider, confidence' }
  }

  return {
    ok: true,
    value: {
      role,
      name,
      birth_date: birthDate,
      birth_time: birthTime,
      birth_time_confidence: confidence as SubjectInput['birth_time_confidence'],
      birth_location_query: query,
      normalized_location: normalized,
    },
  }
}

// ---------------------------------------------------------------------------
// CRUD — every statement binds user_id
// ---------------------------------------------------------------------------

/** List the caller's profiles, oldest first (self was written first). */
export async function listSubjects(db: D1Database, userId: string): Promise<SubjectProfile[]> {
  const { results } = await db
    .prepare(`SELECT * FROM subjects WHERE user_id = ?1 ORDER BY created_at ASC, rowid ASC`)
    .bind(userId)
    .all<SubjectRow>()
  return (results ?? []).map(subjectRowToProfile)
}

/** The caller's Threshold profile, or null when they have not crossed yet. */
export async function getSelfSubject(db: D1Database, userId: string): Promise<SubjectProfile | null> {
  const row = await db
    .prepare(`SELECT * FROM subjects WHERE user_id = ?1 AND role = 'self'`)
    .bind(userId)
    .first<SubjectRow>()
  return row ? subjectRowToProfile(row) : null
}

/**
 * Create a profile. Server assigns id/timestamps. `role='self'` UPSERTS on
 * the unique partial index (migration 0004) — the Threshold is crossed once,
 * re-crossing updates the same row; every other role inserts a new row.
 */
export async function createSubject(
  db: D1Database,
  userId: string,
  input: SubjectInput & { role: string },
): Promise<SubjectProfile> {
  const now = Date.now()
  const id = crypto.randomUUID()
  const loc = JSON.stringify(input.normalized_location)
  if (input.role === 'self') {
    await db
      .prepare(
        `INSERT INTO subjects (id, user_id, role, name, birth_date, birth_time, birth_time_confidence, birth_location_query, normalized_location, created_at, updated_at)
         VALUES (?1, ?2, 'self', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
         ON CONFLICT(user_id) WHERE role = 'self'
         DO UPDATE SET name = excluded.name, birth_date = excluded.birth_date,
           birth_time = excluded.birth_time, birth_time_confidence = excluded.birth_time_confidence,
           birth_location_query = excluded.birth_location_query,
           normalized_location = excluded.normalized_location, updated_at = excluded.updated_at`,
      )
      .bind(id, userId, input.name, input.birth_date, input.birth_time, input.birth_time_confidence, input.birth_location_query, loc, now)
      .run()
    const self = await getSelfSubject(db, userId)
    if (!self) throw new Error('createSubject: self row missing after upsert')
    return self
  }
  await db
    .prepare(
      `INSERT INTO subjects (id, user_id, role, name, birth_date, birth_time, birth_time_confidence, birth_location_query, normalized_location, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)`,
    )
    .bind(id, userId, input.role, input.name, input.birth_date, input.birth_time, input.birth_time_confidence, input.birth_location_query, loc, now)
    .run()
  const row = await db.prepare(`SELECT * FROM subjects WHERE id = ?1 AND user_id = ?2`).bind(id, userId).first<SubjectRow>()
  if (!row) throw new Error('createSubject: row missing after insert')
  return subjectRowToProfile(row)
}

/** Mutable profile fields (role and id are immutable; re-cross instead). */
const PATCHABLE = ['name', 'birth_date', 'birth_time', 'birth_time_confidence', 'birth_location_query', 'normalized_location'] as const

/**
 * Ownership-scoped patch. Unknown and cross-user ids are indistinguishable
 * (null either way). The patch is validated field-by-field with the same
 * rules as a full body; normalized_location is re-derived from a bare
 * birth_location_query change unless explicitly supplied.
 */
export async function updateSubject(
  db: D1Database,
  userId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<SubjectProfile | null> {
  const sets: string[] = []
  const args: unknown[] = []
  for (const key of PATCHABLE) {
    if (!(key in patch)) continue
    const v = patch[key]
    if (key === 'normalized_location') {
      if (!isNormalizedLocation(v)) return null
      sets.push('normalized_location = ?')
      args.push(JSON.stringify(v))
      continue
    }
    if (typeof v !== 'string' || !v.trim()) return null
    const value = v.trim()
    if (key === 'birth_date' && !isValidISODate(value)) return null
    if (key === 'birth_time' && !isValidTime(value)) return null
    if (key === 'birth_time_confidence' && !(TIME_CONFIDENCES as readonly string[]).includes(value)) return null
    sets.push(`${key} = ?`)
    args.push(value)
  }
  if (sets.length === 0) return null
  // A bare place change re-derives the manual convention unless the caller
  // supplied an explicit normalized_location in the same patch.
  if ('birth_location_query' in patch && !('normalized_location' in patch)) {
    sets.push('normalized_location = ?')
    args.push(JSON.stringify(manualLocation(String(patch.birth_location_query).trim())))
  }
  sets.push('updated_at = ?')
  args.push(Date.now())

  const res = await db
    .prepare(`UPDATE subjects SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`)
    .bind(...args, id, userId)
    .run()
  if ((res.meta?.changes ?? 0) === 0) return null
  const row = await db.prepare(`SELECT * FROM subjects WHERE id = ?1 AND user_id = ?2`).bind(id, userId).first<SubjectRow>()
  return row ? subjectRowToProfile(row) : null
}

/** Ownership-scoped delete; false for unknown/cross-user ids. */
export async function deleteSubject(db: D1Database, userId: string, id: string): Promise<boolean> {
  const res = await db.prepare(`DELETE FROM subjects WHERE id = ?1 AND user_id = ?2`).bind(id, userId).run()
  return (res.meta?.changes ?? 0) > 0
}
