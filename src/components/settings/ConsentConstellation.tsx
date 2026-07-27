import { CircleOff, Clock3, Link2, ShieldCheck, UsersRound } from 'lucide-react'
import type { Relationship, RelationshipStatus } from '../../lib/relationshipsApi'
import type { GrantedSynastryReading } from '../../lib/readings/relationshipReadings'
import {
  consentActionFor,
  relationshipPeerLabel,
  relationshipStatusPresentation,
} from '../../lib/settingsView'

const STATUS_STYLE: Record<RelationshipStatus, string> = {
  pending: 'border-gold/45 bg-gold/10 text-gold',
  active: 'border-emerald/45 bg-emerald/10 text-emerald',
  declined: 'border-terracotta/45 bg-terracotta/10 text-evidence-copy-unresolved',
  revoked: 'border-evidence-unresolved/45 bg-evidence-unresolved/10 text-evidence-copy-unresolved',
  expired: 'border-silver/30 bg-silver/5 text-silver',
}

function dateLabel(value: string | null): string {
  if (!value) return 'Not recorded'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function StatusMark({ status }: { status: RelationshipStatus }) {
  const presentation = relationshipStatusPresentation(status)
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-xs uppercase tracking-[0.16em] ${STATUS_STYLE[status]}`}
      title={presentation.description}
    >
      {status === 'active'
        ? <ShieldCheck className="h-3 w-3" aria-hidden="true" />
        : status === 'revoked' || status === 'declined'
          ? <CircleOff className="h-3 w-3" aria-hidden="true" />
          : <Clock3 className="h-3 w-3" aria-hidden="true" />}
      {presentation.label}
    </span>
  )
}

export function ConsentConstellation({
  relationships,
  currentUserId,
  readingsByRelationship,
  busyRelationshipId,
  onRevoke,
}: {
  relationships: readonly Relationship[]
  currentUserId: string | null
  readingsByRelationship: Readonly<Record<string, readonly GrantedSynastryReading[]>>
  busyRelationshipId: string | null
  onRevoke: (relationshipId: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="console-card relative min-h-52 overflow-hidden" aria-label="Consent constellation">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 720 210" aria-hidden="true">
          <circle cx="360" cy="105" r="56" fill="none" className="stroke-gold/20" />
          <circle cx="360" cy="105" r="91" fill="none" className="stroke-gold/10" strokeDasharray="3 8" />
          <line x1="190" y1="105" x2="530" y2="105" className="stroke-gold/25" />
        </svg>
        <div className="absolute left-[26%] top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/35 bg-void/95 p-5 text-gold">
          <UsersRound className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-gold/35 bg-void/95 px-4 py-3 text-center">
          <Link2 className="mx-auto h-4 w-4 text-gold" aria-hidden="true" />
          <p className="mt-2 font-mono text-xs text-parchment">{relationships.length} relations</p>
        </div>
        <div className="absolute left-[74%] top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/35 bg-void/95 p-5 text-gold">
          <UsersRound className="h-6 w-6" aria-hidden="true" />
        </div>
      </div>

      <ul className="space-y-3" aria-label="Relationship consent records">
        {relationships.map((relationship) => {
          const presentation = relationshipStatusPresentation(relationship.status)
          const action = consentActionFor(relationship.status)
          const readings = readingsByRelationship[relationship.id] ?? []
          const historical = relationship.status !== 'active'
          return (
            <li key={relationship.id} className="console-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-serif text-sm text-parchment">
                    {relationshipPeerLabel(relationship, currentUserId)}
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-metadata">{relationship.id}</p>
                </div>
                <StatusMark status={relationship.status} />
              </div>
              <p className="mt-3 border-l border-gold/20 pl-3 text-xs leading-relaxed text-secondary">
                {presentation.description}
              </p>

              <dl className="mt-4 grid gap-2 border-y border-gold/10 py-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="font-display text-[9px] uppercase tracking-[0.16em] text-metadata">Expires</dt>
                  <dd className="mt-1 text-parchment">{dateLabel(relationship.expiresAt)}</dd>
                </div>
                <div>
                  <dt className="font-display text-[9px] uppercase tracking-[0.16em] text-metadata">Last change</dt>
                  <dd className="mt-1 text-parchment">{dateLabel(relationship.updatedAt)}</dd>
                </div>
              </dl>

              <ul className="mt-3 grid gap-2 sm:grid-cols-2" aria-label={`${relationship.id} participants`}>
                {relationship.participants.map((participant) => (
                  <li key={`${participant.role}:${participant.userId}`} className="border border-gold/10 bg-void/35 p-3">
                    <p className="font-display text-[9px] uppercase tracking-[0.16em] text-gold">
                      {participant.userId === currentUserId ? 'You' : 'Other participant'} · {participant.role}
                    </p>
                    <p className="mt-1 break-all text-xs text-parchment">{participant.subjectId}</p>
                    <p className="mt-1 text-xs text-secondary">
                      {participant.consentStatus} · {dateLabel(participant.consentedAt ?? participant.revokedAt)}
                    </p>
                  </li>
                ))}
              </ul>

              {readings.length > 0 && (
                <div className="mt-4">
                  <p className="font-display text-[9px] uppercase tracking-[0.18em] text-gold">
                    Granted readings
                  </p>
                  <ul className="mt-2 space-y-2">
                    {readings.map((reading) => (
                      <li key={reading.generationId}>
                        <a
                          href={`#/relationships/${encodeURIComponent(relationship.id)}/readings/${encodeURIComponent(reading.generationId)}`}
                          className="inline-flex min-h-11 items-center gap-2 text-xs text-parchment underline decoration-gold/50 underline-offset-4 hover:text-gold"
                        >
                          {historical ? 'historical · granted before revocation' : 'Current participant grant'}
                          <span className="font-mono text-metadata">{reading.generationId}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                {relationship.status === 'active' ? (
                  <a href="#/node/compat" className="btn-ghost min-h-11">Enter Union Mirror</a>
                ) : <span />}
                {action === 'revoke' ? (
                  <button
                    type="button"
                    data-consent-action="revoke"
                    disabled={busyRelationshipId === relationship.id}
                    onClick={() => onRevoke(relationship.id)}
                    className="btn-ghost min-h-11 hover:border-terracotta/60 hover:text-evidence-copy-unresolved"
                  >
                    {busyRelationshipId === relationship.id ? 'Revoking…' : 'Revoke future generation'}
                  </button>
                ) : (
                  <span data-consent-action="none" className="text-xs text-metadata">
                    No further consent action
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
