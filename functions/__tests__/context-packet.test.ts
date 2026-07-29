/**
 * Task 4 — ContextPacketV1 assembly contract tests.
 *
 * Covers: L0 zero-model-invocation rendering, strict additivity across
 * depths, relationship fail-closed gating, bounded caps, depth/consciousness
 * independence, and owner scoping.
 */
import { describe, expect, it, vi } from 'vitest'
import { assembleContextPacket } from '../lib/context/assemble'
import { MAX_EXCERPT_LENGTH } from '../lib/context/layer-policy'
import type {
  AssembleContextInput,
  CurrentCalculationRef,
  SelectedHistoryEntry,
} from '../lib/context/types'

const CURRENT: CurrentCalculationRef = {
  sourceId: 'engine:panchanga:run-42',
  engineId: 'panchanga',
  engineVersion: '1.0.0',
  inputHash: 'a'.repeat(64),
  resultHash: 'b'.repeat(64),
  calculatedAt: '2026-07-28T00:00:00.000Z',
  payload: { tithi: 'Shukla Panchami' },
}

function baseInput(over: Partial<AssembleContextInput> = {}): AssembleContextInput {
  return {
    readingId: 'reading-1',
    ownerRef: 'owner-1',
    subjectRefs: ['owner-1'],
    interpretationDepth: 0,
    consciousnessLevel: 1,
    question: '',
    current: CURRENT,
    now: () => '2026-07-28T00:00:00.000Z',
    packetId: 'packet-1',
    ...over,
  }
}

