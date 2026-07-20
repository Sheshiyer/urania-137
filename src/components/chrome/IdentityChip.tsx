import { LogOut } from 'lucide-react'
import type { User } from '../../lib/api/contract'

/**
 * Signed-in identity chip for the app chrome (T-025): renders the email from
 * useMe plus a logout control. Logout goes through GET /api/logout, which 302s
 * to /cdn-cgi/access/logout so CF Access tears down the session cookie.
 *
 * While identity is loading — or absent (401) — the chip renders nothing:
 * CF Access gates the SPA before React mounts, so the chrome stays quiet
 * rather than flashing a signed-out state. Minimal chrome only; the rest of
 * the UI is unchanged (spec §3).
 */
export function IdentityChip({ me }: { me: User | null }) {
  if (!me) return null
  return (
    <div className="flex items-center gap-3 border-l border-gold/20 pl-3 sm:pl-5">
      <span
        className="hidden max-w-40 truncate font-display text-[11px] uppercase tracking-[0.18em] text-silver md:inline"
        title={me.email}
      >
        {me.email}
      </span>
      <a
        href="/api/logout"
        className="flex items-center gap-1.5 font-display text-[11px] uppercase tracking-[0.22em] text-silver transition-colors hover:text-gold"
        aria-label={`Log out ${me.email}`}
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
        Logout
      </a>
    </div>
  )
}
