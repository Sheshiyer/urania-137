import {
  Children,
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AsyncBoundary } from './AsyncBoundary'

describe('AsyncBoundary', () => {
  it('renders ready children without a status shell', () => {
    const html = renderToStaticMarkup(
      createElement(AsyncBoundary, {
        state: { status: 'ready' },
        children: createElement('p', null, 'ready body'),
      }),
    )

    expect(html).toContain('ready body')
    expect(html).not.toContain('data-async-state=')
  })

  it.each([
    ['loading', 'Loading', '✦'],
    ['empty', 'Nothing recorded', '◇'],
    ['partial', 'Partial record', '◐'],
    ['stale', 'Earlier copy', '↺'],
    ['denied', 'Access unavailable', '⊘'],
    ['error', 'Unable to load', '!'],
  ] as const)('renders one exclusive %s state', (status, label, icon) => {
    const html = renderToStaticMarkup(
      createElement(AsyncBoundary, {
        state: { status, message: `${status} message` },
        children: createElement('p', null, 'ready body'),
      }),
    )

    expect(html).toContain(`data-async-state="${status}"`)
    expect(html).toContain(`data-async-icon="${status}"`)
    expect(html).toContain(label)
    expect(html).toContain(icon)
    expect(html).toContain(`${status} message`)
    expect(html).not.toContain('ready body')

    if (status === 'error') {
      expect(html).toContain('role="alert"')
      expect(html).toContain('aria-live="assertive"')
    } else {
      expect(html).toContain('role="status"')
      expect(html).toContain('aria-live="polite"')
    }

    if (status === 'loading') expect(html).toContain('aria-busy="true"')
    else expect(html).not.toContain('aria-busy=')
    expect(html).not.toContain('<button')
  })

  it('offers one finite retry only for a recoverable error', () => {
    let retries = 0
    const onRetry = () => {
      retries += 1
    }
    const html = renderToStaticMarkup(
      createElement(AsyncBoundary, {
        state: { status: 'error', message: 'error message', onRetry },
        children: createElement('p', null, 'ready body'),
      }),
    )

    expect(html).toContain('role="alert"')
    expect(html).toContain('Try again')
    expect(html.match(/<button/g)).toHaveLength(1)

    const tree = AsyncBoundary({
      state: { status: 'error', message: 'error message', onRetry },
      children: createElement('p', null, 'ready body'),
    }) as ReactElement<{ children: ReactNode }>
    const button = Children.toArray(tree.props.children).find(
      (child) => isValidElement(child) && child.type === 'button',
    ) as ReactElement<{ onClick: () => void }>
    button.props.onClick()
    expect(retries).toBe(1)
  })
})
