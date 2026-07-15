import { COLORS } from '../../styles/tokens'
import { wrapLabel } from '../../lib/graphUtils'

interface StellarNodeProps {
  x: number
  y: number
  /** Graph centerY — decides whether a plain node's label sits above or below. */
  centerY: number
  label: string
  selected?: boolean
  onClick?: () => void
  ariaLabel?: string
  /** 'plain' = home node (label below). 'orb' = ornate parent-page child (label inside). */
  variant?: 'plain' | 'orb'
  /** Orb radius (orb variant only); scales with the viewport. */
  radius?: number
  /** Direction pointing away from the hub, in radians (orb satellites hang outward). */
  outwardAngle?: number
  /** Extra class (motion targeting, e.g. cn-node / cn-orb). */
  className?: string
}

/** Home node: concentric rings, glowing core, label below. Unchanged baseline. */
function PlainNode({ x, y, centerY, label, selected, onClick, ariaLabel, className }: StellarNodeProps) {
  const color = selected ? COLORS.gold : COLORS.silver
  return (
    <g
      className={[onClick ? 'cursor-pointer' : '', className ?? ''].join(' ').trim() || undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={ariaLabel ?? label}
    >
      <circle cx={x} cy={y} r={selected ? 32 : 22} fill="none" stroke={color} strokeOpacity={selected ? 0.25 : 0.12} strokeWidth={1} className="transition-all duration-300" />
      <circle cx={x} cy={y} r={selected ? 16 : 10} fill={COLORS.void} stroke={color} strokeWidth={selected ? 2.5 : 1.5} filter={selected ? 'url(#glow)' : undefined} className="transition-all duration-300" />
      <circle cx={x} cy={y} r={selected ? 7 : 4.5} fill={selected ? COLORS.gold : COLORS.parchment} fillOpacity={selected ? 1 : 0.6} className="transition-all duration-300" />
      <text
        x={x}
        y={y + (y > centerY ? 42 : -34)}
        textAnchor="middle"
        fill={selected ? COLORS.parchment : COLORS.silver}
        fontSize={selected ? 14 : 12}
        fontWeight={selected ? 600 : 500}
        letterSpacing="0.14em"
        className="uppercase transition-all duration-300 font-display"
      >
        {label}
      </text>
    </g>
  )
}

/** Ornate parent-page child: a luminous ringed orb with the label set inside it. */
function OrbNode({ x, y, label, selected, onClick, ariaLabel, radius = 46, outwardAngle = 0, className }: StellarNodeProps) {
  const r = selected ? radius * 1.07 : radius
  const lines = wrapLabel(label, 11, 3)
  const fontSize = lines.length >= 3 ? 8 : lines.length === 2 ? 9 : 10.5
  const lineHeight = fontSize + 3
  const startY = y - ((lines.length - 1) * lineHeight) / 2

  // A few satellite dots trailing outward from the orb (kept sparse and clean).
  const sats = [0.28, 0.52].map((f, i) => ({
    cx: x + (r + r * f + 9) * Math.cos(outwardAngle),
    cy: y + (r + r * f + 9) * Math.sin(outwardAngle),
    rr: 1.8 - i * 0.8,
  }))

  return (
    <g
      className={['group', onClick ? 'cursor-pointer' : '', className ?? ''].join(' ').trim() || undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={ariaLabel ?? label}
    >
      {/* soft outer bloom */}
      <circle cx={x} cy={y} r={r + 12} fill="url(#orbGlow)" opacity={selected ? 1 : 0.55} className="transition-opacity duration-300 group-hover:opacity-90" />

      {/* satellites */}
      {sats.map((s, i) => (
        <circle key={`sat-${i}`} cx={s.cx} cy={s.cy} r={Math.max(s.rr, 0.7)} fill={COLORS.gold} fillOpacity={0.6} />
      ))}

      {/* orb body: filled void so spokes/stars don't show through */}
      <circle cx={x} cy={y} r={r} fill={COLORS.void} fillOpacity={0.78} />
      <circle cx={x} cy={y} r={r - 1} fill="url(#orbGlow)" opacity={selected ? 0.45 : 0.22} />

      {/* faint outer + bright main + faint inner ring (the reference's clean double ring) */}
      <circle cx={x} cy={y} r={r + 3.5} fill="none" stroke={COLORS.gold} strokeOpacity={selected ? 0.4 : 0.16} strokeWidth={0.6} />
      <circle cx={x} cy={y} r={r} fill="none" stroke={COLORS.gold} strokeOpacity={selected ? 1 : 0.92} strokeWidth={selected ? 2.2 : 1.5} filter="url(#glow)" className="transition-all duration-300" />
      <circle cx={x} cy={y} r={r - 4.5} fill="none" stroke={COLORS.gold} strokeOpacity={selected ? 0.5 : 0.3} strokeWidth={0.6} />

      {/* label inside */}
      <text
        textAnchor="middle"
        className="uppercase font-display pointer-events-none"
        fill={selected ? '#fff' : COLORS.parchment}
        fontSize={fontSize}
        fontWeight={600}
        letterSpacing="0.12em"
      >
        {lines.map((ln, i) => (
          <tspan key={i} x={x} y={startY + i * lineHeight}>
            {ln}
          </tspan>
        ))}
      </text>
    </g>
  )
}

export function StellarNode(props: StellarNodeProps) {
  return props.variant === 'orb' ? <OrbNode {...props} /> : <PlainNode {...props} />
}
