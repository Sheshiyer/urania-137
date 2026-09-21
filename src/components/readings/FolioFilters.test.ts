import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const src = readFileSync(resolve(__dirname, 'FolioFilters.tsx'), 'utf-8')

describe('FolioFilters source contract', () => {
  it('renders lens pills with zero-count hiding', () => {
    expect(src).toContain('if (count === 0) return null')
  })

  it('uses aria-pressed on filter pills', () => {
    expect(src).toContain('aria-pressed={active}')
  })

  it('shows Clear button only when filters are active', () => {
    expect(src).toContain('hasActive')
    expect(src).toContain('Clear')
  })

  it('navigates via withViewTransition on filter change', () => {
    expect(src).toContain('withViewTransition')
    expect(src).toContain('navigate(buildFolioPath')
  })

  it('renders favorite pill gated on favCount', () => {
    expect(src).toContain('favCount > 0')
    expect(src).toContain('Favorites')
  })

  it('clears all filters on Clear click', () => {
    expect(src).toContain('lens: null, kind: null, favorites: false')
  })
})
