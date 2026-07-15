import { COLORS } from '../../styles/tokens'

interface CompassStarProps {
  cx: number
  cy: number
  size: number
  opacity?: number
}

/**
 * A four-point compass star inside a thin ring — the ornament that sits at the
 * mid-edges and at symmetric inner points of the reference pages.
 */
export function CompassStar({ cx, cy, size, opacity = 0.7 }: CompassStarProps) {
  const p = size
  const w = size * 0.14
  // Primary N/S/E/W star.
  const star = `M ${cx} ${cy - p} L ${cx + w} ${cy - w} L ${cx + p} ${cy} L ${cx + w} ${cy + w} L ${cx} ${cy + p} L ${cx - w} ${cy + w} L ${cx - p} ${cy} L ${cx - w} ${cy - w} Z`
  // Shorter diagonal star for an eight-point burst.
  const d = p * 0.5
  const dw = w * 0.7
  const diag = `M ${cx + d} ${cy - d} L ${cx + dw} ${cy - dw} L ${cx + d} ${cy + d} L ${cx + dw} ${cy + dw} L ${cx - d} ${cy + d} L ${cx - dw} ${cy + dw} L ${cx - d} ${cy - d} L ${cx - dw} ${cy - dw} Z`

  return (
    <g opacity={opacity} aria-hidden="true">
      <circle cx={cx} cy={cy} r={p * 0.95} fill="none" stroke={COLORS.gold} strokeOpacity={0.35} strokeWidth={0.5} />
      <path d={diag} fill={COLORS.gold} fillOpacity={0.4} />
      <path d={star} fill={COLORS.gold} fillOpacity={0.85} filter="url(#glow)" />
      <circle cx={cx} cy={cy} r={1.4} fill="#fff" />
    </g>
  )
}
