import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
}

/**
 * Overlay header for a parent-node page: a top-left back-to-home breadcrumb
 * and a centered display title with the rule-and-diamond ornament seen in the
 * generated page references.
 */
export function PageHeader({ title, subtitle, showBack = true, onBack }: PageHeaderProps) {
  return (
    <>
      {showBack && (
        <button
          onClick={onBack}
          className="fixed top-6 left-6 z-20 flex items-center gap-1.5 rounded-full border border-gold/20 bg-void/40 px-4 py-2 text-xs uppercase tracking-[0.2em] font-display text-silver backdrop-blur-sm transition-colors hover:border-gold/50 hover:text-parchment"
          aria-label="Return to home constellation"
        >
          <ChevronLeft className="h-4 w-4" />
          Noesis
        </button>
      )}

      <div className="pointer-events-none fixed top-5 left-0 right-0 z-10 flex flex-col items-center px-16">
        <span className="mb-2 h-1.5 w-1.5 rotate-45 border border-gold/60" aria-hidden="true" />
        <h1 className="text-center text-3xl font-display font-light uppercase tracking-[0.42em] text-parchment sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {/* Wide rule + center diamond, echoing the reference's full-width divider. */}
        <div className="mt-3 flex w-full max-w-3xl items-center gap-4" aria-hidden="true">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-gold/70" />
          <span className="relative flex h-2.5 w-2.5 rotate-45 items-center justify-center border border-gold/80">
            <span className="h-0.5 w-0.5 bg-gold" />
          </span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/30 to-gold/70" />
        </div>
        {/* Description kept for screen readers; the references show a title-only header. */}
        {subtitle && <p className="sr-only">{subtitle}</p>}
      </div>
    </>
  )
}
