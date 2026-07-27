export function ResultOrientation({
  visual,
  nonVisual,
}: {
  visual: string
  nonVisual: string
}) {
  return (
    <aside className="border-l-2 border-gold/25 pl-3 text-xs leading-relaxed text-reading-muted">
      <p><span className="text-reading-ink">Visual orientation:</span> {visual}</p>
      <p className="mt-1"><span className="text-reading-ink">Written equivalent:</span> {nonVisual}</p>
    </aside>
  )
}
