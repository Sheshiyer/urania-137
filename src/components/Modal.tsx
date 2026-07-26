import { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Modal shell, in the moodboard's CREATE NEW NODE grammar: a squared gold
 * double-frame with corner diamonds, a centered eyebrow + engraved serif
 * title over a rule ornament, and a scrollable body. On mobile it's a bottom
 * sheet that never exceeds the viewport — sticky header, reachable actions —
 * on >=sm it centres as a framed panel.
 */
export function Modal({ isOpen, title, onClose, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-void/85 backdrop-blur-sm" onClick={onClose} />

      <div className="console-card relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-md shadow-2xl shadow-void sm:max-h-[88vh] sm:rounded-sm">
        {/* Double frame + corner diamonds (the reference card's gold rules) */}
        <div className="pointer-events-none absolute inset-1.5 border border-gold/10" aria-hidden="true" />
        <span className="pointer-events-none absolute left-3 top-3 h-1.5 w-1.5 rotate-45 border border-gold/60" aria-hidden="true" />
        <span className="pointer-events-none absolute right-3 top-3 h-1.5 w-1.5 rotate-45 border border-gold/60" aria-hidden="true" />
        <span className="pointer-events-none absolute bottom-3 left-3 h-1.5 w-1.5 rotate-45 border border-gold/60" aria-hidden="true" />
        <span className="pointer-events-none absolute bottom-3 right-3 h-1.5 w-1.5 rotate-45 border border-gold/60" aria-hidden="true" />

        {/* Grab handle (mobile bottom-sheet affordance) */}
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-silver/30 sm:hidden" aria-hidden="true" />

        {/* Sticky header — eyebrow over the engraved title, then the rule */}
        <div className="relative flex shrink-0 flex-col items-center gap-1.5 border-b border-gold/15 px-6 pb-4 pt-5 sm:px-10 sm:pt-7">
          <span className="console-eyebrow" aria-hidden="true">
            ✦ Urania 137 ✦
          </span>
          <h2 className="max-w-full truncate text-center font-serif text-lg uppercase tracking-[0.18em] text-parchment sm:text-2xl sm:tracking-[0.22em]">
            {title}
          </h2>
          <div className="mt-1 flex w-40 items-center gap-2" aria-hidden="true">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="h-1.5 w-1.5 rotate-45 border border-gold/80" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 shrink-0 rounded-full p-2 text-silver transition-colors hover:bg-parchment/5 hover:text-parchment sm:right-5 sm:top-5"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto overscroll-contain px-5 py-5 sm:px-10 sm:py-7">{children}</div>
      </div>
    </div>
  )
}
