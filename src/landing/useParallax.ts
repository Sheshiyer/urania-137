import { useEffect, type RefObject } from 'react'

export function useParallax(
  sectionRef: RefObject<HTMLElement | null>,
  layerRef: RefObject<HTMLElement | null>,
  factor: number,
) {
  useEffect(() => {
    const section = sectionRef.current
    const layer = layerRef.current
    if (!section || !layer) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const update = () => {
      frame = 0
      const rect = section.getBoundingClientRect()
      const progress = 1 - rect.bottom / (window.innerHeight + rect.height)
      const offset = Math.max(0, Math.min(1, progress)) * factor
      layer.style.transform = `translate3d(0, ${offset}px, 0)`
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [sectionRef, layerRef, factor])
}
