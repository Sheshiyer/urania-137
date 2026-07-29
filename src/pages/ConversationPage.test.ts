import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ConversationPage } from './ConversationPage'

describe('ConversationPage SSR', () => {
  it('opens a real witness doorway chooser at the stable route', () => {
    const html = renderToStaticMarkup(
      createElement(ConversationPage, {
        nodeId: null,
        childId: null,
        readingId: null,
        returnTo: '/',
        me: null,
      }),
    )

    expect(html).toContain('data-conversation-route')
    expect(html).toContain('Begin in conversation')
    expect(html).toContain('data-conversation-doorway="true"')
    expect(html).toContain('Integrated Reading')
    expect(html).not.toContain('Birth Blueprint')
  })

  it('mounts the existing ChatSheet and preserves canonical return context', () => {
    const html = renderToStaticMarkup(
      createElement(ConversationPage, {
        nodeId: 'witness',
        childId: 'integrated-reading',
        readingId: 'reading/one',
        returnTo: '/readings/reading%2Fone',
        me: null,
      }),
    )

    expect(html).toContain('data-origin-reading-id="reading/one"')
    expect(html).toContain('data-async-state="loading"')
    expect(html).toContain('Return to Folio')
    expect(html).toContain('aria-label="Conversation"')
    expect(html).not.toContain('Continuing from Folio')
  })
})
