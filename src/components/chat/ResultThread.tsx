import type { ThreadResult } from '../../lib/chat/resultMessages'
import type { ThreadReadingContext } from '../../lib/readings'
import { ReadingTransition } from './ReadingTransition'

/**
 * Presentation-only bridge from an engine result into the canonical reading
 * state machine. Chat turns remain untouched; ReadingTransition owns concise
 * announcements, preview, Folio binding, embedded fallback, and retry.
 */
export function ResultThread({
  result,
  readingContext,
  onRetry,
}: {
  result: ThreadResult
  readingContext: ThreadReadingContext
  onRetry?: () => void
}) {
  return (
    <ReadingTransition
      result={result}
      readingContext={readingContext}
      onRetry={onRetry}
    />
  )
}
