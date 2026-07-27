import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SELEMENE_NODES } from '../../data/selemeneNodes'
import { BeginReadingDialog } from './BeginReadingDialog'

describe('BeginReadingDialog', () => {
  it('groups every real runnable child once beneath its parent lens', () => {
    const html = renderToStaticMarkup(
      createElement(BeginReadingDialog, {
        open: true,
        onClose: () => undefined,
      }),
    )
    const runnableParents = SELEMENE_NODES
      .map((node) => ({
        ...node,
        runnableChildren: (node.children ?? []).filter((child) => child.run),
      }))
      .filter((node) => node.runnableChildren.length > 0)
    const runnableChildren = runnableParents.flatMap((node) =>
      node.runnableChildren.map((child) => ({ node, child })),
    )

    expect(html.match(/data-parent-lens=/g)).toHaveLength(runnableParents.length)
    expect(html.match(/data-reading-doorway=/g)).toHaveLength(runnableChildren.length)

    for (const { node, child } of runnableChildren) {
      const href = `#/node/${encodeURIComponent(node.id)}/${encodeURIComponent(child.id)}`
      expect(html.split(`href="${href}"`)).toHaveLength(2)
    }
  })

  it('never promotes reference-only children into runnable doorways', () => {
    const html = renderToStaticMarkup(
      createElement(BeginReadingDialog, {
        open: true,
        onClose: () => undefined,
      }),
    )
    const referenceOnly = SELEMENE_NODES.flatMap((node) =>
      (node.children ?? []).filter((child) => !child.run).map((child) => `${node.id}:${child.id}`),
    )

    for (const key of referenceOnly) {
      expect(html).not.toContain(`data-reading-doorway="${key}"`)
    }
  })
})
