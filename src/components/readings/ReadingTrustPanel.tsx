import { Eye, Fingerprint, Hash, ScrollText, Sparkles, UserRound, UsersRound } from 'lucide-react'
import type { User } from '../../lib/api/contract'
import type { ReadingDTO } from '../../lib/api/contract'
import { CanonicalReadingReference } from './CanonicalReadingReference'

const facts = [
  { key: 'owner', label: 'Owner', icon: UserRound },
  { key: 'subject', label: 'Subject', icon: UsersRound },
  { key: 'source', label: 'Source', icon: ScrollText },
  { key: 'producer', label: 'Producer', icon: Sparkles },
  { key: 'access', label: 'Why you can see this', icon: Eye },
  { key: 'checksum', label: 'Checksum', icon: Hash },
] as const

/**
 * Trust vocabulary stays explicit even when the frozen Folio v1 contract does
 * not yet carry a field. Missing subject provenance is named, never inferred.
 */
export function ReadingTrustPanel({
  entry,
  owner,
  subjectLabel,
  accessReason,
  checksum,
}: {
  entry: ReadingDTO
  owner: User | null
  subjectLabel?: string | null
  accessReason?: string | null
  checksum?: string | null
}) {
  const values: Record<(typeof facts)[number]['key'], string> = {
    owner: owner?.email ?? 'Authenticated Folio owner',
    subject: subjectLabel?.trim() || 'Not recorded in the current Folio contract',
    source: `Urania D1 · Folio record ${entry.id}`,
    producer: `Selemene · ${entry.mode}`,
    access: accessReason ?? (
      owner?.email
        ? `Signed in as the owner (${owner.email})`
        : 'Owner-scoped authenticated Folio access'
    ),
    checksum: checksum ? `sha256:${checksum}` : 'Calculating canonical checksum…',
  }

  return (
    <aside className="instrument-frame min-w-0 space-y-4 p-1" aria-labelledby={`trust-title-${entry.id}`}>
      <div className="instrument-panel">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-gold" aria-hidden="true" />
          <h2 id={`trust-title-${entry.id}`} className="font-serif text-sm uppercase tracking-[0.16em] text-parchment">
            Record clarity
          </h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-silver/70">
          These relations are separate on purpose. Owning a reading does not make you its subject, source, or producer.
        </p>
        <dl className="mt-4 divide-y divide-gold/10 border-y border-gold/10">
          {facts.map(({ key, label, icon: Icon }) => (
            <div key={key} className="grid gap-1 py-3 sm:grid-cols-[9.5rem_1fr] sm:gap-4">
              <dt className="flex items-center gap-2 font-display text-[9px] uppercase tracking-[0.18em] text-gold/65">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </dt>
              <dd className="min-w-0 break-words text-xs leading-relaxed text-parchment/85">{values[key]}</dd>
            </div>
          ))}
        </dl>
      </div>
      <CanonicalReadingReference entry={entry} />
    </aside>
  )
}
