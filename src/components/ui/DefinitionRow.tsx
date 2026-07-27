export function DefinitionRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className="font-display text-xs uppercase tracking-[0.22em] text-metadata">{label}</dt>
      <dd className={`min-w-0 truncate text-sm text-parchment ${mono ? 'font-mono text-xs' : 'font-serif'}`}>
        {value}
      </dd>
    </div>
  )
}
