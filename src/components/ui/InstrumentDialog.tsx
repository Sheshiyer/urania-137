import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
} from 'react'
import { X } from 'lucide-react'

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, [contenteditable], [tabindex]:not([tabindex="-1"])'

let bodyLockCount = 0
let bodyOverflowBeforeLock = ''

function lockDocumentScroll(): () => void {
  if (typeof document === 'undefined') return () => undefined
  if (bodyLockCount === 0) {
    bodyOverflowBeforeLock = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  bodyLockCount += 1

  return () => {
    bodyLockCount = Math.max(0, bodyLockCount - 1)
    if (bodyLockCount === 0) document.body.style.overflow = bodyOverflowBeforeLock
  }
}

type FocusTarget = HTMLElement | SVGElement

function resolveConnectedFocusTarget(target: FocusTarget | null | undefined) {
  if (!target) return null
  if (target.isConnected) return target

  const graphEntry = target.getAttribute('data-graph-entry')
  const ariaLabel = target.getAttribute('aria-label')
  if (!graphEntry && !ariaLabel) return null

  return [...document.querySelectorAll<FocusTarget>(
    '[data-graph-entry], [role="button"][aria-label]',
  )].find((candidate) => (
    (graphEntry && candidate.getAttribute('data-graph-entry') === graphEntry)
    || (ariaLabel && candidate.getAttribute('aria-label') === ariaLabel)
  )) ?? null
}

export interface InstrumentDialogProps {
  open: boolean
  title: string
  description?: string
  eyebrow?: ReactNode
  onClose: () => void
  children?: ReactNode
  returnFocusRef?: RefObject<FocusTarget | null>
  /** Outside dismissal is opt-in so every consumer owns that policy explicitly. */
  closeOnOutsideClick?: boolean
  closeLabel?: string
  headerAlign?: 'center' | 'start'
  bodyClassName?: string
  className?: string
  titleClassName?: string
  dataNodeId?: string
}

/**
 * The shared Urania overlay primitive. Native `showModal()` supplies top-layer
 * semantics where available; the explicit keyboard guard keeps the same focus
 * containment in older engines and protects dynamic dialog contents.
 */
export function InstrumentDialog({
  open,
  title,
  description,
  eyebrow = '✦ Urania 137 ✦',
  onClose,
  children,
  returnFocusRef,
  closeOnOutsideClick = false,
  closeLabel = `Close ${title}`,
  headerAlign = 'center',
  bodyClassName = '',
  className = '',
  titleClassName = '',
  dataNodeId,
}: InstrumentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<FocusTarget | null>(null)
  const closingRef = useRef(false)
  const titleId = useId()
  const descriptionId = useId()

  const restoreFocus = useCallback(() => {
    const focusResolvedTarget = () => {
      const target =
        resolveConnectedFocusTarget(returnFocusRef?.current)
        ?? resolveConnectedFocusTarget(openerRef.current)
      target?.focus({ preventScroll: true })
    }
    focusResolvedTarget()
    window.setTimeout(focusResolvedTarget, 0)
  }, [returnFocusRef])

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return

    closingRef.current = false
    const active = document.activeElement
    openerRef.current =
      returnFocusRef?.current ??
      (active instanceof HTMLElement || active instanceof SVGElement ? active : null)
    const releaseScroll = lockDocumentScroll()

    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    }

    const focusTarget =
      dialog.querySelector<HTMLElement>('[autofocus]') ??
      dialog.querySelector<HTMLElement>(FOCUSABLE) ??
      dialog
    focusTarget.focus({ preventScroll: true })

    return () => {
      releaseScroll()
      if (dialog.open) {
        if (typeof dialog.close === 'function') dialog.close()
        else dialog.removeAttribute('open')
      }
      restoreFocus()
    }
  }, [open, restoreFocus, returnFocusRef])

  const trapFocus = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      requestClose()
      return
    }
    if (event.key !== 'Tab') return

    const dialog = dialogRef.current
    if (!dialog) return
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true',
    )
    if (focusable.length === 0) {
      event.preventDefault()
      dialog.focus({ preventScroll: true })
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault()
      last.focus({ preventScroll: true })
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault()
      first.focus({ preventScroll: true })
    }
  }

  const handleOutsideClick = (event: ReactMouseEvent<HTMLDialogElement>) => {
    if (!closeOnOutsideClick) return
    const rect = event.currentTarget.getBoundingClientRect()
    const outside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    if (outside) requestClose()
  }

  if (!open) return null

  const centered = headerAlign === 'center'
  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      data-node-id={dataNodeId}
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault()
        requestClose()
      }}
      onClose={restoreFocus}
      onKeyDown={trapFocus}
      onClick={handleOutsideClick}
      className={`fixed inset-x-0 bottom-0 top-auto z-50 m-0 max-h-[92dvh] w-full max-w-none overflow-visible border-0 bg-transparent p-0 text-parchment outline-none backdrop:bg-void/85 backdrop:backdrop-blur-sm motion-safe:animate-graph-in motion-reduce:animate-none sm:inset-0 sm:m-auto sm:max-h-[88dvh] sm:max-w-xl ${className}`}
    >
      <div className="console-card relative flex max-h-[92dvh] w-full flex-col rounded-t-md shadow-2xl shadow-void sm:max-h-[88dvh] sm:rounded-sm">
        <div className="pointer-events-none absolute inset-1.5 border border-gold/10" aria-hidden="true" />
        <span className="pointer-events-none absolute left-3 top-3 h-1.5 w-1.5 rotate-45 border border-gold/60" aria-hidden="true" />
        <span className="pointer-events-none absolute right-3 top-3 h-1.5 w-1.5 rotate-45 border border-gold/60" aria-hidden="true" />
        <span className="pointer-events-none absolute bottom-3 left-3 h-1.5 w-1.5 rotate-45 border border-gold/60" aria-hidden="true" />
        <span className="pointer-events-none absolute bottom-3 right-3 h-1.5 w-1.5 rotate-45 border border-gold/60" aria-hidden="true" />

        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-silver/30 sm:hidden" aria-hidden="true" />

        <header
          className={
            centered
              ? 'relative flex shrink-0 flex-col items-center gap-1.5 border-b border-gold/15 px-6 pb-4 pt-5 sm:px-10 sm:pt-7'
              : 'relative flex shrink-0 items-center justify-between gap-3 border-b border-gold/15 px-5 py-3.5 sm:px-8 sm:py-5'
          }
        >
          <div className={centered ? 'flex min-w-0 flex-col items-center gap-1.5' : 'min-w-0'}>
            {eyebrow && <p className="console-eyebrow">{eyebrow}</p>}
            <h2
              id={titleId}
              className={
                titleClassName ||
                (centered
                  ? 'max-w-full truncate text-center font-serif text-lg uppercase tracking-[0.18em] text-parchment sm:text-2xl sm:tracking-[0.22em]'
                  : 'truncate font-serif text-lg uppercase tracking-[0.14em] text-parchment sm:text-xl')
              }
            >
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className={`max-w-prose text-sm text-silver ${centered ? 'text-center' : ''}`}>
                {description}
              </p>
            )}
            {centered && (
              <div className="mt-1 flex w-40 items-center gap-2" aria-hidden="true">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/50" />
                <span className="h-1.5 w-1.5 rotate-45 border border-gold/80" />
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/50" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
            className={
              centered
                ? 'absolute right-4 top-4 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full p-2 text-silver transition-colors motion-reduce:transition-none hover:bg-parchment/5 hover:text-parchment sm:right-5 sm:top-5'
                : '-mr-1 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full p-2 text-silver transition-colors motion-reduce:transition-none hover:bg-parchment/5 hover:text-parchment'
            }
            aria-label={closeLabel}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className={`min-h-0 ${bodyClassName}`}>{children}</div>
      </div>
    </dialog>
  )
}
