import type { ReadingCollectionsElement } from '../../../lib/readings'
import { ElementFrame, elementDomId } from './ElementFrame'

export function ReadingCollections({ element }: { element: ReadingCollectionsElement }) {
  return (
    <ElementFrame element={element}>
      <div className="space-y-4">
        {element.groups.map((group) => {
          const id = `collection-${elementDomId(element.id)}-${elementDomId(group.id)}`
          return (
            <section key={group.id} aria-labelledby={id}>
              <h4 id={id} className="font-display text-[9px] uppercase tracking-[0.16em] text-gold/65">{group.label}</h4>
              <ul className="mt-2 flex flex-wrap gap-2">
                {group.items.map((item, index) => (
                  <li key={`${item}-${index}`} className="glass-pill px-2.5 py-1 text-[10px] text-parchment/85">{item}</li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </ElementFrame>
  )
}
