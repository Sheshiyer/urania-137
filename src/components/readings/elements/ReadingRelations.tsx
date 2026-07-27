import type { ReadingRelationsElement } from '../../../lib/readings'
import { ElementFrame } from './ElementFrame'

export function ReadingRelations({ element }: { element: ReadingRelationsElement }) {
  return (
    <ElementFrame element={element} encoding="Each line connects the two named endpoints; the center label is the exact source relation.">
      <ul className="space-y-3">
        {element.relations.map((relation) => (
          <li key={relation.id} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.8fr)_minmax(0,1fr)]">
            <span className="border border-gold/20 bg-void/55 px-3 py-2 text-center text-xs text-parchment/90">{relation.from}</span>
            <span className="relative flex min-h-10 flex-col items-center justify-center text-center">
              <i className="absolute left-0 right-0 top-1/2 border-t border-gold/30" aria-hidden="true" />
              <strong className="relative bg-void px-2 font-display text-xs uppercase tracking-[0.14em] text-gold">{relation.relation}</strong>
              {(relation.measure || relation.status) && (
                <span className="relative mt-1 bg-void px-2 text-xs text-metadata">
                  {[relation.measure, relation.status].filter(Boolean).join(' · ')}
                </span>
              )}
            </span>
            <span className="border border-gold/20 bg-void/55 px-3 py-2 text-center text-xs text-parchment/90">{relation.to}</span>
            {relation.detail && <span className="text-center text-xs text-secondary sm:col-span-3">{relation.detail}</span>}
          </li>
        ))}
      </ul>
    </ElementFrame>
  )
}
