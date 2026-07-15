import { COLORS } from '../../styles/tokens'

interface StellarEdgeProps {
  x1: number
  y1: number
  x2: number
  y2: number
  stroke?: string
  opacity?: number
  width?: number
  dash?: string
  className?: string
  /** Normalizes the line length to 1 so strokeDashoffset can "draw" it 0→1. */
  pathLength?: number
}

/**
 * A single luminous edge between two points. Used for the core→node spines,
 * the inter-node constellation links, and satellite branches.
 */
export function StellarEdge({
  x1,
  y1,
  x2,
  y2,
  stroke = COLORS.gold,
  opacity = 0.25,
  width = 1,
  dash,
  className,
  pathLength,
}: StellarEdgeProps) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={stroke}
      strokeOpacity={opacity}
      strokeWidth={width}
      strokeDasharray={dash}
      className={className}
      pathLength={pathLength}
    />
  )
}
