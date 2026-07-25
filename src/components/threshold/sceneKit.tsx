import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Threshold scene-animation kit (W2-A) — the POC's text grammar ported to
 * components (`prototypes/threshold.html`):
 *
 *   Scene      — a 100vh section that reports visibility (IntersectionObserver,
 *                ratio ≥ 0.15) to its children via render prop.
 *   SplitText  — char/word blur-stagger reveal (opacity + blur + translateY,
 *                per-segment transition delay), the POC's `data-split` effect.
 *   Fade       — block-level fade/rise, the POC's `data-fade` effect.
 *
 * All three collapse to fully-visible static content under
 * `prefers-reduced-motion` — the reduced path is completable with keyboard
 * only, no animation gating comprehension.
 */

export const REDUCED_MOTION = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

// ---------------------------------------------------------------------------
// Scene — visibility provider
// ---------------------------------------------------------------------------

export interface SceneProps {
  id: string
  children: (show: boolean) => ReactNode
  className?: string
  ariaLabel?: string
}

export function Scene({ id, children, className, ariaLabel }: SceneProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (REDUCED_MOTION()) {
      setShow(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => setShow(entries[0].intersectionRatio >= 0.15),
      { threshold: [0, 0.15, 1] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section
      id={id}
      ref={ref}
      aria-label={ariaLabel}
      className={
        className ??
        'relative z-10 flex h-screen w-full flex-col items-center justify-center px-6 text-center'
      }
    >
      {children(show)}
    </section>
  )
}

// ---------------------------------------------------------------------------
// SplitText — char/word blur-stagger
// ---------------------------------------------------------------------------

export interface SplitPart {
  t: string
  gold?: boolean
}

export interface SplitTextProps {
  parts: SplitPart[]
  per: 'char' | 'word'
  show: boolean
  /** Seconds before the first segment animates (POC `data-delay`). */
  delay?: number
  className?: string
}

export function SplitText({ parts, per, show, delay = 0, className }: SplitTextProps) {
  if (REDUCED_MOTION()) {
    return (
      <span className={className}>
        {parts.map((p, i) => (
          <span key={i} className={p.gold ? 'text-gold' : undefined}>
            {p.t}
          </span>
        ))}
      </span>
    )
  }

  const fullText = parts.map((p) => p.t).join('')
  const segments: { ch: string; gold: boolean }[] = []
  for (const part of parts) {
    const pieces = per === 'char' ? part.t.split('') : part.t.split(/(\s+)/).filter((s) => s.length > 0)
    for (const piece of pieces) {
      if (per === 'word' && /^\s+$/.test(piece)) {
        segments.push({ ch: piece, gold: false }) // whitespace renders unanimated
      } else {
        segments.push({ ch: piece, gold: !!part.gold })
      }
    }
  }

  const hidden = { opacity: 0, filter: 'blur(10px) brightness(0%)', transform: 'translateY(20px)' } as const
  const shown = { opacity: 1, filter: 'blur(0px) brightness(100%)', transform: 'translateY(0)' } as const

  return (
    <span className={className} aria-label={fullText}>
      {segments.map((seg, i) => {
        if (per === 'word' && /^\s+$/.test(seg.ch)) return <span key={i}>{seg.ch}</span>
        const state = show ? shown : hidden
        return (
          <span
            key={i}
            aria-hidden="true"
            className="inline-block will-change-[transform,opacity,filter]"
            style={{
              ...state,
              color: seg.gold ? '#C5A017' : undefined,
              transition: `opacity ${show ? 0.4 : 0.3}s ${EASE}, filter ${show ? 0.4 : 0.3}s ${EASE}, transform ${show ? 0.4 : 0.3}s ${EASE}`,
              transitionDelay: `${(delay + i * 0.015) * 1000}ms`,
              whiteSpace: seg.ch === ' ' ? 'pre' : undefined,
            }}
          >
            {seg.ch === ' ' ? ' ' : seg.ch}
          </span>
        )
      })}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Fade — block-level fade/rise
// ---------------------------------------------------------------------------

export interface FadeProps {
  show: boolean
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Fade({ show, children, className, style }: FadeProps) {
  const reduced = REDUCED_MOTION()
  const visible = reduced || show
  return (
    <div
      className={className}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: reduced ? 'none' : `opacity ${show ? 0.9 : 0.7}s ${EASE}, transform ${show ? 0.9 : 0.7}s ${EASE}`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}
