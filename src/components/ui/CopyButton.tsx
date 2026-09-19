import { useCallback, useRef, useState } from 'react'

type CopyState = 'idle' | 'copying' | 'ok' | 'err'

export function CopyButton({
  value,
  label = 'Copy',
  className = '',
}: {
  value: string | (() => Promise<string>)
  label?: string
  className?: string
}) {
  const [state, setState] = useState<CopyState>('idle')
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(async () => {
    if (state === 'copying') return
    setState('copying')
    try {
      const text = typeof value === 'function' ? await value() : value
      await navigator.clipboard.writeText(text)
      setState('ok')
    } catch {
      setState('err')
    }
    if (resetRef.current) clearTimeout(resetRef.current)
    resetRef.current = setTimeout(() => setState('idle'), 1600)
  }, [value, state])

  const stateLabel =
    state === 'copying' ? 'Copying…'
    : state === 'ok' ? 'Copied'
    : state === 'err' ? 'Failed'
    : label

  return (
    <button
      type="button"
      onClick={() => void copy()}
      disabled={state === 'copying'}
      className={`inline-flex min-h-11 min-w-11 items-center gap-2 font-display text-xs uppercase tracking-[0.18em] transition-colors ${
        state === 'ok'
          ? 'text-gold'
          : state === 'err'
            ? 'text-red-400'
            : 'text-silver hover:text-parchment'
      } ${className}`}
      aria-live="polite"
    >
      <span
        className={`h-1.5 w-1.5 rotate-45 border transition-colors ${
          state === 'ok' ? 'border-gold bg-gold' : state === 'err' ? 'border-red-400' : 'border-gold/40'
        }`}
        aria-hidden="true"
      />
      {stateLabel}
    </button>
  )
}
