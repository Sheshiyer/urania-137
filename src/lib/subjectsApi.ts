/**
 * Subject profiles API client (Threshold W2-B) — the SPA side of the
 * `/api/subjects` routes (functions/api/[[path]].ts, W1-A). Auth is the
 * existing CF Access / dev-identity cookie (`credentials: 'include'`), and
 * errors follow the frozen `ApiError` envelope — same conventions as
 * `chatApi.ts`.
 *
 * The first-run gate uses `listSubjects`: an empty list means the caller has
 * not crossed the Threshold and is routed to `#/threshold`. Profile WRITES
 * from the Threshold itself go through the chat session's advance-on-consume
 * seam (W1-B), not through this client; direct POST/PATCH/DELETE are the
 * Settings-surface manage routes and land with that wave.
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
