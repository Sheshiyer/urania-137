import type { ExperienceState } from '../../lib/experience'
import { navigate } from '../../hooks/useHashRoute'

export function ContinuationDock({
  experience,
}: {
  experience: ExperienceState
}) {
  const operator = experience.operator
  const degraded = experience.status === 'degraded'
  if (!operator && !degraded && experience.lifecycle !== 'returning') return null

  const label = operator
    ? 'Operator lens'
    : degraded
      ? 'Field available'
      : 'Returning reader'

  return (
    <div
      data-home-journey={operator ? 'operator' : degraded ? 'degraded' : 'returning'}
      className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3"
    >
      <nav
        aria-label="Current Urania state"
        className="pointer-events-auto capsule flex flex-wrap items-center gap-1 px-2 py-1 sm:gap-2 sm:px-4"
      >
        <span className="px-2 py-1 font-display text-meta uppercase tracking-[0.16em] text-gold">
          {label}
        </span>

        <span className="text-gold/30" aria-hidden="true">·</span>

        {!degraded && (
          <span className="hidden px-1 font-serif text-small text-secondary sm:inline">
            {operator
              ? 'Personal map, with an evidence lens.'
              : 'The map remains available.'}
          </span>
        )}
        {degraded && (
          <span className="px-1 font-serif text-small text-secondary">
            The map remains available.
          </span>
        )}

        <ol className="flex items-center">
          <li>
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="flex min-h-11 min-w-11 items-center gap-1.5 px-3 font-display text-meta uppercase tracking-[0.14em] text-silver transition-colors hover:text-parchment"
            >
              <span className="h-1.5 w-1.5 rotate-45 border border-gold bg-gold" aria-hidden="true" />
              Begin reading
            </button>
          </li>
          <li>
            <a
              href="#/readings"
              className="flex min-h-11 min-w-11 items-center gap-1.5 px-3 font-display text-meta uppercase tracking-[0.14em] text-silver transition-colors hover:text-parchment"
            >
              <span className="h-1.5 w-1.5 rotate-45 border border-gold/40" aria-hidden="true" />
              Open Folio
            </a>
          </li>
          {operator && (
            <li>
              <a
                href="#/node/engine"
                className="flex min-h-11 min-w-11 items-center gap-1.5 px-3 font-display text-meta uppercase tracking-[0.14em] text-silver transition-colors hover:text-parchment"
              >
                <span className="h-1.5 w-1.5 rotate-45 border border-gold/40" aria-hidden="true" />
                Evidence
              </a>
            </li>
          )}
        </ol>
      </nav>
    </div>
  )
}
