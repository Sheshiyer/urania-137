import type { ReadingElement } from '../../../lib/readings'
import { ReadingArtifact } from './ReadingArtifact'
import { ReadingCapture } from './ReadingCapture'
import { ReadingCollections } from './ReadingCollections'
import { ReadingCycles } from './ReadingCycles'
import { ReadingFactGrid } from './ReadingFactGrid'
import { ReadingMedia } from './ReadingMedia'
import { ReadingNotice } from './ReadingNotice'
import { ReadingNumberCodes } from './ReadingNumberCodes'
import { ReadingPositions } from './ReadingPositions'
import { ReadingQuestions } from './ReadingQuestions'
import { ReadingRaw } from './ReadingRaw'
import { ReadingRelations } from './ReadingRelations'
import { ReadingSequence } from './ReadingSequence'
import { ReadingSpread } from './ReadingSpread'

function ReadingElementView({ element }: { element: ReadingElement }) {
  switch (element.kind) {
    case 'fact-grid':
      return <ReadingFactGrid element={element} />
    case 'number-codes':
      return <ReadingNumberCodes element={element} />
    case 'positions':
      return <ReadingPositions element={element} />
    case 'relations':
      return <ReadingRelations element={element} />
    case 'sequence':
      return <ReadingSequence element={element} />
    case 'cycles':
      return <ReadingCycles element={element} />
    case 'spread':
      return <ReadingSpread element={element} />
    case 'collections':
      return <ReadingCollections element={element} />
    case 'questions':
      return <ReadingQuestions element={element} />
    case 'notice':
      return <ReadingNotice element={element} />
    case 'media':
      return <ReadingMedia element={element} />
    case 'artifact':
      return <ReadingArtifact element={element} />
    case 'capture':
      return <ReadingCapture element={element} />
    case 'raw':
      return <ReadingRaw element={element} />
    default: {
      const exhaustive: never = element
      return exhaustive
    }
  }
}

export function ReadingElementField({ elements }: { elements: ReadingElement[] }) {
  if (elements.length === 0) return null
  return (
    <section aria-labelledby="reading-element-field-title" className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="console-eyebrow">Reading field</p>
          <h2 id="reading-element-field-title" className="mt-1 font-serif text-sm uppercase tracking-[0.16em] text-parchment">
            Source-shaped elements
          </h2>
        </div>
        <p className="max-w-sm text-[10px] leading-relaxed text-silver/60">
          Each element is derived from explicit engine structure; the source remains available below.
        </p>
      </header>
      <div
        className="grid min-w-0 gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 28rem), 1fr))' }}
      >
        {elements.map((element) => (
          <ReadingElementView key={element.id} element={element} />
        ))}
      </div>
    </section>
  )
}
