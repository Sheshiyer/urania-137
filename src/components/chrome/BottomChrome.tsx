import { Children, ReactNode } from 'react'
import { VersionBadge } from './VersionBadge'

/**
 * The fixed bottom rail, split the way the architecture moodboard frames a
 * parent page: the stat strip floats at the lower LEFT as open cells on the
 * field, the tab rail + build badge hold the lower RIGHT.
 *
 * A gold hairline with diamond caps rules the rail off from the field — the
 * mirror of TopNav's bottom rule, so the shell reads as ONE continuous frame
 * (top rule · field · bottom rule) instead of two floating islands.
 *
 * Slot contract: the FIRST child is pinned left (the page's StatFooter); every
 * remaining child is grouped right (the PageTabs), followed by the build
 * badge, which opens the Settings card. Edges own their slots, so the strip
 * and the tabs can never overlap when either changes size. On small screens
 * the row collapses to a centered stack (the tabs hide themselves below sm,
 * as before). The graph reserves this whole band via `CHROME`.
 */
export function BottomChrome({ children }: { children: ReactNode }) {
  const [left, ...rest] = Children.toArray(children)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
      {/* Shell rule — mirrors the TopNav hairline; caps echo the frame diamonds. */}
      <div className="mb-3 flex items-center px-6 sm:px-10" aria-hidden="true">
        <span className="h-1 w-1 rotate-45 border border-gold/50" />
        <span className="h-px flex-1 bg-gradient-to-r from-gold/40 via-gold/15 to-gold/15" />
        <span className="mx-2 h-1.5 w-1.5 rotate-45 border border-gold/70" />
        <span className="h-px flex-1 bg-gradient-to-l from-gold/40 via-gold/15 to-gold/15" />
        <span className="h-1 w-1 rotate-45 border border-gold/50" />
      </div>
      <div className="flex flex-col items-center gap-2.5 px-4 pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-12 sm:pb-6">
        <div className="pointer-events-auto">{left}</div>
        <div className="flex items-center gap-4">
          {rest}
          <VersionBadge />
        </div>
      </div>
    </div>
  )
}
