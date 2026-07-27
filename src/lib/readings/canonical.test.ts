import { describe, expect, it } from 'vitest'
import type { ReadingDTO } from '../api/contract'
import {
  canonicalReadingBytes,
  canonicalReadingChecksum,
  findCanonicalReading,
  shortChecksum,
} from './canonical'

const older: ReadingDTO = {
  id: 'reading-old',
  nodeId: 'witness',
  nodeLabel: 'Noesis Reading',
  mode: 'integrated-reading',
  title: 'Noesis Reading — Integrated Reading',
  content: 'Canonical stored body.',
  createdAt: 1_800_000_000_000,
  favorite: false,
}
const current = { ...older, id: 'reading-current', createdAt: older.createdAt + 1_000 }

describe('canonical reading identity', () => {
  it('matches the exact archived body and respects the encounter boundary', () => {
    expect(
      findCanonicalReading([older, current], {
        nodeId: current.nodeId,
        mode: current.mode,
        title: current.title,
        content: current.content,
        notBefore: current.createdAt,
      }),
    ).toEqual(current)
    expect(
      findCanonicalReading([current], {
        nodeId: current.nodeId,
        mode: current.mode,
        title: current.title,
        content: 'A presentation-only variation.',
      }),
    ).toBeNull()
  })

  it('checksums canonical identity and content, ignoring presentation state', async () => {
    expect(canonicalReadingBytes(current)).not.toContain('"favorite"')
    const checksum = await canonicalReadingChecksum(current)
    expect(checksum).toMatch(/^[a-f0-9]{64}$/)
    await expect(canonicalReadingChecksum({ ...current, favorite: true })).resolves.toBe(checksum)
    await expect(canonicalReadingChecksum({ ...current, content: 'changed' })).resolves.not.toBe(checksum)
    expect(shortChecksum(checksum)).toBe(`${checksum.slice(0, 12)}…${checksum.slice(-6)}`)
  })
})
