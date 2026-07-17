import { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Modal shell. On mobile it's a bottom sheet that never exceeds the viewport —
 * a sticky header with the title + close, and a scrollable body — so long
 * content (the report form, the engine roster) is always readable and the
 * actions stay reachable. On >=sm it centres as a rounded panel.
 */
export function Modal({ isOpen, title, onClose, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-3xl border border-gold/20 bg-surface/95 shadow-2xl shadow-gold/10 sm:max-h-[88vh] sm:rounded-3xl">
        {/* Grab handle (mobile bottom-sheet affordance) */}
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-silver/30 sm:hidden" aria-hidden="true" />

        {/* Sticky header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gold/10 px-5 py-3.5 sm:px-8 sm:py-5">
          <h2 className="min-w-0 truncate font-display text-lg font-semibold tracking-wide text-parchment sm:text-2xl">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="-mr-1 shrink-0 rounded-full p-2 text-silver transition-colors hover:bg-parchment/5 hover:text-parchment"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-6">{children}</div>
      </div>
    </div>
  )
}
