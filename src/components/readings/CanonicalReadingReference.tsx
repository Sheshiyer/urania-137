import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Archive, Check, LoaderCircle } from 'lucide-react'
import { useFolioState } from '../../hooks/useFolio'
import { refreshFolio } from '../../lib/folioStore'
import type { ReadingDTO } from '../../lib/api/contract'
import type { ThreadResult } from '../../lib/chat/resultMessages'
import {
  canonicalReadingChecksum,
  findCanonicalReading,
  shortChecksum,
} from '../../lib/readings/canonical'

function useChecksum(entry: ReadingDTO | null): string | null {
  const [checksum, setChecksum] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    setChecksum(null)
    if (entry) {
      void canonicalReadingChecksum(entry).then((value) => {
        if (live) setChecksum(value)
      })
    }
    return () => {
      live = false
    }
  }, [entry])
  return checksum
}

export const CANONICAL_BINDING_TIMEOUT_MS = 10_000

export interface ChatCanonicalBinding {
  entry: ReadingDTO | null
  timedOut: boolean
  retry: () => void
}

/**
 * Resolve the exact row saved by this encounter, with a finite wait. Retrying
 * refreshes the owner-scoped Folio snapshot; it never re-runs the engines or
 * writes another reading.
 */
export function useChatCanonicalBinding({
  result,
  nodeId,
  mode,
  title,
}: {
  result: ThreadResult
  nodeId: string
  mode: string
  title: string
}): ChatCanonicalBinding {
  const { entries } = useFolioState()
  const notBefore = useRef(Date.now() - 15_000)
  const [attempt, setAttempt] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const entry = useMemo(
    () =>
      result.archiveContent
        ? findCanonicalReading(entries, {
            nodeId,
            mode: result.archiveMode ?? mode,
            title: result.archiveTitle ?? title,
            content: result.archiveContent,
            notBefore: notBefore.current,
          })
        : null,
    [
      entries,
      mode,
      nodeId,
      result.archiveContent,
      result.archiveMode,
      result.archiveTitle,
      title,
    ],
  )

  useEffect(() => {
    setTimedOut(false)
    if (
      entry
      || result.status !== 'complete'
      || result.saveError
      || !result.archiveContent
    ) {
      return
    }
    const timer = window.setTimeout(
      () => setTimedOut(true),
      CANONICAL_BINDING_TIMEOUT_MS,
    )
    return () => window.clearTimeout(timer)
  }, [
    attempt,
    entry,
    result.archiveContent,
    result.saveError,
    result.status,
  ])

  const retry = useCallback(() => {
    setAttempt((current) => current + 1)
    setTimedOut(false)
    void refreshFolio()
  }, [])

  return { entry, timedOut, retry }
}

export function CanonicalReadingReference({
  entry,
  compact = false,
}: {
  entry: ReadingDTO
  compact?: boolean
}) {
  const checksum = useChecksum(entry)
  return (
    <div
      className={
        compact
          ? 'border-l border-emerald/40 pl-3'
          : 'canonical-reading-reference console-card grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-4 p-4'
      }
      aria-label="Canonical Folio identity"
    >
      {!compact && (
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald/35 bg-emerald/10 text-emerald">
          <Check className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="console-eyebrow text-emerald">Canonical Folio record</p>
        <p
          className={[
            'mt-1 font-mono text-xs text-parchment',
            compact ? 'truncate' : '[overflow-wrap:anywhere]',
          ].join(' ')}
          title={entry.id}
        >
          {entry.id}
        </p>
        <p className="mt-1 font-mono text-xs text-metadata" title={checksum ?? undefined}>
          sha256 · {shortChecksum(checksum)}
        </p>
      </div>
      <a
        href={`#/readings/${encodeURIComponent(entry.id)}`}
        className={
          compact
            ? 'mt-2 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 font-display text-xs uppercase tracking-[0.2em] text-gold underline decoration-gold/35 underline-offset-4 transition-colors hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'
            : 'col-span-2 inline-flex min-h-11 w-full min-w-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border border-gold/30 px-4 py-2 font-display text-xs uppercase tracking-[0.16em] text-gold transition-colors hover:border-gold hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'
        }
      >
        <Archive className="h-3.5 w-3.5" aria-hidden="true" />
        Open reading
      </a>
    </div>
  )
}

/**
 * Resolves the exact D1 row written by a complete chat result. It never creates
 * a second document: the link appears only when the Folio snapshot contains
 * the byte-identical stored body from this encounter.
 */
export function ChatCanonicalReadingReference({
  result,
  nodeId,
  mode,
  title,
}: {
  result: ThreadResult
  nodeId: string
  mode: string
  title: string
}) {
  const binding = useChatCanonicalBinding({ result, nodeId, mode, title })

  if (result.saveError) return null
  if (!binding.entry && binding.timedOut) {
    return (
      <div className="space-y-2 border-l border-terracotta/30 pl-3 text-xs text-evidence-copy-unresolved">
        <p>The reading could not be confirmed in Folio yet.</p>
        <button
          type="button"
          onClick={binding.retry}
          className="min-h-11 border border-terracotta/35 px-3 font-display uppercase tracking-[0.18em]"
        >
          Check Folio again
        </button>
      </div>
    )
  }
  if (!binding.entry) {
    return (
      <div className="flex items-center gap-2 border-l border-gold/25 pl-3 text-xs text-secondary">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin text-gold motion-reduce:animate-none" aria-hidden="true" />
        Saving this reading to Folio…
      </div>
    )
  }
  return <CanonicalReadingReference entry={binding.entry} compact />
}
