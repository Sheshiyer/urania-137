interface PageHeaderProps {
  title: string
  /** Gold epithet under the title ("THE RADIANCE" — moodboard parent pages). */
  epithet?: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
}

/**
 * The parent-page title block from the architecture moodboard: a top-left
 * lockup under the nav — the HOME · {NODE} breadcrumb eyebrow (HOME returns to
 * the galactic view), the engraved Cinzel title, the gold epithet, and the
 * rule-and-diamond ornament. Left-aligned like the reference parent pages; the
 * description stays available to screen readers.
 */
export function PageHeader({ title, epithet, subtitle, showBack = true, onBack }: PageHeaderProps) {
  return (
    <div className="pointer-events-none fixed left-6 right-6 top-[76px] z-10 sm:left-12 sm:right-auto sm:top-[84px]">
      {/* Breadcrumb eyebrow — HOME is the way back; the hub + MAP also return. */}
      {showBack && (
        <p className="mb-2.5 flex items-center gap-2 font-display text-[10px] uppercase tracking-[0.26em] text-silver/70">
          <button
            onClick={onBack}
            className="pointer-events-auto transition-colors hover:text-gold"
            aria-label="Return to home constellation"
          >
            Home
          </button>
          <span className="h-1 w-1 rotate-45 border border-gold/50" aria-hidden="true" />
          <span className="text-silver/50">{title}</span>
        </p>
      )}

      <h1 className="font-serif text-2xl font-light uppercase leading-none tracking-[0.3em] text-parchment sm:text-4xl sm:tracking-[0.36em]">
        {title}
      </h1>

      {epithet && (
        <p className="mt-2.5 font-display text-[9px] uppercase tracking-[0.4em] text-gold/80 sm:text-[10px]">
          {epithet}
        </p>
      )}

      {/* Rule + center diamond, echoing the reference's divider. */}
      <div className="mt-3.5 flex w-48 items-center gap-2.5 sm:w-64" aria-hidden="true">
        <span className="h-px flex-1 bg-gradient-to-r from-gold/60 to-gold/10" />
        <span className="relative flex h-2 w-2 rotate-45 items-center justify-center border border-gold/80">
          <span className="h-0.5 w-0.5 bg-gold" />
        </span>
        <span className="h-px w-6 bg-gold/10" />
      </div>

      {/* Description kept for screen readers; the references show a title-only header. */}
      {subtitle && <p className="sr-only">{subtitle}</p>}
    </div>
  )
}
