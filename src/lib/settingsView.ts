import type { Relationship, RelationshipStatus } from './relationshipsApi'
import type { SubjectProfile } from '../types/chat'

export interface RelationshipStatusPresentation {
  label: string
  description: string
  tone: 'quiet' | 'positive' | 'warning' | 'terminal'
}

const STATUS: Record<RelationshipStatus, RelationshipStatusPresentation> = {
  pending: {
    label: 'Pending',
    description: 'Waiting for the invited account to choose its own subject.',
    tone: 'warning',
  },
  active: {
    label: 'Active',
    description: 'Both participants have actively consented.',
    tone: 'positive',
  },
  declined: {
    label: 'Declined',
    description: 'The invitation was declined; no shared reading is authorized.',
    tone: 'terminal',
  },
  revoked: {
    label: 'Revoked',
    description: 'Future shared generation is blocked.',
    tone: 'terminal',
  },
  expired: {
    label: 'Expired',
    description: 'The one-time invitation expired before acceptance.',
    tone: 'quiet',
  },
}

export function relationshipStatusPresentation(
  status: RelationshipStatus,
): RelationshipStatusPresentation {
  return STATUS[status]
}

export function splitSubjects(subjects: readonly SubjectProfile[]): {
  self: SubjectProfile | null
  circle: SubjectProfile[]
} {
  return {
    self: subjects.find((subject) => subject.role === 'self') ?? null,
    circle: subjects.filter((subject) => subject.role !== 'self'),
  }
}

export function relationshipPeerLabel(
  relationship: Relationship,
  currentUserId: string | null,
): string {
  const peer = relationship.participants.find(
    (participant) => participant.userId !== currentUserId,
  )
  if (peer) return peer.role === 'invitee' ? relationship.inviteeEmail : 'Inviting participant'
  return relationship.inviteeEmail
}
