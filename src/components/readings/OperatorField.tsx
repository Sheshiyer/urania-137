import type { ReactNode } from 'react'

export function OperatorField({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="console-card min-w-0 p-4" aria-label={`${title} operator evidence`} data-reading-density="operator">
      <p className="console-eyebrow">Operator evidence</p>
      <h2 className="mt-1 font-serif text-base text-reading-ink">{title}</h2>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  )
}
