import { COLORS } from '../../styles/tokens'
import { wrapLabel } from '../../lib/graphUtils'

interface CoreGlowProps {
  centerX: number
  centerY: number
  label: string
  /** When set, the hub becomes an interactive "return to home" gesture. */
  onClick?: () => void
  /** Ornate parent-page hub (dense rings + guilloché). Home hub stays simple. */
  ornate?: boolean
  /** Hub scale in px (ornate). Outer ring radius roughly = size. */
  size?: number
  /** Extra class (motion targeting, e.g. cn-hub). */
  className?: string
}

/** Home hub: layered gradient glow + drifting ring + NOESIS label. Unchanged baseline. */
function SimpleCore({ centerX, centerY, label, onClick, className }: CoreGlowProps) {
  const interactive = Boolean(onClick)
  return (
    <g
      onClick={onClick}
      className={[interactive ? 'cursor-pointer' : '', className ?? ''].join(' ').trim() || undefined}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? `Return to home from ${label}` : label}
    >
      <g className="animate-pulse-slow">
        <circle cx={centerX} cy={centerY} r={80} fill="url(#coreGradient)" opacity={0.35} />
        <circle cx={centerX} cy={centerY} r={60} fill="none" stroke={COLORS.gold} strokeWidth={1} strokeOpacity={0.4} />
        <circle cx={centerX} cy={centerY} r={44} fill="none" stroke={COLORS.gold} strokeWidth={0.5} strokeOpacity={0.25} strokeDasharray="3 4" style={{ transformOrigin: `${centerX}px ${centerY}px` }} className="animate-drift" />
        <circle cx={centerX} cy={centerY} r={18} fill={COLORS.gold} fillOpacity={0.9} filter="url(#glow)" />
        <circle cx={centerX} cy={centerY} r={8} fill="#fff" fillOpacity={0.9} />
      </g>
      <text x={centerX} y={centerY + 6} textAnchor="middle" fill={COLORS.gold} fontSize={12} fontWeight={800} letterSpacing="0.16em" className="uppercase pointer-events-none font-display">
        {label}
      </text>
    </g>
  )
}

/** Ornate parent hub: a luminous golden disc of concentric rings + guilloché. */
function OrnateCore({ centerX, centerY, label, onClick, size = 96, className }: CoreGlowProps) {
  const interactive = Boolean(onClick)
  const lines = wrapLabel(label, 12, 2)
  const lineHeight = 15
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2 + 5

  // Guilloché: many fine radial hairlines woven through the ring band.
  const hatch = Array.from({ length: 90 }).map((_, i) => {
    const a = (i / 90) * Math.PI * 2
    const inner = size * 0.34
    const outer = size * 0.9
    return { x1: centerX + inner * Math.cos(a), y1: centerY + inner * Math.sin(a), x2: centerX + outer * Math.cos(a), y2: centerY + outer * Math.sin(a) }
  })

  // Brighter radial spoke burst inside the hub.
  const burst = Array.from({ length: 24 }).map((_, i) => {
    const a = (i / 24) * Math.PI * 2
    const inner = size * 0.4
    const outer = size * 0.98
    return { x1: centerX + inner * Math.cos(a), y1: centerY + inner * Math.sin(a), x2: centerX + outer * Math.cos(a), y2: centerY + outer * Math.sin(a) }
  })

  // Concentric ring band — tightly packed and luminous.
  const rings = [0.34, 0.42, 0.5, 0.58, 0.66, 0.74, 0.82, 0.9, 1].map((f, i) => ({
    r: size * f,
    opacity: 0.7 - i * 0.04,
    width: i % 2 === 0 ? 1 : 0.6,
  }))

  return (
    <g
      onClick={onClick}
      className={[interactive ? 'cursor-pointer' : '', className ?? ''].join(' ').trim() || undefined}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? `Return to home from ${label}` : label}
    >
      {/* bloom band */}
      <circle cx={centerX} cy={centerY} r={size * 1.5} fill="url(#hubBloom)" />

      {/* guilloché hairlines */}
      <g opacity={0.6}>
        {hatch.map((h, i) => (
          <line key={`h-${i}`} x1={h.x1} y1={h.y1} x2={h.x2} y2={h.y2} stroke={COLORS.gold} strokeOpacity={0.2} strokeWidth={0.4} />
        ))}
      </g>

      {/* brighter radial burst */}
      {burst.map((b, i) => (
        <line key={`b-${i}`} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke={COLORS.gold} strokeOpacity={0.42} strokeWidth={0.6} />
      ))}

      {/* concentric rings */}
      {rings.map((ring, i) => (
        <circle key={`ring-${i}`} cx={centerX} cy={centerY} r={ring.r} fill="none" stroke={COLORS.gold} strokeOpacity={ring.opacity} strokeWidth={ring.width} />
      ))}

      {/* two luminous highlight rings */}
      <circle cx={centerX} cy={centerY} r={size * 0.62} fill="none" stroke={COLORS.gold} strokeOpacity={0.9} strokeWidth={1.2} filter="url(#glow)" />
      <circle cx={centerX} cy={centerY} r={size * 0.9} fill="none" stroke={COLORS.gold} strokeOpacity={0.6} strokeWidth={0.8} filter="url(#glow)" />

      {/* drifting dashed ring */}
      <circle cx={centerX} cy={centerY} r={size * 0.7} fill="none" stroke={COLORS.gold} strokeOpacity={0.4} strokeWidth={0.6} strokeDasharray="2 5" style={{ transformOrigin: `${centerX}px ${centerY}px` }} className="animate-drift" />

      {/* darker seat so the label reads over the glow */}
      <circle cx={centerX} cy={centerY} r={size * 0.32} fill={COLORS.void} fillOpacity={0.62} />
      <circle cx={centerX} cy={centerY} r={size * 0.32} fill="none" stroke={COLORS.gold} strokeOpacity={0.95} strokeWidth={1.2} filter="url(#glow)" />

      <text textAnchor="middle" className="uppercase pointer-events-none font-display" fill="#fff" fontSize={13} fontWeight={600} letterSpacing="0.12em">
        {lines.map((ln, i) => (
          <tspan key={i} x={centerX} y={startY + i * lineHeight}>
            {ln}
          </tspan>
        ))}
      </text>
    </g>
  )
}

export function CoreGlow(props: CoreGlowProps) {
  return props.ornate ? <OrnateCore {...props} /> : <SimpleCore {...props} />
}
