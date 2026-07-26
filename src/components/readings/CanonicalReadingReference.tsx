import { useEffect, useMemo, useRef, useState } from 'react'
import { Archive, Check, LoaderCircle } from 'lucide-react'
import { useFolioState } from '../../hooks/useFolio'
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
          : 'console-card grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center'
      }
      aria-label="Canonical Folio identity"
    >
      {!compact && (
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald/35 bg-emerald/10 text-emerald">
          <Check className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="console-eyebrow text-emerald/80">Canonical Folio record</p>
        <p className="mt-1 truncate font-mono text-[10px] text-parchment" title={entry.id}>
          {entry.id}
        </p>
        <p className="mt-1 font-mono text-[9px] text-silver/60" title={checksum ?? undefined}>
          sha256 · {shortChecksum(checksum)}
        </p>
      </div>
      <a
        href={`#/readings/${encodeURIComponent(entry.id)}`}
        className={
          compact
            ? 'mt-2 inline-flex cursor-pointer items-center gap-2 font-display text-[9px] uppercase tracking-[0.2em] text-gold underline decoration-gold/35 underline-offset-4 transition-colors hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'
            : 'inline-flex cursor-pointer items-center gap-2 justify-self-start rounded-full border border-gold/30 px-4 py-2 font-display text-[9px] uppercase tracking-[0.2em] text-gold transition-colors hover:border-gold hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:justify-self-end'
        }
      >
        <Archive className="h-3.5 w-3.5" aria-hidden="true" />
        Open record
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
  const { entries } = useFolioState()
  // Daily archiving completes just before this component mounts; allow that
  // small boundary while excluding older identical readings.
  const notBefore = useRef(Date.now() - 15_000)
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
    [entries, mode, nodeId, result.archiveContent, result.archiveMode, result.archiveTitle, title],
  )

  if (result.saveError) return null
  if (!entry) {
    return (
      <div className="flex items-center gap-2 border-l border-gold/25 pl-3 text-[10px] text-silver/60" aria-live="polite">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin text-gold motion-reduce:animate-none" aria-hidden="true" />
        Binding this telling to its canonical Folio record…
      </div>
    )
  }
  return <CanonicalReadingReference entry={entry} compact />
}
