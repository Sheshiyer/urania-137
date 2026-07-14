import { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ isOpen, title, onClose, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl rounded-3xl border border-gold/20 bg-surface/90 p-8 shadow-2xl shadow-gold/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-semibold text-parchment tracking-wide">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-silver hover:text-parchment hover:bg-parchment/5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}
