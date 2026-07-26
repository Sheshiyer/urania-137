import type { AsyncViewState } from '../../components/ui/AsyncBoundary'
import type { FolioStatus } from '../folioStore'
import type { ReadingDTO } from '../api/contract'

export type FolioAccess = 'owner-scoped' | 'denied'

export interface FolioViewInput {
  status: FolioStatus
  entries: readonly ReadingDTO[]
  error: string | null
  readingId: string | null
  filtered: boolean
  access?: FolioAccess
}

export type FolioView =
  | { status: 'loading' }
  | { status: 'empty'; filtered: boolean }
  | { status: 'error'; message: string }
  | { status: 'denied' }
  | { status: 'unavailable-record'; readingId: string }
  | {
      status: 'ready'
      entries: readonly ReadingDTO[]
      selected: ReadingDTO | null
    }

/**
 * Resolves the Folio into one exclusive render state before JSX. The current
 * list API cannot distinguish a missing record from a record outside the
 * owner scope, so callers use unavailable-record unless an explicit access
 * signal exists.
 */
export function deriveFolioView(input: FolioViewInput): FolioView {
  if (input.access === 'denied') return { status: 'denied' }

  if (
    (input.status === 'idle' || input.status === 'loading')
    && input.entries.length === 0
  ) {
    return { status: 'loading' }
  }

  if (input.status === 'error') {
    return {
      status: 'error',
      message: input.error ?? 'The Folio could not be loaded.',
    }
  }

  const selected = input.readingId
    ? input.entries.find((entry) => entry.id === input.readingId) ?? null
    : null

  if (input.readingId && !selected) {
    return { status: 'unavailable-record', readingId: input.readingId }
  }

  if (input.entries.length === 0) {
    return { status: 'empty', filtered: input.filtered }
  }

  return { status: 'ready', entries: input.entries, selected }
}

export function folioBoundaryState(
  view: FolioView,
  onRetry: () => void,
): AsyncViewState {
  switch (view.status) {
    case 'loading':
      return { status: 'loading', message: 'Charting your Folio…' }
    case 'empty':
      return {
        status: 'empty',
        message: view.filtered
          ? 'No readings match this lens. Clear search or favorites to restore the complete Folio.'
          : 'Your Folio is still quiet. Begin through conversation to create its first canonical Reading.',
      }
    case 'error':
      return { status: 'error', message: view.message, onRetry }
    case 'denied':
      return {
        status: 'denied',
        message: 'This Folio is unavailable to the signed-in account.',
      }
    case 'unavailable-record':
      return {
        status: 'denied',
        message: 'This Reading is unavailable to the signed-in account.',
      }
    case 'ready':
      return { status: 'ready' }
  }
}
