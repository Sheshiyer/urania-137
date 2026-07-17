import { COLORS } from '../../styles/tokens'
import { wrapLabel } from '../../lib/graphUtils'
import { Glyph } from './Glyph'

interface StellarNodeProps {
  x: number
  y: number
  /** Graph centerY — decides whether a label sits above or below the node. */
  centerY: number
  label: string
  selected?: boolean
  onClick?: () => void
  ariaLabel?: string
  /** 'plain' = legacy home node. 'orb' = node-page child (label inside). 'planet' = home parent (label outside + mini-system). */
  variant?: 'plain' | 'orb' | 'planet'
  /** Orb/planet radius; scales with the viewport. */
  radius?: number
  /** Direction pointing away from the hub, in radians (satellites hang outward). */
  outwardAngle?: number
  /** Optional sacred-geometry glyph drawn in the orb. */
  glyph?: string
  /** Decorative satellite count for the planet mini-system. */
  subCount?: number
  /** Scales label typography down on small viewports. */
  labelScale?: number
  /** Viewport width — clamps outside labels so they can't run off the edge. */
  boundsWidth?: number
  /** Extra class (motion targeting, e.g. cn-node / cn-orb). */
  className?: string
}

/**
 * Advance width per character as a fraction of the font size, for Panchang
 * uppercase at our tracking. Used to fit labels to the geometry — SVG can't
 * measure text before layout, so we estimate and size from that.
 *
 * Measured off the render rather than guessed: "ARCHIVE" (7 chars at 9.6px)
 * lays out ~75px wide → ~1.12em per char at 0.16em tracking. Under-estimating
 * this silently defeats the clamp and lets labels run off the edge.
 */
const CHAR_W = 1.12
/** Same, at the orbs' tighter 0.12em tracking. */
const ORB_CHAR_W = 1.08

