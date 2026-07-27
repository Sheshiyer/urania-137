import { useEffect, useState, type RefObject } from 'react'
import { SPACING } from '../styles/tokens'

export interface NodeGraphGeometry {
  width: number
  height: number
  centerX: number
  centerY: number
  orbitRadius: number
}

/**
 * Tracks the graph's actual layout field and derives its geometry. The graph
 * used to read `window.innerHeight`, which made an in-flow app header invisible
 * to its coordinate system and pushed labels beneath adjacent chrome.
 */
export function useNodeGraph(containerRef?: RefObject<HTMLElement | null>): NodeGraphGeometry {
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 })

  useEffect(() => {
    const update = () => {
      const bounds = containerRef?.current?.getBoundingClientRect()
      setDimensions({
        width: Math.max(bounds?.width ?? window.innerWidth, 1),
        height: Math.max(bounds?.height ?? window.innerHeight, 1),
      })
    }
    update()
    const target = containerRef?.current
    const observer = target && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(update)
      : null
    if (target && observer) observer.observe(target)
    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [containerRef])

  const { width, height } = dimensions
  return {
    width,
    height,
    centerX: width / 2,
    centerY: height / 2,
    orbitRadius: Math.min(width, height) * SPACING.orbitRatio,
  }
}

export const toRad = (deg: number) => (deg * Math.PI) / 180
