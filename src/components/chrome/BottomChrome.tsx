import { ReactNode } from 'react'

/**
 * The fixed bottom rail — the tab strip stacked above the stat strip.
 *
 * Owning the stacking here (rather than each piece pinning itself with its own
 * `bottom-[…]` offset) means the tabs and the stat strip can never overlap when
 * either changes size. The graph reserves this whole band via `CHROME`.
 */
export function BottomChrome({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2.5 px-3 pb-4 sm:px-6 sm:pb-5">
      {children}
    </div>
  )
}
