import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ReadingDTO } from '../../lib/api/contract'
import type { ThreadReadingContext } from '../../lib/readings'
import type { ThreadResult } from '../../lib/chat/resultMessages'
import {
  ReadingTransition,
  deriveReadingTransitionPhase,
} from './ReadingTransition'

const context: ThreadReadingContext = {
  title: 'Noesis Reading — Integrated reading',
  mode: 'integrated-reading',
  nodeId: 'witness',
  nodeLabel: 'Noesis Reading',
  createdAt: 1_775_000_000_000,
  owner: { id: 'owner-1', email: 'owner@example.test', label: 'Owner' },
  subject: { id: 'subject-1', kind: 'person', label: 'Subject' },
}

const complete: ThreadResult = {
  kind: 'witness',
  status: 'complete',
  structureSource: 'native',
  chapters: [{ id: 'opening', title: 'Opening', body: 'A witnessed pattern.' }],
  systems: ['noesis'],
  error: null,
  saveError: null,
  sourcePayload: null,
  archiveContent: '## Opening\n\nA witnessed pattern.',
  archiveTitle: context.title,
  archiveMode: context.mode,
}

const canonical: ReadingDTO = {
  id: 'reading/canonical-one',
  nodeId: context.nodeId,
  nodeLabel: context.nodeLabel,
  mode: context.mode,
  title: context.title,
  content: complete.archiveContent!,
  createdAt: context.createdAt!,
  favorite: false,
}

function render(result: ThreadResult, entry: ReadingDTO | null = null, bindingTimedOut = false) {
  return renderToStaticMarkup(
    createElement(ReadingTransition, {
      result,
      readingContext: context,
      canonicalEntry: entry,
      bindingTimedOut,
      onRetry: vi.fn(),
      onRetryBinding: vi.fn(),
    }),
  )
}

describe('deriveReadingTransitionPhase', () => {
  it('covers composing, preview binding, canonical, save-failed, and engine-failed states', () => {
    expect(deriveReadingTransitionPhase({ ...complete, status: 'composing' }, null, false)).toBe('composing')
    expect(deriveReadingTransitionPhase(complete, null, false)).toBe('preview')
    expect(deriveReadingTransitionPhase(complete, canonical, false)).toBe('canonical-bound')
    expect(deriveReadingTransitionPhase({ ...complete, saveError: 'D1 unavailable' }, null, false)).toBe('save-failed')
    expect(deriveReadingTransitionPhase({ ...complete, status: 'error', error: 'Engine unavailable' }, null, false)).toBe(
      'engine-failed',
    )
  })
})

describe('ReadingTransition', () => {
  it('announces one concise composing status without making long content live', () => {
    const html = render({ ...complete, status: 'composing', chapters: [] })

    expect(html.match(/role="status"/g)).toHaveLength(1)
    expect(html).toContain('The witness takes the pattern')
    expect(html).not.toContain('aria-live=')
  })

  it('moves from preview to the exact canonical reading deep link', () => {
    const html = render(complete, canonical)

    expect(html).toContain('Reading preview')
    expect(html).toContain('Saved in Folio')
    expect(html).toContain('href="#/readings/reading%2Fcanonical-one"')
    expect(html).toContain('Open reading')
    expect(html).not.toContain('role="log"')
    expect(html).not.toContain('aria-live=')
  })

  it('keeps a labelled embedded ReadingCanvas and recovery when saving fails', () => {
    const html = render({ ...complete, saveError: 'D1 unavailable' })

    expect(html).toContain('aria-label="Embedded reading fallback"')
    expect(html).toContain('data-reading-layer="reading"')
    expect(html).toContain('data-reading-layer="evidence"')
    expect(html).toContain('data-reading-layer="source"')
    expect(html).toContain('Try saving again')
    expect(html).not.toContain('aria-live=')
  })

  it('keeps the same-request retry visible after engine failure', () => {
    const html = render({ ...complete, status: 'error', error: 'Engine unavailable', chapters: [] })

    expect(html).toContain('Engine unavailable')
    expect(html).toContain('Ask the engines again')
    expect(html).toContain('data-reading-transition="engine-failed"')
  })

  it('turns an expired canonical bind into finite explicit recovery', () => {
    const html = render(complete, null, true)

    expect(html).toContain('The reading could not be confirmed in Folio yet')
    expect(html).toContain('Check Folio again')
    expect(html).not.toContain('Binding this telling')
  })
})
