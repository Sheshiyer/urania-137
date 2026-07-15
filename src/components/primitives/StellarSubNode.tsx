import { COLORS } from '../../styles/tokens'

interface StellarSubNodeProps {
  /** Parent orbital position. */
  parentX: number
  parentY: number
  /** Absolute branch angle in radians. */
  angle: number
  radius: number
  active?: boolean
  /** Extra class (motion targeting, e.g. cn-sat). */
  className?: string
}

/**
 * A small satellite node with its branch line, hung off a parent orbital.
 * Reproduces the home graph's decorative sub-node dots.
 */
export function StellarSubNode({ parentX, parentY, angle, radius, active = false, className }: StellarSubNodeProps) {
  const sx = parentX + radius * Math.cos(angle)
  const sy = parentY + radius * Math.sin(angle)
  return (
    <g className={className}>
      <line
        x1={parentX}
        y1={parentY}
        x2={sx}
        y2={sy}
        stroke={COLORS.gold}
        strokeOpacity={active ? 0.5 : 0.22}
        strokeWidth={0.75}
      />
      <circle
        cx={sx}
        cy={sy}
        r={active ? 3.5 : 2.5}
        fill={COLORS.gold}
        fillOpacity={active ? 0.85 : 0.55}
      />
    </g>
  )
}
