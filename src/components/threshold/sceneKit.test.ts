import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SplitText } from './sceneKit'

describe('SplitText accessibility', () => {
  it('exposes one semantic text copy without an aria-label on a generic span', () => {
    const html = renderToStaticMarkup(
      createElement(SplitText, {
        parts: [{ t: 'You found ' }, { t: 'the Threshold.', gold: true }],
        per: 'word',
        show: true,
      }),
    )

    expect(html).not.toContain('aria-label=')
    expect(html).toContain('class="sr-only"')
    expect(html).toContain('aria-hidden="true"')
  })
})
