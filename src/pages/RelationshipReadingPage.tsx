import { useEffect, useMemo, useState } from 'react'
import { PageFrame } from '../components/layout/PageFrame'
import { ReadingFolio } from '../components/readings/ReadingFolio'
import { AsyncBoundary, type AsyncViewState } from '../components/ui/AsyncBoundary'
import type { User } from '../lib/api/contract'
import {
  grantedSynastryToReadingDocument,
  type ReadingDocument,
  type ReadingParticipantGrant,
  type ReadingParticipantRef,
} from '../lib/readings'
import { listRelationshipReadings } from '../lib/readings/relationshipReadings'
import { listRelationships, type Relationship } from '../lib/relationshipsApi'

type GrantedDyadDocument = ReadingDocument & {
  access: ReadingParticipantGrant
  subject: ReadingDocument['subject'] & {
    participants: readonly [ReadingParticipantRef, ReadingParticipantRef]
  }
}

function hasParticipantGrant(
  document: ReadingDocument | null,
): document is GrantedDyadDocument {
  return Boolean(
    document
    && document.subject.kind === 'dyad'
    && document.subject.participants?.length === 2
    && document.access?.reason === 'participant-grant'
    && document.access.visibility === 'participant',
  )
}

export function RelationshipReadingView({
  state,
  document,
}: {
  state: AsyncViewState
  document: ReadingDocument | null
}) {
  const safeState: AsyncViewState = state.status === 'ready' && !hasParticipantGrant(document)
    ? {
        status: 'denied',
        message: 'No participant grant authorizes this relationship reading.',
      }
    : state
  const historical = hasParticipantGrant(document) && document.access.state === 'historical'

  return (
    <AsyncBoundary state={safeState}>
      {hasParticipantGrant(document) && (
        <div className="space-y-4">
          <div
            className={`border px-4 py-3 text-xs ${
              historical
                ? 'border-evidence-unresolved/45 bg-evidence-unresolved/10 text-evidence-copy-unresolved'
                : 'border-emerald/35 bg-emerald/10 text-emerald'
            }`}
            role="status"
          >
            {historical
              ? 'historical · granted before revocation'
              : 'Current participant grant'}
          </div>
          <ReadingFolio
            document={document}
            evidenceContext={{
              accessReason: `${document.access.state} participant-grant`,
              checksum: `sha256:${document.access.checksum}`,
            }}
          />
        </div>
      )}
    </AsyncBoundary>
  )
}

function participantRefs(relationship: Relationship, currentUserId: string | null): [
  ReadingParticipantRef,
  ReadingParticipantRef,
] | null {
  const inviter = relationship.participants.find((participant) => participant.role === 'inviter')
  const invitee = relationship.participants.find((participant) => participant.role === 'invitee')
  if (!inviter || !invitee) return null
  return [
    {
      id: inviter.subjectId,
      role: 'inviter',
      label: inviter.userId === currentUserId ? 'You' : 'Inviting participant',
    },
    {
      id: invitee.subjectId,
      role: 'invitee',
      label: invitee.userId === currentUserId ? 'You' : 'Invited participant',
    },
  ]
}

export function RelationshipReadingPage({
  relationshipId,
  generationId,
  me,
}: {
  relationshipId: string
  generationId: string
  me: User | null
}) {
  const [state, setState] = useState<AsyncViewState>({
    status: 'loading',
    message: 'Reading the participant grant…',
  })
  const [document, setDocument] = useState<ReadingDocument | null>(null)

  useEffect(() => {
    let live = true
    setState({ status: 'loading', message: 'Reading the participant grant…' })
    setDocument(null)
    void Promise.all([
      listRelationships(),
      listRelationshipReadings(relationshipId),
    ]).then(([relationships, readings]) => {
      if (!live) return
      const relationship = relationships.find((candidate) => candidate.id === relationshipId)
      const reading = readings.find((candidate) => candidate.generationId === generationId)
      const participants = relationship ? participantRefs(relationship, me?.id ?? null) : null
      if (!relationship || !reading || !participants) {
        setState({
          status: 'denied',
          message: 'This account has no participant grant for the requested reading.',
        })
        return
      }
      setDocument(grantedSynastryToReadingDocument(reading, {
        relationshipStatus: relationship.status,
        owner: {
          id: me?.id ?? null,
          email: me?.email ?? null,
          label: 'Granted participant',
        },
        participants,
      }))
      setState({ status: 'ready' })
    }).catch((error: unknown) => {
      if (!live) return
      setState({
        status: 'error',
        message: error instanceof Error
          ? error.message
          : 'The participant grant could not be read.',
      })
    })
    return () => {
      live = false
    }
  }, [generationId, me?.email, me?.id, relationshipId])

  const pageTitle = useMemo(
    () => document?.title ?? 'Relationship reading',
    [document?.title],
  )

  return (
    <div className="min-h-screen overflow-x-hidden bg-void">
      <PageFrame />
      <main id="main-content" className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-24 pt-24 sm:px-10">
        <header className="mb-7 border-b border-gold/15 pb-6">
          <p className="console-eyebrow">Union Mirror · participant-granted archive</p>
          <h1 className="mt-2 font-display text-2xl font-light uppercase tracking-[0.12em] text-parchment sm:text-4xl">
            {pageTitle}
          </h1>
          <a href="#/settings" className="mt-4 inline-flex min-h-11 items-center text-xs text-gold underline underline-offset-4">
            Return to consent settings
          </a>
        </header>
        <RelationshipReadingView state={state} document={document} />
      </main>
    </div>
  )
}
