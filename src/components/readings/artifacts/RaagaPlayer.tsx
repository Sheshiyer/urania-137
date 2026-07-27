import type { ReadingMediaElement } from '../../../lib/readings'
import { MediaArtifact } from './MediaArtifact'

export function RaagaPlayer({ element }: { element: ReadingMediaElement }) {
  return (
    <section data-engine-artifact="raaga-player" aria-label="Raaga player and metadata">
      <MediaArtifact element={element} />
    </section>
  )
}
