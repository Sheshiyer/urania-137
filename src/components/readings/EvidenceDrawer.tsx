import { ReadingSourcePayload } from './elements/ReadingSourcePayload'

export function EvidenceDrawer({ payload }: { payload: unknown }) {
  return (
    <section className="mt-5 border-t border-reading-rule/35 pt-4" aria-label="Technical source evidence">
      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-reading-muted">Technical source</p>
      <ReadingSourcePayload payload={payload} />
    </section>
  )
}
