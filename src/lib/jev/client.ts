/**
 * Thin fetch wrapper over the Jev server endpoints (Phase D).
 *
 * All calls go through the same-origin Pages Functions proxy, so the
 * TYPESAFE_API_KEY never reaches the browser. This module is lazy-loaded
 * via the barrel `./index.ts` to keep it out of the entry chunk.
 */

export interface EngineValidation {
  engineId: string
  completeness: number
  quality: { score: number; confidence: number }
  primaryKind: { choice: string; confidence: number }
  fieldFlags: Record<string, number>
}

interface ExtractedElement {
  id: string
  title: string
  sourceSystem: string
  sourcePath: string
  kind: string
  [key: string]: unknown
}

export interface JevExtraction {
  engineId: string
  classifiedKind: string
  kindConfidence: number
  elements: ExtractedElement[]
  fieldCount: number
  extractedCount: number
}

export class JevApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'JevApiError'
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ error: 'UNKNOWN' })) as Record<string, unknown>
    throw new JevApiError(
      res.status,
      (detail.error as string) ?? 'UNKNOWN',
      (detail.message as string) ?? `Jev endpoint returned ${res.status}`,
    )
  }
  return res.json() as Promise<T>
}

export function validateEngineOutput(
  engineId: string,
  payload: unknown,
): Promise<EngineValidation> {
  return post('/api/selemene/validate', { engineId, payload })
}

export function extractUnknownEngine(
  engineId: string,
  payload: unknown,
): Promise<JevExtraction> {
  return post('/api/selemene/extract', { engineId, payload })
}
