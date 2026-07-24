import { ReactNode, useState } from 'react'
import { VersionBadge } from './VersionBadge'
import { SettingsPanel } from './SettingsPanel'

/**
 * The fixed bottom rail — the tab strip stacked above the stat strip.
 *
 * Owning the stacking here (rather than each piece pinning itself with its own
 * `bottom-[…]` offset) means the tabs and the stat strip can never overlap when
 * either changes size. The graph reserves this whole band via `CHROME`.
 *
 * The app VersionBadge pins to the rail's right edge (outside the centered
 * console strip, so it never collides with the per-page stats) and opens the
 * Settings card. Both live here so every page that renders the rail gets the
 * app version with no per-page wiring.
 */
export function BottomChrome({ children }: { children: ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2.5 px-3 pb-4 sm:px-6 sm:pb-5">
      {children}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-5">
        <VersionBadge onOpen={() => setSettingsOpen(true)} />
      </div>
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
