import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { navigate, type AppPath } from '../../hooks/useHashRoute'
import {
  buildPaletteIndex,
  filterPaletteItems,
  type PaletteItem,
} from '../../lib/paletteIndex'
import { pushRecent, getRecentsSnapshot, subscribeRecents } from '../../lib/recents'
import { useSyncExternalStore } from 'react'

const GROUP_ORDER = ['actions', 'navigate', 'doorways'] as const
const GROUP_LABELS: Record<string, string> = {
  actions: 'Actions',
  navigate: 'Stellar nodes',
  doorways: 'Doorways',
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const allItems = useMemo(() => buildPaletteIndex(), [])
  const recents = useSyncExternalStore(subscribeRecents, getRecentsSnapshot, () => [])

  const filtered = useMemo(() => filterPaletteItems(allItems, query), [allItems, query])

  const grouped = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: PaletteItem[] }> = []
    for (const g of GROUP_ORDER) {
      const items = filtered.filter((i) => i.group === g)
      if (items.length > 0) groups.push({ key: g, label: GROUP_LABELS[g], items })
    }
    return groups
  }, [filtered])

  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  const select = useCallback(
    (item: PaletteItem) => {
      const path = item.onSelect()
      pushRecent(path, item.label)
      onClose()
      navigate(path)
    },
    [onClose],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = flatItems[activeIdx]
        if (item) select(item)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [activeIdx, flatItems, onClose, select],
  )

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]')
    if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  if (!open) return null

  let runningIdx = 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
      role="presentation"
    >
      <div className="absolute inset-0 bg-void/70 backdrop-blur-sm" aria-hidden="true" />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-card border border-gold/20 bg-surface shadow-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 border-b border-gold/15 px-4 py-3">
          <span className="font-display text-xs text-silver" aria-hidden="true">
            /
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search stellar nodes…"
            aria-label="Search stellar nodes"
            className="min-h-11 min-w-11 flex-1 bg-transparent font-body text-body text-parchment placeholder:text-silver/50 focus:outline-none"
          />
          <kbd className="hidden rounded-sm border border-gold/20 px-1.5 py-0.5 font-mono text-meta text-silver sm:inline">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2" role="listbox">
          {!query && recents.length > 0 && (
            <div className="px-3 pb-1">
              <div className="font-display text-meta uppercase tracking-[0.2em] text-metadata">
                Recent
              </div>
              {recents.map((r) => {
                const item = flatItems.find((f) => f.onSelect() === r.path)
                return (
                  <button
                    key={r.path}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onClose()
                      navigate(r.path as AppPath)
                    }}
                    className="flex w-full items-center gap-3 rounded-tile px-3 py-2 text-left text-small text-silver transition-colors hover:bg-gold/10 hover:text-parchment"
                  >
                    <span className="h-1 w-1 rotate-45 border border-gold/40" aria-hidden="true" />
                    {r.label}
                    {item?.parentLabel && (
                      <span className="text-meta text-metadata">{item.parentLabel}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.key} className="px-3 pb-1 pt-2">
              <div className="font-display text-meta uppercase tracking-[0.2em] text-metadata">
                {group.label}
              </div>
              {group.items.map((item) => {
                const idx = runningIdx++
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={idx === activeIdx}
                    data-active={idx === activeIdx}
                    onClick={() => select(item)}
                    className={`flex w-full items-center gap-3 rounded-tile px-3 py-2 text-left text-small transition-colors ${
                      idx === activeIdx
                        ? 'bg-gold/15 text-parchment'
                        : 'text-silver hover:bg-gold/10 hover:text-parchment'
                    }`}
                  >
                    <span className="h-1 w-1 rotate-45 border border-gold/40" aria-hidden="true" />
                    {item.label}
                    {item.parentLabel && (
                      <span className="text-meta text-metadata">{item.parentLabel}</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}

          {flatItems.length === 0 && (
            <p className="px-4 py-6 text-center text-small text-silver">
              Nothing on the map for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
