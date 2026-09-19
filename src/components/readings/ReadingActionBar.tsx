import { buildConversationPath, navigate } from '../../hooks/useHashRoute'
import { CopyButton } from '../ui/CopyButton'

export function ReadingActionBar({
  readingId,
  checksum,
}: {
  readingId: string
  checksum: string | null
}) {
  return (
    <div className="pointer-events-none sticky bottom-4 z-30 flex justify-center px-3">
      <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-pill border border-gold/20 bg-surface/90 px-4 py-1.5 shadow-capsule backdrop-blur-md sm:gap-4 sm:px-6">
        <a
          href={`#${buildConversationPath({
            readingId,
            returnTo: `/readings/${encodeURIComponent(readingId)}`,
          })}`}
          data-reading-relation="continue-in-conversation"
          className="inline-flex min-h-11 min-w-11 items-center gap-2 font-display text-xs uppercase tracking-[0.18em] text-gold transition-colors hover:text-parchment"
        >
          <span className="h-1.5 w-1.5 rotate-45 border border-gold bg-gold" aria-hidden="true" />
          Continue in conversation
        </a>

        {checksum && (
          <CopyButton
            value={`sha256:${checksum}`}
            label="Copy checksum"
          />
        )}

        <button
          type="button"
          onClick={() => navigate('/readings')}
          className="inline-flex min-h-11 min-w-11 items-center gap-2 font-display text-xs uppercase tracking-[0.18em] text-silver transition-colors hover:text-parchment"
        >
          <span className="h-1.5 w-1.5 rotate-45 border border-gold/40" aria-hidden="true" />
          Browse Folio
        </button>
      </div>
    </div>
  )
}
