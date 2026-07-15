import { useEffect, useState } from 'react'
import { SPACING } from '../styles/tokens'

export interface NodeGraphGeometry {
  width: number
  height: number
  centerX: number
  centerY: number
  orbitRadius: number
}

/**
 * Tracks the viewport and derives the graph geometry (center + orbit radius).
 * Shared by the home graph and every parent-node page so the radial layout is
 * computed one way everywhere.
 */
export function useNodeGraph(): NodeGraphGeometry {
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 })

  useEffect(() => {
    const update = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

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
