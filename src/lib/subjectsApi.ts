/**
 * Subject profiles API client (Threshold W2-B) — the SPA side of the
 * `/api/subjects` routes (functions/api/[[path]].ts, W1-A). Auth is the
 * existing CF Access / dev-identity cookie (`credentials: 'include'`), and
 * errors follow the frozen `ApiError` envelope — same conventions as
 * `chatApi.ts`.
 *
 * The first-run gate uses `listSubjects`: an empty list means the caller has
 * not crossed the Threshold and is routed to `#/threshold`. The Threshold's
 * OWN profile write still goes through the chat session's advance-on-consume
 * seam (W1-B); the direct create/update/delete below are the circle opt-in
 * (W3-A) and Settings-surface manage routes (W4).
 */

import type { SubjectProfile } from '../types/chat'

async function toError(res: Response, fallback: string): Promise<Error> {
  try {
    const body = (await res.json()) as { error?: string; message?: string }
    return new Error(body.message || body.error || fallback)
  } catch {
    return new Error(fallback)
  }
}

/** The caller's stored profiles, oldest first (self was written first). */
export async function listSubjects(): Promise<SubjectProfile[]> {
  const res = await fetch('/api/subjects', {
    credentials: 'include',
    headers: { accept: 'application/json' },
  })
  if (!res.ok) throw await toError(res, `subjects ${res.status}`)
  const body = (await res.json()) as { subjects: SubjectProfile[] }
  return body.subjects
}

/** The caller's Threshold (`self`) profile, or null when they have not crossed. */
export async function getSelfSubject(): Promise<SubjectProfile | null> {
  const subjects = await listSubjects()
  return subjects.find((s) => s.role === 'self') ?? null
}

// ---------------------------------------------------------------------------
// Manage writes (W3-A circle opt-in + W4 Settings surface)
// ---------------------------------------------------------------------------

/** The intake fields of a profile write — exactly `SubjectInput` with a role slug. */
export type SubjectWrite = Omit<SubjectProfile, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Create a profile. `role: 'self'` upserts the caller's single Threshold row
 * server-side; any other role slug inserts a new circle member. Returns the
 * stored profile (201). W3-A: the persist_offer beat posts fresh doorway
 * subjects here only after an explicit affirmative — never silently.
 */
export async function createSubject(input: SubjectWrite): Promise<SubjectProfile> {
  const res = await fetch('/api/subjects', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw await toError(res, `create subject ${res.status}`)
  return (await res.json()) as SubjectProfile
}

/**
 * Field-wise patch (W4 Settings "Your pattern"). Server validates with the
 * state machine's own rules; role/id are immutable. Returns the updated
 * profile; 404 for unknown ids.
 */
export async function updateSubject(id: string, patch: Partial<SubjectWrite>): Promise<SubjectProfile> {
  const res = await fetch(`/api/subjects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw await toError(res, `update subject ${res.status}`)
  return (await res.json()) as SubjectProfile
}

/** Ownership-scoped delete; false for unknown ids. */
export async function deleteSubject(id: string): Promise<boolean> {
  const res = await fetch(`/api/subjects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { accept: 'application/json' },
  })
  if (res.status === 404) return false
  if (!res.ok) throw await toError(res, `delete subject ${res.status}`)
  return true
}