/** Home node: concentric rings, glowing core, label below. Legacy baseline. */
function PlainNode({ x, y, centerY, label, selected, onClick, ariaLabel, className }: StellarNodeProps) {
  const color = selected ? COLORS.gold : COLORS.silver
  return (
    <g
      className={[onClick ? 'cursor-pointer' : '', className ?? ''].join(' ').trim() || undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={ariaLabel ?? label}
    >
      {onClick && <circle cx={x} cy={y} r={30} fill="transparent" />}
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

/**
 * Home parent: a luminous ringed "planet" with its own small orbital system and
 * the label set outside — matching the galactic home view in the moodboard.
 */
function PlanetNode({ x, y, centerY, label, selected, onClick, ariaLabel, radius = 30, outwardAngle = 0, subCount = 3, labelScale = 1, boundsWidth, className }: StellarNodeProps) {
  const r = selected ? radius * 1.08 : radius
  const below = y > centerY
  const sats = Array.from({ length: Math.min(Math.max(subCount, 2), 5) }).map((_, i, arr) => {
    const spread = 0.7
    const a = outwardAngle + (i - (arr.length - 1) / 2) * spread
    const rr = r + 12
    return { cx: x + rr * Math.cos(a), cy: y + rr * Math.sin(a) }
  })

  // Narrow screens: wrap to two lines so a long name neither runs off the edge
  // nor collides with the neighbouring node's label, then clamp the block inside
  // the viewport so it can never clip regardless of where the node sits.
  const fontSize = (selected ? 13 : 12) * labelScale
  const lines = labelScale < 1 ? wrapLabel(label, 9, 2) : [label]
  const halfW = (Math.max(...lines.map((l) => l.length)) * fontSize * CHAR_W) / 2
  const labelX = boundsWidth ? Math.min(Math.max(x, halfW + 4), boundsWidth - halfW - 4) : x
  const lineHeight = fontSize + 3
  const firstLineY = below ? y + r + 20 : y - (r + 12) - (lines.length - 1) * lineHeight

  return (
    <g
      className={['group', onClick ? 'cursor-pointer' : '', className ?? ''].join(' ').trim() || undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={ariaLabel ?? label}
    >
      {/* hit target */}
      {onClick && <circle cx={x} cy={y} r={r + 16} fill="transparent" />}

      {/* soft bloom */}
      <circle cx={x} cy={y} r={r + 10} fill="url(#orbGlow)" opacity={selected ? 0.95 : 0.5} className="transition-opacity duration-300 group-hover:opacity-90" />

      {/* mini orbital system */}
      <circle cx={x} cy={y} r={r + 7} fill="none" stroke={COLORS.gold} strokeOpacity={selected ? 0.4 : 0.2} strokeWidth={0.5} strokeDasharray="2 5" />
      {sats.map((s, i) => (
        <circle key={`psat-${i}`} cx={s.cx} cy={s.cy} r={1.5} fill={COLORS.gold} fillOpacity={0.7} />
      ))}

      {/* planet body */}
      <circle cx={x} cy={y} r={r} fill={COLORS.void} fillOpacity={0.7} />
      <circle cx={x} cy={y} r={r} fill="url(#orbGlow)" opacity={selected ? 0.4 : 0.18} />
      <circle cx={x} cy={y} r={r} fill="none" stroke={COLORS.gold} strokeOpacity={selected ? 1 : 0.85} strokeWidth={selected ? 2 : 1.3} filter="url(#glow)" className="transition-all duration-300" />
      <circle cx={x} cy={y} r={r - 4} fill="none" stroke={COLORS.gold} strokeOpacity={selected ? 0.55 : 0.32} strokeWidth={0.6} />
      <circle cx={x} cy={y} r={selected ? 5 : 3.5} fill={COLORS.gold} fillOpacity={0.95} filter="url(#glow)" />

      {/* label outside */}
      <text
        textAnchor="middle"
        fill={selected ? COLORS.parchment : COLORS.silver}
        fontSize={fontSize}
        fontWeight={selected ? 600 : 500}
        letterSpacing="0.16em"
        className="uppercase transition-all duration-300 font-display group-hover:fill-parchment"
      >
        {lines.map((ln, i) => (
          <tspan key={i} x={labelX} y={firstLineY + i * lineHeight}>
            {ln}
          </tspan>
        ))}
      </text>
    </g>
  )
}

/** Node-page child: a luminous ringed orb with an optional glyph + label inside. */
function OrbNode({ x, y, label, selected, onClick, ariaLabel, radius = 46, outwardAngle = 0, glyph, labelScale = 1, className }: StellarNodeProps) {
  const r = selected ? radius * 1.07 : radius
  const hasGlyph = Boolean(glyph)
  // Wrap to the orb's usable chord (not a fixed char count, which overflowed a
  // small orb), keep the familiar line-count type scale so labels read at a
  // consistent size across the ring, then shrink only if a long word still
  // wouldn't fit — so a label can never spill onto its neighbour.
  const avail = r * 1.72
  const maxChars = Math.max(5, Math.round(avail / (10.5 * ORB_CHAR_W)))
  const lines = wrapLabel(label, maxChars, 3)
  const longest = Math.max(...lines.map((l) => l.length), 1)
  const base = (lines.length >= 3 ? 8 : lines.length === 2 ? 9 : 10.5) * labelScale
  const fontSize = Math.max(5.5, Math.min(base, avail / (longest * ORB_CHAR_W)))
  const lineHeight = fontSize + 2.5
  // With a glyph, the label sits in the lower half of the orb; otherwise centred.
  const labelMidY = hasGlyph ? y + r * 0.34 : y
  const startY = labelMidY - ((lines.length - 1) * lineHeight) / 2

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
      {/* hit target */}
      {onClick && <circle cx={x} cy={y} r={r + 6} fill="transparent" />}

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

      {/* glyph in the upper half */}
      {hasGlyph && <Glyph id={glyph} cx={x} cy={y - r * 0.32} size={r * 0.3} opacity={selected ? 1 : 0.85} />}

      {/* label */}
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
  if (props.variant === 'orb') return <OrbNode {...props} />
  if (props.variant === 'planet') return <PlanetNode {...props} />
  return <PlainNode {...props} />
}
