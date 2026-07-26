import type { ChatSessionState } from '../../types/chat'
import { quickRepliesFor, type QuickReply, type QuickReplyTone } from '../../lib/chat/quickReplies'

/**
 * QuickReplies (W4-A) — one-tap chips for the closed-vocabulary beats of the
 * doorway story (confirm / yes-no / enum picks), rendered between the thread
 * and the composer so those beats never need the keyboard. The chip set is a
 * pure derivation from the session state (`quickRepliesFor`); the server
 * machine re-validates every turn, so a chip can never smuggle an invalid
 * answer. Free-text beats and the CircleBar-owned persist_offer render no
 * chips here.
 */

export interface QuickRepliesProps {
  session: ChatSessionState
  /** Composer disabled state (loading / streaming / handed off). */
  disabled: boolean
  /** Send the chip's payload; `echo` is the user-bubble text. */
  onReply: (input: unknown, echo: string) => void
}

const BASE =
  'rounded-full border px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.2em] backdrop-blur transition-all disabled:cursor-not-allowed disabled:opacity-40'

const TONE_STYLES: Record<QuickReplyTone, string> = {
  // Gold filled — doorway confirmations (matches btn-primary).
  primary: 'border-gold bg-gold text-void hover:brightness-110',
  // Growth green filled — the FINAL assembly confirm; the validation moment.
  growth: 'border-growth bg-growth text-void hover:brightness-110',
  // Growth outline — 'yes' at gates.
  affirm: 'border-growth/40 bg-growth/5 text-growth hover:border-growth/70 hover:bg-growth/10',
  // Parchment outline — 'no' / skip / use-default escapes.
  ghost: 'border-parchment/20 bg-parchment/5 text-parchment/70 hover:border-parchment/40 hover:text-parchment',
  // Gold-tinted pill — closed-enum options (matches CircleBar chips).
  choice: 'border-gold/20 bg-gold/5 text-parchment hover:border-gold/50 hover:bg-gold/10',
}

function Chip({ reply, disabled, onReply }: { reply: QuickReply; disabled: boolean; onReply: QuickRepliesProps['onReply'] }) {
  return (
    <button
      type="button"
      className={`${BASE} ${TONE_STYLES[reply.tone]}`}
      disabled={disabled}
      onClick={() => onReply(reply.input, reply.echo ?? reply.label)}
    >
      {reply.label}
    </button>
  )
}

export function QuickReplies({ session, disabled, onReply }: QuickRepliesProps) {
  const replies = quickRepliesFor(session)
  if (replies.length === 0) return null
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gold/10 px-5 pt-3 sm:px-8">
      {replies.map((r) => (
        <Chip key={`${r.tone}:${r.label}`} reply={r} disabled={disabled} onReply={onReply} />
      ))}
    </div>
  )
}
