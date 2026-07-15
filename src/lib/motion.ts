import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

/** Idempotent plugin registration. */
export function registerGsap() {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger)
    registered = true
    if (import.meta.env.DEV) {
      ;(window as unknown as { ScrollTrigger?: typeof ScrollTrigger }).ScrollTrigger = ScrollTrigger
    }
  }
}

/** True when the user asked the OS to reduce motion — we then skip all animation. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Shared easing + timing tokens so home and node pages feel identical. */
export const EASE = {
  out: 'power3.out',
  inOut: 'power2.inOut',
  none: 'none',
} as const

export const MOTION = {
  /** Total scroll distance (as a CSS height) that the immersive scrub spans. */
  scrollSpan: '180vh',
  /** Camera zoom reached at max scroll. */
  scrubScale: 1.12,
  /** Degrees of drift at max scroll. */
  scrubRotate: 2,
  /** Starfield parallax at max scroll (percent of its own box). */
  starsParallax: -8,
  /** Pointer-parallax travel in px for the near (mandala) and far (stars) layers. */
  pointerNear: 10,
  pointerFar: 22,
} as const

export { gsap, ScrollTrigger }
