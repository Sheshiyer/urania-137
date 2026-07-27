import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Relationship } from '../../lib/relationshipsApi'
import type { GrantedSynastryReading } from '../../lib/readings/relationshipReadings'
import { ConsentConstellation } from './ConsentConstellation'

function relationship(status: Relationship['status']): Relationship {
  return {
    id: `relationship-${status}`,
    status,
    inviteeEmail: 'invited@example.test',
    expiresAt: '2026-08-01T00:00:00.000Z',
    acceptedAt: status === 'active' || status === 'revoked' ? '2026-07-27T00:00:00.000Z' : null,
    declinedAt: status === 'declined' ? '2026-07-27T00:00:00.000Z' : null,
    revokedAt: status === 'revoked' ? '2026-07-28T00:00:00.000Z' : null,
    createdAt: '2026-07-26T00:00:00.000Z',
    updatedAt: '2026-07-27T00:00:00.000Z',
    participants: [
      {
        role: 'inviter',
        userId: 'user-a',
        subjectId: 'subject-a',
        consentStatus: status === 'revoked' ? 'revoked' : 'active',
        consentedAt: '2026-07-26T00:00:00.000Z',
        revokedAt: status === 'revoked' ? '2026-07-28T00:00:00.000Z' : null,
      },
      {
        role: 'invitee',
        userId: 'user-b',
        subjectId: 'subject-b',
        consentStatus: status === 'pending' ? 'pending' : status === 'declined' ? 'declined' : 'active',
        consentedAt: status === 'pending' ? null : '2026-07-27T00:00:00.000Z',
        revokedAt: null,
      },
    ],
  }
}

describe('ConsentConstellation', () => {
  it('writes every status, participant ownership, expiry, and finite action', () => {
    const relationships = (['pending', 'active', 'declined', 'revoked', 'expired'] as const)
      .map(relationship)
    const html = renderToStaticMarkup(createElement(ConsentConstellation, {
      relationships,
      currentUserId: 'user-a',
      readingsByRelationship: {},
      busyRelationshipId: null,
      onRevoke: () => undefined,
    }))

    for (const status of ['Pending', 'Active', 'Declined', 'Revoked', 'Expired']) {
      expect(html).toContain(status)
    }
    expect(html).toContain('You · inviter')
    expect(html).toContain('Other participant · invitee')
    expect(html).toContain('Expires')
    expect(html.match(/data-consent-action=/g)).toHaveLength(5)
  })

  it('links only persisted participant-grant generation ids, including historical grants', () => {
    const granted: GrantedSynastryReading = {
      generationId: 'generation/137',
      relationshipId: 'relationship-revoked',
      mode: 'synastry',
      responseSha256: 'b'.repeat(64),
      result: {},
      visibility: 'participant',
      createdAt: '2026-07-27T00:00:00.000Z',
      grantedAt: '2026-07-27T00:00:01.000Z',
    }
    const html = renderToStaticMarkup(createElement(ConsentConstellation, {
      relationships: [relationship('revoked')],
      currentUserId: 'user-a',
      readingsByRelationship: { 'relationship-revoked': [granted] },
      busyRelationshipId: null,
      onRevoke: () => undefined,
    }))
    expect(html).toContain('#/relationships/relationship-revoked/readings/generation%2F137')
    expect(html).toContain('historical · granted before revocation')
    expect(html).not.toContain('Generate as administrator')
  })
})
