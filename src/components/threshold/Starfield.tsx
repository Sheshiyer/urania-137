import { useEffect, useRef } from 'react'

/**
 * Threshold ambient starfield (W2-A) — a faithful port of the POC's canvas
 * field (`prototypes/threshold.html`): breathing dust with depth-based scroll
 * parallax, plus the scene-boundary de-focus effect (the field blurs/scales
 * as the scroll position crosses a scene edge, and clears again approaching
 * the Crossing). Honors `prefers-reduced-motion` with a static field.
 *
 * The canvas is fixed behind the scenes (z-0, pointer-events none); the page
 * owns all scroll math above it.
 */

interface Star {
  x: number
  y: number
  r: number
  depth: number // 0.25 far … 1 near
  phase: number
  amp: number
  tint: number
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

function starColor(tint: number, alpha: number): string {
  // mostly parchment-white, some silver, a few gold
  if (tint > 0.93) return `rgba(197,160,23,${alpha})`
  if (tint > 0.72) return `rgba(138,155,168,${alpha * 0.85})`
  return `rgba(240,237,227,${alpha})`
}

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let stars: Star[] = []
    let w = 0
    let h = 0
    let raf = 0
    let alive = true

    const sizeField = () => {
      const scale = window.devicePixelRatio > 1 ? 1.5 : 1
      w = canvas.width = window.innerWidth * scale
      h = canvas.height = window.innerHeight * scale
      stars = []
      const n = Math.round((w * h) / 9000)
      for (let i = 0; i < n; i++) {
        const depth = 0.25 + Math.random() * 0.75
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: (0.4 + Math.random() * 1.3) * depth,
          depth,
          phase: Math.random() * Math.PI * 2,
          amp: 1.5 + Math.random() * 3.5,
          tint: Math.random(),
        })
      }
    }
    sizeField()
    window.addEventListener('resize', sizeField)

    const t0 = performance.now()
    const draw = (now: number) => {
      if (!alive) return
      const t = (now - t0) / 1000
      const sy = window.scrollY
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        const breathe = reduced ? 0 : Math.sin(0.5 * t + s.phase) * s.amp
        const jitter = reduced ? 0 : Math.sin(1.7 * t + s.phase * 3) * 0.4
        const x = s.x + breathe * 0.6 + jitter
        let y = (s.y - sy * (1 - s.depth) * 0.35 * (canvas.height / window.innerHeight)) % h
        if (y < 0) y += h
        const tw = reduced ? 0.6 : 0.45 + 0.35 * Math.sin(0.8 * t + s.phase * 2)
        ctx.beginPath()
        ctx.arc(x, y + breathe, s.r, 0, Math.PI * 2)
        ctx.fillStyle = starColor(s.tint, clamp(tw, 0.08, 0.85))
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    // Scene-boundary de-focus — blur + scale peaking at scene edges, clear at
    // the arrival and again approaching the Crossing track.
    const updateFX = () => {
      const vh = window.innerHeight
      const p = window.scrollY / vh
      const crossingTop = document.getElementById('crossing-track')?.offsetTop ?? Infinity
      if (window.scrollY >= crossingTop - vh * 0.5) {
        canvas.style.filter = 'blur(0px)'
        canvas.style.transform = 'scale(1)'
        return
      }
      const d = Math.abs(p - Math.round(p)) // 0 at a boundary, 0.5 mid-scene
      let f = clamp(1 - d / 0.24, 0, 1) // peaks at boundaries
      if (p < 0.3) f = 0 // arrival starts clear
      if (reduced) f = 0
      canvas.style.filter = `blur(${Math.round(f * 14)}px)`
      canvas.style.transform = `scale(${1 + f * 0.14})`
    }
    window.addEventListener('scroll', updateFX, { passive: true })
    updateFX()

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', sizeField)
      window.removeEventListener('scroll', updateFX)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full will-change-[filter,transform]"
    />
  )
}