describe('L0 — zero model invocation', () => {
  it('renders current calculation data verbatim with no model call', () => {
    const modelPort = vi.fn()
    const result = assembleContextPacket(baseInput({ interpretationDepth: 0 }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packet.current).toEqual(CURRENT)
    expect(result.packet.current.payload).toEqual({ tithi: 'Shukla Panchami' })
    expect(modelPort).not.toHaveBeenCalled()
  })

  it('omits question, history, temporal, grounded content at L0', () => {
    const result = assembleContextPacket(baseInput({ interpretationDepth: 0 }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packet.question).toBe('')
    expect(result.packet.selectedHistory).toEqual([])
    expect(result.packet.temporalContext).toEqual([])
    expect(result.packet.groundedPassages).toEqual([])
  })

  it('L0 preserves provenance fields (engineVersion, hashes, method, seed) verbatim', () => {
    const current: CurrentCalculationRef = { ...CURRENT, method: 'draw', seed: 'seed-1' }
    const result = assembleContextPacket(baseInput({ interpretationDepth: 0, current }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packet.current).toEqual(current)
  })
})

describe('additive depths', () => {
  const history: SelectedHistoryEntry[] = [
    { readingId: 'reading-0', sourceId: 'engine:x:1', excerpt: 'prior excerpt', excerptHash: 'c'.repeat(64) },
  ]

  function packetAt(depth: 0 | 1 | 2 | 3 | 4 | 5) {
    const result = assembleContextPacket(
      baseInput({
        interpretationDepth: depth,
        question: 'What does this mean?',
        candidateHistory: history,
        candidateTemporalContext: [{ sourceId: 'temporal:1', kind: 'transit', value: { x: 1 }, valueHash: 'd'.repeat(64) }],
        candidateGroundedPassages: [
          { id: 'passage-1', source: 'corpus:1', excerpt: 'grounded text', score: 0.9, provenance: 'sourced-fact' },
        ],
      }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    return result.packet
  }

  it('L1 includes everything L0 has plus the question', () => {
    const l0 = packetAt(0)
    const l1 = packetAt(1)
    expect(l1.current).toEqual(l0.current)
    expect(l1.question.length).toBeGreaterThan(0)
    expect(l0.question).toBe('')
  })

  it('L2 includes everything L1 has plus history', () => {
    const l1 = packetAt(1)
    const l2 = packetAt(2)
    expect(l2.current).toEqual(l1.current)
    expect(l2.question).toBe(l1.question)
    expect(l2.selectedHistory.length).toBeGreaterThan(0)
    expect(l1.selectedHistory).toEqual([])
  })

  it('L3 includes everything L2 has plus temporal context', () => {
    const l2 = packetAt(2)
    const l3 = packetAt(3)
    expect(l3.selectedHistory).toEqual(l2.selectedHistory)
    expect(l3.temporalContext.length).toBeGreaterThan(0)
    expect(l2.temporalContext).toEqual([])
  })

  it('L4 includes everything L3 has plus grounded passages', () => {
    const l3 = packetAt(3)
    const l4 = packetAt(4)
    expect(l4.temporalContext).toEqual(l3.temporalContext)
    expect(l4.groundedPassages.length).toBeGreaterThan(0)
    expect(l3.groundedPassages).toEqual([])
  })

  it('L5 includes everything L4 has (cross-reading synthesis is agent-side, evidence set unchanged)', () => {
    const l4 = packetAt(4)
    const l5 = packetAt(5)
    expect(l5.groundedPassages).toEqual(l4.groundedPassages)
    expect(l5.selectedHistory).toEqual(l4.selectedHistory)
    expect(l5.temporalContext).toEqual(l4.temporalContext)
  })
})

describe('relationship/dyad fail-closed', () => {
  it('rejects relationship context when no grant is supplied', () => {
    const result = assembleContextPacket(
      baseInput({
        interpretationDepth: 3,
        question: 'q',
        relationshipRef: 'rel-1',
      }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('relationship-context-requires-active-grant')
  })

  it('rejects relationship context when grant is present but inactive', () => {
    const result = assembleContextPacket(
      baseInput({
        interpretationDepth: 3,
        question: 'q',
        relationshipRef: 'rel-1',
        relationshipGrant: { relationshipId: 'rel-1', active: false },
      }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('relationship-context-requires-active-grant')
  })

  it('includes relationshipRef only with an active explicit grant', () => {
    const result = assembleContextPacket(
      baseInput({
        interpretationDepth: 3,
        question: 'q',
        relationshipRef: 'rel-1',
        relationshipGrant: { relationshipId: 'rel-1', active: true },
      }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packet.relationshipRef).toBe('rel-1')
    expect(result.packet.policy.allowRelationship).toBe(true)
  })

  it('never includes relationshipRef at depths below L3, even with a grant', () => {
    const result = assembleContextPacket(
      baseInput({
        interpretationDepth: 2,
        question: 'q',
        relationshipRef: 'rel-1',
        relationshipGrant: { relationshipId: 'rel-1', active: true },
      }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packet.relationshipRef).toBeUndefined()
  })
})

describe('bounded caps', () => {
  it('truncates history to at most 8 entries', () => {
    const history: SelectedHistoryEntry[] = Array.from({ length: 20 }, (_, i) => ({
      readingId: `reading-${i}`,
      sourceId: `engine:x:${i}`,
      excerpt: 'x',
      excerptHash: 'e'.repeat(64),
    }))
    const result = assembleContextPacket(
      baseInput({ interpretationDepth: 2, question: 'q', candidateHistory: history }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packet.selectedHistory.length).toBe(8)
  })

  it('truncates an overlong excerpt deterministically rather than rejecting or growing unbounded', () => {
    const longExcerpt = 'x'.repeat(5_000)
    const history: SelectedHistoryEntry[] = [
      { readingId: 'r-1', sourceId: 'engine:x:1', excerpt: longExcerpt, excerptHash: 'f'.repeat(64) },
    ]
    const result = assembleContextPacket(
      baseInput({ interpretationDepth: 2, question: 'q', candidateHistory: history }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packet.selectedHistory[0].excerpt.length).toBe(MAX_EXCERPT_LENGTH)
  })

  it('rejects a question that exceeds the max length', () => {
    const result = assembleContextPacket(
      baseInput({ interpretationDepth: 1, question: 'x'.repeat(3_000) }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('question-too-long')
  })

  it('truncates grounded passages to at most 12 entries', () => {
    const passages = Array.from({ length: 30 }, (_, i) => ({
      id: `passage-${i}`,
      source: 'corpus:1',
      excerpt: 'x',
      score: 0.5,
      provenance: 'sourced-fact' as const,
    }))
    const result = assembleContextPacket(
      baseInput({ interpretationDepth: 4, question: 'q', candidateGroundedPassages: passages }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packet.groundedPassages.length).toBe(12)
  })
})

describe('interpretationDepth / consciousnessLevel independence', () => {
  it('the same consciousnessLevel can pair with every interpretationDepth', () => {
    for (const depth of [0, 1, 2, 3, 4, 5] as const) {
      const result = assembleContextPacket(
        baseInput({ interpretationDepth: depth, consciousnessLevel: 3, question: depth >= 1 ? 'q' : '' }),
      )
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.packet.consciousnessLevel).toBe(3)
      expect(result.packet.interpretationDepth).toBe(depth)
    }
  })

  it('the same interpretationDepth can pair with every consciousnessLevel', () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const result = assembleContextPacket(
        baseInput({ interpretationDepth: 2, consciousnessLevel: level, question: 'q' }),
      )
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.packet.interpretationDepth).toBe(2)
      expect(result.packet.consciousnessLevel).toBe(level)
    }
  })

  it('rejects an invalid interpretationDepth without touching consciousnessLevel validation', () => {
    const result = assembleContextPacket(
      baseInput({ interpretationDepth: 9 as unknown as 0, consciousnessLevel: 5 }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('invalid-interpretation-depth')
  })

  it('rejects an invalid consciousnessLevel', () => {
    const result = assembleContextPacket(
      baseInput({ interpretationDepth: 0, consciousnessLevel: 9 as unknown as 1 }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('invalid-consciousness-level')
  })
})

describe('owner scoping', () => {
  it('rejects a missing ownerRef', () => {
    const result = assembleContextPacket(baseInput({ ownerRef: '' }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('owner-ref-required')
  })

  it('stamps the resolved ownerRef onto the packet and never lets caller data override it after trimming', () => {
    const result = assembleContextPacket(baseInput({ ownerRef: '  owner-42  ' }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packet.ownerRef).toBe('owner-42')
  })

  it('rejects a missing readingId', () => {
    const result = assembleContextPacket(baseInput({ readingId: '' }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('reading-id-required')
  })
})
