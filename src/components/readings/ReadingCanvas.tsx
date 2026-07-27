import type { CSSProperties, ReactNode } from 'react'

export type ReadingDensity = 'thread' | 'reading' | 'folio' | 'compare' | 'operator'

export function ReadingCanvas({
  density,
  children,
}: {
  density: ReadingDensity
  children?: ReactNode
}) {
  return (
    <div
      className="reading-canvas mx-auto w-full min-w-0"
      data-reading-density={density}
      style={{ '--reading-measure': '70ch' } as CSSProperties}
    >
      {children}
    </div>
  )
}
