import type { ReadingNoticeElement } from '../../../lib/readings'
import { ElementFrame } from './ElementFrame'

const TONE: Record<ReadingNoticeElement['tone'], string> = {
  source: 'border-gold/25 text-gold',
  warning: 'border-terracotta/30 text-evidence-copy-unresolved',
  unresolved: 'border-violetglow/30 text-evidence-copy-witness',
}

export function ReadingNotice({ element }: { element: ReadingNoticeElement }) {
  return (
    <ElementFrame element={element}>
      <p className={`border-l-2 px-3 py-1 text-pretty text-xs leading-relaxed ${TONE[element.tone]}`}>
        <span className="mb-1 block font-display text-[8px] uppercase tracking-[0.16em]">{element.tone}</span>
        {element.body}
      </p>
    </ElementFrame>
  )
}
