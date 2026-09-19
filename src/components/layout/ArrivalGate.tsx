/**
 * The arrival beat between the Access edge and the first interactive map.
 * It replaces only the map-shaped routes (home, node, chat) while identity
 * and the subject lifecycle resolve; Folio, Settings and the operator pages
 * paint their own skeletons instead. Keeps `data-experience-gate` — the
 * contract hook the visual matrix and home contracts look for.
 */
export function ArrivalGate({ line = 'Recalling your place in the map.' }: { line?: string }) {
  return (
    <main
      id="main-content"
      data-experience-gate
      className="relative grid h-full min-h-[30rem] place-items-center overflow-hidden px-6 text-center"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 reveal-field"
        style={{
          background:
            'radial-gradient(60% 45% at 50% 55%, rgb(197 160 23 / 0.10), transparent 70%)',
        }}
      />
      <div role="status" className="relative border-y hairline px-8 py-6">
        <p className="font-display text-[9px] uppercase tracking-[0.28em] text-gold">
          Opening the field
        </p>
        <p className="mt-3 font-serif text-sub text-parchment">{line}</p>
        <span
          aria-hidden="true"
          className="mx-auto mt-5 block h-1.5 w-1.5 rotate-45 border border-gold/70 motion-safe:animate-pulse-slow"
        />
      </div>
    </main>
  )
}
