import { RelationshipApiError, type FetchLike } from '../relationshipsApi'

export interface GrantedSynastryReading {
  generationId: string
  relationshipId: string
  mode: 'synastry'
  responseSha256: string
  result: unknown
  visibility: 'participant'
  createdAt: string
  grantedAt: string
}

function isGrantedSynastryReading(value: unknown): value is GrantedSynastryReading {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const reading = value as Record<string, unknown>
  return (
    typeof reading.generationId === 'string'
    && typeof reading.relationshipId === 'string'
    && reading.mode === 'synastry'
    && typeof reading.responseSha256 === 'string'
    && /^[a-f0-9]{64}$/i.test(reading.responseSha256)
    && reading.visibility === 'participant'
    && typeof reading.createdAt === 'string'
    && typeof reading.grantedAt === 'string'
    && Object.prototype.hasOwnProperty.call(reading, 'result')
  )
}

export async function listRelationshipReadings(
  relationshipId: string,
  fetchImpl: FetchLike = fetch,
): Promise<GrantedSynastryReading[]> {
  const response = await fetchImpl(
    `/api/relationships/${encodeURIComponent(relationshipId)}/readings`,
    {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    },
  )
  if (!response.ok) {
    let code = 'RELATIONSHIP_READING_ERROR'
    let message = `Relationship readings request failed (${response.status})`
    try {
      const body = await response.json() as { error?: string; code?: string; message?: string }
      code = body.code || body.error || code
      message = body.message || message
    } catch {
      // Preserve the HTTP fallback for a non-JSON edge response.
    }
    throw new RelationshipApiError(response.status, code, message)
  }
  const body = await response.json() as { readings?: unknown }
  if (!Array.isArray(body.readings) || !body.readings.every(isGrantedSynastryReading)) {
    throw new RelationshipApiError(
      502,
      'RELATIONSHIP_READING_CONTRACT_INVALID',
      'Relationship readings returned an invalid participant-grant envelope.',
    )
  }
  if (body.readings.some((reading) => reading.relationshipId !== relationshipId)) {
    throw new RelationshipApiError(
      502,
      'RELATIONSHIP_READING_CONTRACT_INVALID',
      'Relationship readings did not match the requested relationship.',
    )
  }
  return body.readings
}
