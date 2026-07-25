import { LogOut } from 'lucide-react'
import { Modal } from '../Modal'
import { useMe } from '../../hooks/useMe'
import { appBuildInfo, formatBuildTime } from '../../lib/appVersion'
import { PatternSection } from './PatternSection'

/**
 * The minimal Settings card (release workflow): the APP build identity
 * (version / build time / short SHA), the caller's Threshold profile
 * ("Your pattern", W4), the signed-in identity via the existing useMe
 * loader, and logout as a full navigation to /api/logout (T-076
 * established: CF Access tears the session down server-side, so no client
 * token handling). Deliberately small — a card, not a settings empire.
 *
 * The body only mounts while the modal is open, so the /api/me and
 * /api/subjects fetches fire on demand rather than on app boot.
 */
export function SettingsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} title="Settings" onClose={onClose}>
      {isOpen ? <SettingsBody onClose={onClose} /> : null}
    </Modal>
  )
}

/** Shared display row — also used by PatternSection's read mode. */
export function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <span className="font-display text-[9px] uppercase tracking-[0.22em] text-silver/70">{label}</span>
      <span className={`truncate text-sm text-parchment ${mono ? 'font-mono text-xs' : 'font-serif'}`}>{value}</span>
    </div>
  )
}

function SettingsBody({ onClose }: { onClose: () => void }) {
  const info = appBuildInfo()
  const { me, loading, error } = useMe()

  return (
    <div className="space-y-4">
      {/* App build */}
      <div className="divide-y divide-gold/10 rounded-lg border border-gold/15 bg-void/50">
        <Row label="App version" value={`v${info.version}`} mono />
        <Row label="Built" value={formatBuildTime(info.buildTime)} mono />
        <Row label="Commit" value={info.sha} mono />
      </div>

      {/* The caller's Threshold profile (W4) */}
      <PatternSection onClose={onClose} />

      {/* Identity + logout */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-gold/15 bg-void/50 px-4 py-3">
        <div className="min-w-0">
          <div className="font-display text-[9px] uppercase tracking-[0.22em] text-silver/70">Signed in</div>
          <div className="truncate text-sm text-parchment" title={me?.email}>
            {loading ? 'Loading identity…' : error ? error : (me?.email ?? '—')}
          </div>
        </div>
        <a
          href="/api/logout"
          className="flex shrink-0 items-center gap-1.5 font-display text-[11px] uppercase tracking-[0.22em] text-silver transition-colors hover:text-gold"
          aria-label={me ? `Log out ${me.email}` : 'Log out'}
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Logout
        </a>
      </div>

      <p className="text-[11px] text-silver/60">
        App build — the Selemene engine reports its own version in Engine Status.
      </p>
    </div>
  )
}
