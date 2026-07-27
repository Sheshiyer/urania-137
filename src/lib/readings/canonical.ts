import type { ReadingDTO } from '../api/contract'

export interface CanonicalReadingMatch {
  nodeId: string
  mode: string
  title: string
  content: string
  /** Avoid matching an older identical reading while a fresh chat save lands. */
  notBefore?: number
}

/** Resolve the exact D1 Folio row that a completed chat result archived. */
export function findCanonicalReading(
  readings: readonly ReadingDTO[],
  match: CanonicalReadingMatch,
): ReadingDTO | null {
  return (
    readings.find(
      (reading) =>
        reading.nodeId === match.nodeId &&
        reading.mode === match.mode &&
        reading.title === match.title &&
        reading.content === match.content &&
        (match.notBefore === undefined || reading.createdAt >= match.notBefore),
    ) ?? null
  )
}

/** Stable checksum input: canonical row identity plus its complete stored body. */
export function canonicalReadingBytes(reading: ReadingDTO): string {
  return JSON.stringify([
    reading.id,
    reading.nodeId,
    reading.nodeLabel,
    reading.mode,
    reading.title,
    reading.content,
    reading.createdAt,
  ])
}

/** SHA-256 over the canonical Folio row, rendered as lowercase hex. */
export async function canonicalReadingChecksum(reading: ReadingDTO): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalReadingBytes(reading)),
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function shortChecksum(checksum: string | null): string {
  return checksum ? `${checksum.slice(0, 12)}…${checksum.slice(-6)}` : 'calculating…'
}
