import { describe, expect, it, vi } from 'vitest'
import {
  acceptRelationshipInvitation,
  createRelationshipInvitation,
  declineRelationshipInvitation,
  generateRelationshipReading,
  listRelationships,
  RelationshipApiError,
  revokeRelationship,
  type Relationship,
} from './relationshipsApi'

const relationship: Relationship = {
  id: 'rel/one',
  status: 'active',
  inviteeEmail: 'b@example.test',
  expiresAt: '2026-08-01T00:00:00.000Z',
  acceptedAt: '2026-07-26T00:00:00.000Z',
  declinedAt: null,
  revokedAt: null,
  createdAt: '2026-07-25T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
  participants: [],
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('relationships API client', () => {
  it('lists the relationship envelope with same-origin credentials', async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) =>
      json({ relationships: [relationship] }),
    )
    await expect(listRelationships(fetcher)).resolves.toEqual([relationship])
    expect(fetcher).toHaveBeenCalledWith(
      '/api/relationships',
      expect.objectContaining({ credentials: 'include' }),
    )
    const headers = new Headers(fetcher.mock.calls[0][1]?.headers)
    expect(headers.has('x-admin-role')).toBe(false)
    expect(headers.has('x-user-email')).toBe(false)
  })

  it('uses the approved create, accept, decline, revoke, and optional generation routes', async () => {
    const fetcher = vi.fn(async (path: string, _init?: RequestInit) =>
      path.endsWith('/generate')
        ? json({ generationId: 'generation-1', relationshipId: relationship.id, result: {}, grants: [] }, 201)
        : path === '/api/relationships'
          ? json({ relationship, inviteToken: 'opaque-token' }, 201)
          : json({ relationship }),
    )

    await createRelationshipInvitation(
      { subjectId: 'subject-a', inviteeEmail: 'b@example.test' },
      fetcher,
    )
    await acceptRelationshipInvitation('opaque-token', 'subject-b', fetcher)
    await declineRelationshipInvitation('opaque-token', fetcher)
    await revokeRelationship(relationship.id, fetcher)
    await generateRelationshipReading(
      relationship.id,
      {
        relationship_context: {
          type: 'partners',
          mapping_goal: 'Understand the shared field',
          sensitivity_level: 'private',
        },
      },
      fetcher,
    )

    expect(fetcher.mock.calls.map(([path]) => path)).toEqual([
      '/api/relationships',
      '/api/relationships/accept',
      '/api/relationships/decline',
      '/api/relationships/rel%2Fone/revoke',
      '/api/relationships/rel%2Fone/generate',
    ])
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({
      inviteToken: 'opaque-token',
      subjectId: 'subject-b',
    })
  })

  it('preserves typed backend error code, status, and message', async () => {
    const fetcher = vi.fn(async () =>
      json(
        {
          error: 'INVITATION_EMAIL_MISMATCH',
          message: 'Invitation is intended for another account.',
        },
        403,
      ),
    )
    const request = acceptRelationshipInvitation('opaque-token', 'subject-b', fetcher)
    await expect(request).rejects.toEqual(
      new RelationshipApiError(
        403,
        'INVITATION_EMAIL_MISMATCH',
        'Invitation is intended for another account.',
      ),
    )
  })
})
