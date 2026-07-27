export function SystemStack({ systems, compact = false }: { systems: string[]; compact?: boolean }) {
  if (systems.length === 0) return null
  return (
    <section className={compact ? 'space-y-2' : 'console-card p-4'} aria-labelledby="reading-system-stack-title">
      <h2 id="reading-system-stack-title" className="console-eyebrow">
        System stack
      </h2>
      <ul className="flex flex-wrap gap-2">
        {systems.map((system) => (
          <li key={system} className="glass-pill px-2.5 py-1 font-display text-xs uppercase tracking-[0.16em] text-emerald">
            {system}
          </li>
        ))}
      </ul>
    </section>
  )
}
