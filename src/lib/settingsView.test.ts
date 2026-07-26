import { describe, expect, it } from 'vitest'
import type { Relationship } from './relationshipsApi'
import {
  relationshipPeerLabel,
  relationshipStatusPresentation,
  splitSubjects,
} from './settingsView'
import type { SubjectProfile } from '../types/chat'

const location = {
  display_name: 'Pune, India',
  latitude: 18.52,
  longitude: 73.86,
  timezone: 'Asia/Kolkata',
  provider: 'manual',
  confidence: 'manual',
}
const self: SubjectProfile = {
  id: 'self',
  role: 'self',
  name: 'Asha',
  birth_date: '1990-01-01',
  birth_time: '12:00',
  birth_time_confidence: 'unknown',
  birth_location_query: 'Pune, India',
  normalized_location: location,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}
const circle = { ...self, id: 'circle', role: 'friend', name: 'Mira' }

describe('settings view helpers', () => {
  it('separates the single self profile from opted-in circle subjects', () => {
    expect(splitSubjects([circle, self])).toEqual({ self, circle: [circle] })
  })

  it('gives every consent state distinct copy and semantic tone', () => {
    const states = ['pending', 'active', 'declined', 'revoked', 'expired'] as const
    expect(new Set(states.map((state) => relationshipStatusPresentation(state).label)).size).toBe(5)
    expect(relationshipStatusPresentation('active').tone).toBe('positive')
    expect(relationshipStatusPresentation('revoked').description).toMatch(/blocked/i)
  })

  it('names the other participant without treating the account owner as subject', () => {
    const relationship: Relationship = {
      id: 'rel',
      status: 'active',
      inviteeEmail: 'mira@example.test',
      expiresAt: '2026-08-01T00:00:00.000Z',
      acceptedAt: '2026-07-26T00:00:00.000Z',
      declinedAt: null,
      revokedAt: null,
      createdAt: '2026-07-25T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
      participants: [
        {
          role: 'inviter',
          userId: 'user-a',
          subjectId: 'subject-a',
          consentStatus: 'active',
          consentedAt: '2026-07-25T00:00:00.000Z',
          revokedAt: null,
        },
        {
          role: 'invitee',
          userId: 'user-b',
          subjectId: 'subject-b',
          consentStatus: 'active',
          consentedAt: '2026-07-26T00:00:00.000Z',
          revokedAt: null,
        },
      ],
    }
    expect(relationshipPeerLabel(relationship, 'user-a')).toBe('mira@example.test')
  })
})
