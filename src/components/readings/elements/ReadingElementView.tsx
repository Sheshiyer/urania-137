import type { ReadingElement } from '../../../lib/readings'
import { ActivationCross } from '../artifacts/ActivationCross'
import { CapturePanel } from '../artifacts/CapturePanel'
import { DoshaClock } from '../artifacts/DoshaClock'
import { FiveLimbMandala } from '../artifacts/FiveLimbMandala'
import { HexagramTransition } from '../artifacts/HexagramTransition'
import { MediaArtifact } from '../artifacts/MediaArtifact'
import { NestedPeriodSpiral } from '../artifacts/NestedPeriodSpiral'
import { RaagaPlayer } from '../artifacts/RaagaPlayer'
import { SafeGeometryPreview } from '../artifacts/SafeGeometryPreview'
import { ReadingCollections } from './ReadingCollections'
import { ReadingCycles } from './ReadingCycles'
import { ReadingFactGrid } from './ReadingFactGrid'
import { ReadingNotice } from './ReadingNotice'
import { ReadingNumberCodes } from './ReadingNumberCodes'
import { ReadingPositions } from './ReadingPositions'
import { ReadingQuestions } from './ReadingQuestions'
import { ReadingRaw } from './ReadingRaw'
import { ReadingRelations } from './ReadingRelations'
import { ReadingSequence } from './ReadingSequence'
import { ReadingSpread } from './ReadingSpread'

export function ReadingElementView({ element }: { element: ReadingElement }) {
  switch (element.kind) {
    case 'fact-grid':
      if (element.sourceSystem === 'panchanga' && element.layout === 'limbs') {
        return <FiveLimbMandala element={element} />
      }
      if (element.sourceSystem === 'vedic-clock') return <DoshaClock element={element} />
      if (element.sourceSystem === 'sacred-geometry') return <SafeGeometryPreview element={element} />
      return <ReadingFactGrid element={element} />
    case 'number-codes':
      return <ReadingNumberCodes element={element} />
    case 'positions':
      return <ReadingPositions element={element} />
    case 'relations':
      return <ReadingRelations element={element} />
    case 'sequence':
      if (element.sourceSystem === 'gene-keys' && element.sequenceType === 'activation') {
        return <ActivationCross element={element} />
      }
      if (
        element.sourceSystem === 'vimshottari'
        && element.steps.length > 0
        && element.steps.every((step) => step.start && step.end)
      ) {
        return <NestedPeriodSpiral element={element} />
      }
      if (element.sourceSystem === 'vedic-clock') return <DoshaClock element={element} />
      return <ReadingSequence element={element} />
    case 'cycles':
      return <ReadingCycles element={element} />
    case 'spread':
      if (element.sourceSystem === 'i-ching') return <HexagramTransition element={element} />
      return <ReadingSpread element={element} />
    case 'collections':
      return <ReadingCollections element={element} />
    case 'questions':
      return <ReadingQuestions element={element} />
    case 'notice':
      return <ReadingNotice element={element} />
    case 'media':
      return element.sourceSystem === 'raaga'
        ? <RaagaPlayer element={element} />
        : <MediaArtifact element={element} />
    case 'artifact':
      return <SafeGeometryPreview element={element} />
    case 'capture':
      return <CapturePanel element={element} />
    case 'raw':
      return <ReadingRaw element={element} />
    default: {
      const exhaustive: never = element
      return exhaustive
    }
  }
}
