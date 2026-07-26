import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { InstrumentDialog } from './InstrumentDialog'

describe('InstrumentDialog', () => {
  it('renders an open dialog with its title and description wired to accessible names', () => {
    const html = renderToStaticMarkup(
      createElement(
        InstrumentDialog,
        {
          open: true,
          title: 'Celestial instrument',
          description: 'A focused reading surface.',
          onClose: () => undefined,
        },
        createElement('button', null, 'Continue'),
      ),
    )

    const titleId = html.match(/aria-labelledby="([^"]+)"/)?.[1]
    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1]

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(titleId).toBeTruthy()
    expect(descriptionId).toBeTruthy()
    expect(html).toContain(`id="${titleId}"`)
    expect(html).toContain(`id="${descriptionId}"`)
    expect(html).toContain('Celestial instrument')
    expect(html).toContain('A focused reading surface.')
  })

  it('renders a semantic close control and omits a closed dialog', () => {
    const openHtml = renderToStaticMarkup(
      createElement(InstrumentDialog, {
        open: true,
        title: 'Reading',
        onClose: () => undefined,
      }),
    )
    const closedHtml = renderToStaticMarkup(
      createElement(InstrumentDialog, {
        open: false,
        title: 'Reading',
        onClose: () => undefined,
      }),
    )

    expect(openHtml).toMatch(/<button[^>]*type="button"[^>]*aria-label="Close Reading"/)
    expect(closedHtml).toBe('')
  })
})
