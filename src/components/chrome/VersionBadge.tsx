import { Settings } from 'lucide-react'
import { appBuildInfo, formatVersionBadge } from '../../lib/appVersion'
import { navigate } from '../../hooks/useHashRoute'

/**
 * The APP build badge — `v0.2.0 · abc1234` — pinned at the right edge of the
 * bottom rail by BottomChrome. Subtle console dressing in the same register as
 * StatFooter; clicking it navigates to the canonical Settings page. This is
 * the SPA's own version — the Selemene ENGINE version
 * lives in EngineStatusPanel and is a different thing.
 */
export function VersionBadge() {
  const label = formatVersionBadge(appBuildInfo())
  return (
    <button
      onClick={() => navigate('/settings')}
      className="pointer-events-auto flex min-h-11 min-w-11 items-center gap-1.5 rounded-full border border-gold/15 bg-void/85 px-3 py-1 font-display text-xs uppercase tracking-[0.18em] text-metadata transition-colors duration-300 hover:border-gold/40 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      aria-label={`Open settings — app ${label}`}
      title={`Urania 137 ${label}`}
    >
      <Settings className="h-3 w-3" aria-hidden="true" />
      {label}
    </button>
  )
}
