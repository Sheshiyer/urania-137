import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./ThresholdPage.tsx', import.meta.url), 'utf8')

describe('Threshold lifecycle and accessible scrub contract', () => {
  it('updates the application lifecycle only after server completion succeeds', () => {
    const completed = source.indexOf('await completeSession')
    const notified = source.indexOf('onComplete?.()')

    expect(completed).toBeGreaterThan(-1)
    expect(notified).toBeGreaterThan(completed)
  })

  it('does not clamp document scroll at incomplete gates', () => {
    expect(source).not.toContain('enforceGate')
    expect(source).not.toMatch(/window\.scrollY\s*>\s*limit/)
  })

  it('opens the completed crossing without animation for reduced motion', () => {
    expect(source).toContain('if (REDUCED_MOTION())')
    expect(source).toContain("'inset(0% 0% round 0px)'")
    expect(source).toContain('setCrossed(open)')
  })
})
