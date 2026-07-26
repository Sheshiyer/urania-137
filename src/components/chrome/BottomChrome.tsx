import { Children, ReactNode, useState } from 'react'
import { VersionBadge } from './VersionBadge'
import { SettingsPanel } from './SettingsPanel'

/**
 * The fixed bottom rail, split the way the architecture moodboard frames a
 * parent page: the stat strip floats at the lower LEFT as open cells on the
 * field, the tab rail + build badge hold the lower RIGHT.
 *
 * Slot contract: the FIRST child is pinned left (the page's StatFooter); every
 * remaining child is grouped right (the PageTabs), followed by the build
 * badge, which opens the Settings card. Edges own their slots, so the strip
 * and the tabs can never overlap when either changes size. On small screens
 * the row collapses to a centered stack (the tabs hide themselves below sm,
 * as before). The graph reserves this whole band via `CHROME`.
 */
export function BottomChrome({ children }: { children: ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [left, ...rest] = Children.toArray(children)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
      <div className="flex flex-col items-center gap-2.5 px-4 pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-12 sm:pb-6">
        <div className="pointer-events-auto">{left}</div>
        <div className="flex items-center gap-4">
          {rest}
          <VersionBadge onOpen={() => setSettingsOpen(true)} />
        </div>
      </div>
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
