/**
 * The one implemented node-page destination. Graph/list are equivalent lenses
 * inside the constellation itself, so reference-only tabs stay absent.
 */
export function PageTabs({ nodeId }: { nodeId: string }) {
  return (
    <nav className="pointer-events-auto hidden items-center px-2 sm:flex" aria-label="Node view">
      <a
        href={`#/node/${encodeURIComponent(nodeId)}`}
        aria-current="page"
        className="relative min-h-11 px-2 py-3 font-display text-[10px] uppercase tracking-[0.24em] text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interaction-focus"
      >
        Constellation
        <span
          className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rotate-45 bg-gold"
          aria-hidden="true"
        />
      </a>
    </nav>
  )
}
