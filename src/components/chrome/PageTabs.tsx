/**
 * The single live node view. Additional tabs stay absent until their
 * corresponding product surfaces exist.
 */
export function PageTabs() {
  return (
    <nav className="pointer-events-auto hidden items-center px-2 sm:flex" aria-label="Node view">
      <span
        aria-current="page"
        className="relative font-display text-[10px] uppercase tracking-[0.24em] text-gold"
      >
        Overview
        <span
          className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rotate-45 bg-gold"
          aria-hidden="true"
        />
      </span>
    </nav>
  )
}
