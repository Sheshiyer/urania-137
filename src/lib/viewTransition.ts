/**
 * Route and lens changes crossfade through the View Transitions API where
 * the engine supports it and the reader has not asked for reduced motion.
 * Elsewhere the update simply runs. The callback is always invoked exactly
 * once, synchronously when no transition is possible.
 */
type DocumentWithVT = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => { finished: Promise<void> }
}

export function canViewTransition(): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false
  const doc = document as DocumentWithVT
  if (typeof doc.startViewTransition !== 'function') return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function withViewTransition(update: () => void): void {
  if (!canViewTransition()) {
    update()
    return
  }
  try {
    ;(document as DocumentWithVT).startViewTransition!(update)
  } catch {
    update()
  }
}
