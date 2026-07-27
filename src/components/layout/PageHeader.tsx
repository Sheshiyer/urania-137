interface PageHeaderProps {
  title: string
  /** Gold epithet under the title ("THE RADIANCE" — moodboard parent pages). */
  epithet?: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
}

/**
 * The instrument-page title from the approved composition references:
 * a LARGE, light Panchang title in the geometric display face — "Sky Weather",
 * "Folio Archive" — not the small engraved serif lockup the parent-page
 * moodboard uses for its chrome. The references set the name in title case
 * with wide tracking, a quiet breadcrumb above, the gold epithet below, and a
 * rule-and-diamond flourish closing the lockup.
 */
export function PageHeader({ title, epithet, subtitle, showBack = true, onBack }: PageHeaderProps) {
  return (
    <div className="pointer-events-none fixed left-8 right-6 top-[84px] z-10 sm:left-14 sm:right-auto sm:top-[96px]">
      {/* Breadcrumb eyebrow — HOME is the way back; the hub + MAP also return. */}
      {showBack && (
        <p className="mb-3 flex items-center gap-2 font-display text-xs uppercase tracking-[0.28em] text-metadata">
          <button
            onClick={onBack}
            className="pointer-events-auto transition-colors hover:text-gold"
            aria-label="Return to home constellation"
          >
            Home
          </button>
          <span className="h-1 w-1 rotate-45 border border-gold/40" aria-hidden="true" />
          <span className="text-metadata">{title}</span>
        </p>
      )}

      {/* The reference instrument title — geometric sans, light, title case. */}
      <h1 className="font-display text-[2rem] font-light leading-none tracking-[0.14em] text-parchment sm:text-6xl sm:tracking-[0.18em]">
        {title}
      </h1>

      {epithet && (
        <p className="mt-3 font-display text-xs uppercase tracking-[0.42em] text-gold/80">
          {epithet}
        </p>
      )}

      {/* Rule + center diamond flourish, echoing the reference's title ornament. */}
      <div className="mt-4 flex w-56 items-center gap-2.5 sm:w-80" aria-hidden="true">
        <span className="h-px flex-1 bg-gradient-to-r from-gold/60 to-gold/10" />
        <span className="relative flex h-2 w-2 rotate-45 items-center justify-center border border-gold/80">
          <span className="h-0.5 w-0.5 bg-gold" />
        </span>
        <span className="h-px w-6 bg-gold/10" />
      </div>

      {/* Keep the purpose readable in the wide composition without crowding
          the compact constellation. Compact layouts receive the same text
          through the ordered list lens and this screen-reader copy. */}
      {subtitle && (
        <p className="mt-3 max-w-xl text-sm leading-6 text-silver">
          <span className="hidden lg:inline">{subtitle}</span>
          <span className="sr-only lg:hidden">{subtitle}</span>
        </p>
      )}
    </div>
  )
}
