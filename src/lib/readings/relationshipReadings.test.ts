import { describe, expect, it, vi } from 'vitest'
import { listRelationshipReadings, type GrantedSynastryReading } from './relationshipReadings'

const granted: GrantedSynastryReading = {
  generationId: 'generation/137',
  relationshipId: 'relationship/one',
  mode: 'synastry',
  responseSha256: 'a'.repeat(64),
  result: { assembled: 'A shared field held by both participants.' },
  visibility: 'participant',
  createdAt: '2026-07-27T00:00:00.000Z',
  grantedAt: '2026-07-27T00:00:01.000Z',
}

describe('granted relationship reading client', () => {
  it('uses the existing participant-scoped GET contract with credentials', async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ readings: [granted] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await expect(listRelationshipReadings('relationship/one', fetcher)).resolves.toEqual([granted])
    expect(fetcher).toHaveBeenCalledWith(
      '/api/relationships/relationship%2Fone/readings',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        headers: expect.objectContaining({ accept: 'application/json' }),
      }),
    )
    const headers = new Headers(fetcher.mock.calls[0][1]?.headers)
    expect(headers.has('x-admin-role')).toBe(false)
    expect(headers.has('x-user-email')).toBe(false)
  })

  it('returns the empty participant grant set without manufacturing access', async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ readings: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    await expect(listRelationshipReadings('foreign', fetcher)).resolves.toEqual([])
  })
})
