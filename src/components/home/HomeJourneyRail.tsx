import type { ExperienceState } from '../../lib/experience'

export function HomeJourneyRail({
  experience,
  onBegin,
}: {
  experience: ExperienceState
  onBegin: () => void
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
    <aside
      data-home-journey={operator ? 'operator' : degraded ? 'degraded' : 'returning'}
      className="pointer-events-none absolute right-8 top-5 z-10 hidden max-w-[34rem] text-right xl:block"
      aria-label="Current Urania journey"
    >
      <p className="font-display text-[9px] uppercase tracking-[0.28em] text-gold">
        {label}
      </p>
      <h2 className="mt-1 font-serif text-lg leading-tight text-parchment">
        {operator
          ? 'Personal map, with an evidence lens.'
          : degraded
            ? 'The map remains available.'
            : 'The map remembers where you were.'}
      </h2>
      <p className="sr-only">
        {degraded
          ? 'Profile context is reconnecting. You can still enter any lens or reopen the Folio.'
          : 'Choose a known pattern, continue from the Folio, or begin another reading with the narrator.'}
      </p>

      <ol className="mt-3 flex justify-end border-y border-gold/15 text-left">
        <li>
          <button
            type="button"
            onClick={onBegin}
            className="pointer-events-auto flex min-h-11 items-center border-r border-gold/15 px-4 font-display text-[9px] uppercase tracking-[0.18em] text-silver transition-colors hover:bg-gold/10 hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            Begin reading
          </button>
        </li>
        <li>
          <a
            href="#/readings"
            className="pointer-events-auto flex min-h-11 items-center border-r border-gold/15 px-4 font-display text-[9px] uppercase tracking-[0.18em] text-silver transition-colors hover:bg-gold/10 hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            Open Folio
          </a>
        </li>
        {operator && (
          <li>
            <a
              href="#/node/engine"
              className="pointer-events-auto flex min-h-11 items-center px-4 font-display text-[9px] uppercase tracking-[0.18em] text-silver transition-colors hover:bg-gold/10 hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              Evidence
            </a>
          </li>
        )}
      </ol>
    </aside>
  )
}
