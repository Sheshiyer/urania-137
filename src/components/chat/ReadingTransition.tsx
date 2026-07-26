import { LoaderCircle } from 'lucide-react'
import type { ReadingDTO } from '../../lib/api/contract'
import type { ThreadResult } from '../../lib/chat/resultMessages'
import {
  threadResultToReadingDocument,
  type ThreadReadingContext,
} from '../../lib/readings'
import {
  useChatCanonicalBinding,
} from '../readings/CanonicalReadingReference'
import { ReadingFolio } from '../readings/ReadingFolio'
import { ReadingPreview } from '../readings/ReadingPreview'

export type ReadingTransitionPhase =
  | 'composing'
  | 'preview'
  | 'canonical-bound'
  | 'binding-timeout'
  | 'save-failed'
  | 'engine-failed'

const COMPOSING_LINE: Record<ThreadResult['kind'], string> = {
  witness: 'The witness takes the pattern…',
  deterministic: 'The engines take the pattern…',
  daily: 'The sky is read for this place and hour…',
}

export function deriveReadingTransitionPhase(
  result: ThreadResult,
  canonicalEntry: ReadingDTO | null,
  bindingTimedOut: boolean,
): ReadingTransitionPhase {
  if (result.status === 'composing') return 'composing'
  if (result.status === 'error') return 'engine-failed'
  if (result.saveError) return 'save-failed'
  if (canonicalEntry) return 'canonical-bound'
  return bindingTimedOut ? 'binding-timeout' : 'preview'
}

export function ReadingTransition({
  result,
  readingContext,
  onRetry,
  canonicalEntry,
  bindingTimedOut,
  onRetryBinding,
}: {
  result: ThreadResult
  readingContext: ThreadReadingContext
  onRetry?: () => void
  /** Deterministic test/host override; undefined uses the live Folio binding. */
  canonicalEntry?: ReadingDTO | null
  bindingTimedOut?: boolean
  onRetryBinding?: () => void
}) {
  const liveBinding = useChatCanonicalBinding({
    result,
    nodeId: readingContext.nodeId,
    mode: readingContext.mode,
    title: readingContext.title,
  })
  const entry = canonicalEntry === undefined ? liveBinding.entry : canonicalEntry
  const timedOut = bindingTimedOut ?? liveBinding.timedOut
  const retryBinding = onRetryBinding ?? liveBinding.retry
  const phase = deriveReadingTransitionPhase(result, entry, timedOut)

  if (phase === 'composing') {
    return (
      <div data-reading-transition={phase} className="space-y-2 py-2 text-center">
        <p role="status" className="font-display text-[10px] uppercase tracking-[0.25em] text-gold/75">
          {COMPOSING_LINE[result.kind]}
        </p>
        <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold/60 motion-reduce:animate-none"
              style={{ animationDelay: `${index * 180}ms` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'engine-failed') {
    return (
      <div
        data-reading-transition={phase}
        role="alert"
        className="space-y-3 border-l border-terracotta/45 bg-terracotta/10 p-4 text-sm text-evidence-copy-unresolved"
      >
        <p>{result.error ?? 'The engines did not answer.'}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 border border-terracotta/40 px-4 font-display text-[9px] uppercase tracking-[0.18em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            Ask the engines again
          </button>
        )}
      </div>
    )
  }

  const document = threadResultToReadingDocument(result, readingContext)
  if (!document) return null
  const previewDocument = entry
    ? {
        ...document,
        archive: { entryId: entry.id, favorite: entry.favorite },
      }
    : document

  if (phase === 'save-failed') {
    return (
      <div data-reading-transition={phase} className="space-y-5">
        <p
          role="status"
          className="border-l border-terracotta/45 bg-terracotta/10 p-3 text-sm text-evidence-copy-unresolved"
        >
          The reading is complete, but Folio could not save it: {result.saveError}
        </p>
        <section aria-label="Embedded reading fallback">
          <ReadingFolio
            document={document}
            evidenceContext={{
              accessReason: 'Available in this authenticated thread only',
              checksum: null,
            }}
          />
        </section>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 border border-terracotta/40 px-4 font-display text-[9px] uppercase tracking-[0.18em] text-evidence-copy-unresolved focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            Try saving again
          </button>
        )}
      </div>
    )
  }

  if (phase === 'binding-timeout') {
    return (
      <div data-reading-transition={phase} className="space-y-4">
        <ReadingPreview document={previewDocument} />
        <div className="space-y-3 border-l border-terracotta/45 bg-terracotta/10 p-3 text-evidence-copy-unresolved">
          <p role="status" className="text-sm">
            The reading could not be confirmed in Folio yet. It remains available in this thread.
          </p>
          <button
            type="button"
            onClick={retryBinding}
            className="min-h-11 border border-terracotta/40 px-4 font-display text-[9px] uppercase tracking-[0.18em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            Check Folio again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div data-reading-transition={phase} className="space-y-4">
      <ReadingPreview document={previewDocument} />
      {phase === 'canonical-bound' ? (
        <p role="status" className="border-l border-emerald/45 pl-3 text-xs text-emerald">
          Reading saved to Folio.
        </p>
      ) : (
        <p role="status" className="flex items-center gap-2 border-l border-gold/30 pl-3 text-xs text-silver">
          <LoaderCircle
            className="h-3.5 w-3.5 animate-spin text-gold motion-reduce:animate-none"
            aria-hidden="true"
          />
          Saving reading to Folio…
        </p>
      )}
      {result.footer && (
        <p className="text-[10px] uppercase tracking-[0.18em] text-silver/60">
          {result.footer}
        </p>
      )}
      {result.warning && (
        <p className="border-l border-terracotta/45 bg-terracotta/10 p-3 text-xs text-evidence-copy-unresolved">
          {result.warning}
        </p>
      )}
    </div>
  )
}
