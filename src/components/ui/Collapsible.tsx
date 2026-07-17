import { ReactNode, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface CollapsibleProps {
  title: string
  children: ReactNode
  /** Open on first render. */
  defaultOpen?: boolean
  /** Small right-aligned hint shown in the header (e.g. a count or status). */
  badge?: ReactNode
}

/**
 * An accordion section — a titled header that toggles its body. Keeps long
 * modals (the report form, the engine roster) from spanning out; advanced or
 * secondary content collapses so the essentials read on any screen.
 */
export function Collapsible({ title, children, defaultOpen = false, badge }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-2xl border border-gold/10 bg-void/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-gold/5"
      >
        <span className="font-display text-xs uppercase tracking-widest text-gold">{title}</span>
        <span className="flex items-center gap-2 text-silver">
          {badge && <span className="text-[11px] normal-case tracking-normal text-silver/70">{badge}</span>}
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </div>
  )
}
