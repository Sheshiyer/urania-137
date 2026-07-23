import type { ThreadResult } from '../../lib/chat/resultMessages'

/**
 * ResultThread (Phase 3) — the in-thread narrative result surface. After the
 * handoff, the chat stays open and the reading arrives as narrator-style
 * chapters: a composing beat (luminous-witness register, per prompts.ts)
 * while the engines run, then ONE message per pass (witness/daily) or a
 * single chaptered message (deterministic), then a closing beat that names
 * the Folio archive as the reading's durable home.
 *
 * Presentation only — nothing here is persisted as a chat turn; the Folio
 * row the submit hook already saved is the durable copy, and a reopened
 * doorway starts a fresh story (advance-on-consume, W4).
 */

/** Composing-beat stage directions — luminous-witness register, facts only. */
const COMPOSING_LINE: Record<ThreadResult['kind'], string> = {
  witness: 'The witness takes the pattern…',
  deterministic: 'The engines take the pattern…',
  daily: 'The sky is read for this place and hour…',
}

function ComposingBeat({ kind }: { kind: ThreadResult['kind'] }) {
  return (
    <div className="space-y-1" aria-label="The reading is being composed">
      <p className="py-1 text-center font-display text-[10px] uppercase tracking-[0.25em] text-gold/60" aria-label="stage direction">
        ✦ {COMPOSING_LINE[kind]} ✦
      </p>
      <div className="flex items-center justify-center gap-1.5 py-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold/60 motion-reduce:animate-none"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

export function ResultThread({ result, onRetry }: { result: ThreadResult; onRetry?: () => void }) {
  if (result.status === 'composing') return <ComposingBeat kind={result.kind} />

  // Engine/save failure — the exact text the modal era surfaced, with a retry
  // that re-fires the same hook call. Never silent.
  if (result.status === 'error') {
    return (
      <div className="space-y-2 rounded-lg border border-terracotta/20 bg-terracotta/10 p-3 text-sm text-terracotta">
        <p>{result.error ?? 'The engines did not answer.'}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full border border-terracotta/30 px-3 py-1 text-xs transition-colors hover:bg-terracotta/10"
          >
            Ask the engines again
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {result.chapters.map((ch) => (
        <section key={ch.id} className="mr-auto max-w-[92%] space-y-1.5 text-sm text-parchment/90">
          <h3 className="font-display text-[11px] uppercase tracking-[0.22em] text-gold">{ch.title}</h3>
          <p className="whitespace-pre-wrap break-words leading-relaxed">{ch.body}</p>
        </section>
      ))}

      {result.footer && <p className="pt-1 text-[10px] uppercase tracking-[0.2em] text-silver/45">{result.footer}</p>}

      {result.warning && (
        <p className="rounded-lg border border-terracotta/25 bg-terracotta/10 px-3 py-2 text-xs text-terracotta">{result.warning}</p>
      )}

      {result.saveError && (
        <p className="rounded-lg border border-terracotta/25 bg-terracotta/10 px-3 py-2 text-xs text-terracotta">
          The reading is whole, but the Folio could not hold it: {result.saveError}
        </p>
      )}

      {/* Closing beat — text only. The Folio save already happened in the
          hook; a reopened doorway starts a fresh story, and the reading is
          not lost because it rests in the archive. */}
      <p className="py-2 text-center font-display text-[10px] uppercase tracking-[0.25em] text-gold/60">
        {result.saveError
          ? '✦ The mirror is temporary — this telling lives in this thread alone ✦'
          : '✦ This reading now rests in your Folio archive — the Archive doorway holds it whenever you return ✦'}
      </p>
    </div>
  )
}
