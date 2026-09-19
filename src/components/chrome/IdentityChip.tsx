import type { User } from '../../lib/api/contract'

/**
 * Signed-in identity chip for the capsule masthead. Visible on ALL viewports
 * (the redesign makes logout reachable everywhere). The email truncates on
 * narrow screens; "Leave the field" is always readable.
 */
export function IdentityChip({ me }: { me: User | null }) {
  if (!me) return null
  return (
    <div className="flex items-center gap-2 border-l border-gold/20 pl-2 sm:gap-3 sm:pl-4">
      <span
        className="hidden max-w-32 truncate font-display text-[11px] uppercase tracking-[0.18em] text-silver sm:inline"
        title={me.email}
      >
        {me.email}
      </span>
      <a
        href="/api/logout"
        className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 font-display text-[10px] uppercase tracking-[0.18em] text-silver transition-colors hover:text-gold sm:text-[11px] sm:tracking-[0.22em]"
        aria-label={`Leave the field — ${me.email}`}
      >
        Leave the field
      </a>
    </div>
  )
}
