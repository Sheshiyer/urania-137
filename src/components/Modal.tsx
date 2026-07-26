import type { ReactNode } from 'react'
import { InstrumentDialog } from './ui/InstrumentDialog'

interface ModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** Compatibility wrapper for legacy callers while InstrumentDialog owns chrome and lifecycle. */
export function Modal({ isOpen, title, onClose, children }: ModalProps) {
  return (
    <InstrumentDialog
      open={isOpen}
      title={title}
      onClose={onClose}
      closeOnOutsideClick
      bodyClassName="overflow-y-auto overscroll-contain px-5 py-5 sm:px-10 sm:py-7"
    >
      {children}
    </InstrumentDialog>
  )
}
