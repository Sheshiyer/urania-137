import { GraphOrbital } from '../types'
import { COLORS } from '../styles/tokens'
import { useNodeGraph, toRad } from '../hooks/useNodeGraph'
import { StellarEdge } from './primitives/StellarEdge'
import { StellarSubNode } from './primitives/StellarSubNode'
import { StellarNode } from './primitives/StellarNode'
import { CoreGlow } from './primitives/CoreGlow'

interface StellarNodeGraphProps {
  /** Orbital items to place radially around the hub (home nodes or a parent's children). */
  orbitals: GraphOrbital[]
  selectedId?: string | null
  onSelect: (id: string) => void
  /** Central hub label. Home = "NOESIS"; a parent page = the parent's name. */
  centerLabel?: string
  /** When set, clicking the central hub zooms back out (used on parent pages). */
  onHomeRequest?: () => void
  ariaLabel?: string
  /**
   * Shifts the whole constellation down by this fraction of the viewport height.
   * Home = 0 (dead-centered). Parent pages use a small positive value so the
   * top orbital clears the overlay title band. Whole graph moves together, so
   * radial symmetry is preserved.
   */
  centerYOffset?: number
  /** Positioning class for the root wrapper (journey layers pass 'absolute inset-0'). */
  wrapperClassName?: string
}

/**
 * Generic radial SVG graph. A single component renders every depth of the
 * stellar taxonomy — the home constellation and each `/node/:id` page — so
 * the visual grammar (radial symmetry, glowing edges, satellite nodes, dark
 * void) can never drift between pages. See the design-system contract.
 */
export function StellarNodeGraph({
  orbitals,
  selectedId,
  onSelect,
  centerLabel = 'NOESIS',
  onHomeRequest,
  ariaLabel = 'Selemene stellar node branching architecture',
  centerYOffset = 0,
  wrapperClassName = 'fixed inset-0',
}: StellarNodeGraphProps) {
  const { width, height, centerX, centerY: baseCenterY, orbitRadius } = useNodeGraph()
  const centerY = baseCenterY + centerYOffset * height

  const positions = orbitals.map((orbital) => {
    const angle = toRad(orbital.angle - 90)
    return {
      orbital,
      x: centerX + orbitRadius * Math.cos(angle),
      y: centerY + orbitRadius * Math.sin(angle),
      angle,
    }
  })

  // Decorative field dots in concentric rings
  const fieldDots = Array.from({ length: 64 }).map((_, i) => {
    const angle = (i / 64) * Math.PI * 2
    const r = orbitRadius + 80 + (i % 4) * 30
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      opacity: 0.1 + (i % 7) * 0.04,
    }
  })

  // Inter-node constellation links
  const constellationLinks = []
  for (let i = 0; i < positions.length; i++) {
    const a = positions[i]
    const b = positions[(i + 1) % positions.length]
    constellationLinks.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
  }

  return (
    <div className={wrapperClassName}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" role="img" aria-label={ariaLabel}>
        <defs>
          <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="35%" stopColor={COLORS.gold} stopOpacity="0.8" />
            <stop offset="70%" stopColor={COLORS.violet} stopOpacity="0.35" />
            <stop offset="100%" stopColor={COLORS.violet} stopOpacity="0" />
          </radialGradient>

          <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={COLORS.gold} stopOpacity="0.9" />
            <stop offset="100%" stopColor={COLORS.gold} stopOpacity="0" />
          </radialGradient>

          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={width} height={height} fill={COLORS.void} />

        {/* Starfield (far parallax layer) */}
        <g className="cn-stars">
          {fieldDots.map((dot, i) => (
            <circle key={`field-${i}`} cx={dot.x} cy={dot.y} r={1.5} fill={COLORS.gold} fillOpacity={dot.opacity} />
          ))}
        </g>

        {/* Mandala (near parallax + camera zoom layer) */}
        <g className="cn-mandala">
          {/* Compass frame rings */}
          <circle cx={centerX} cy={centerY} r={orbitRadius + 96} fill="none" stroke={COLORS.gold} strokeOpacity={0.04} strokeWidth={1} />
          <circle cx={centerX} cy={centerY} r={orbitRadius + 48} fill="none" stroke={COLORS.gold} strokeOpacity={0.06} strokeWidth={1} strokeDasharray="2 6" />
          <circle cx={centerX} cy={centerY} r={orbitRadius} fill="none" stroke={COLORS.gold} strokeOpacity={0.08} strokeWidth={1} strokeDasharray="4 8" />

          {/* Constellation links between outer nodes */}
          {constellationLinks.map((link, i) => (
            <StellarEdge key={`constellation-${i}`} x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2} stroke={COLORS.gold} opacity={0.06} width={0.5} />
          ))}

          {/* Spines from core to outer nodes */}
          {positions.map(({ x, y, orbital }) => {
            const isSelected = selectedId === orbital.id
            return (
              <StellarEdge
                key={`spine-${orbital.id}`}
                x1={centerX}
                y1={centerY}
                x2={x}
                y2={y}
                stroke={isSelected ? COLORS.gold : COLORS.silver}
                opacity={isSelected ? 0.85 : 0.25}
                width={isSelected ? 2 : 1}
                className="cn-spoke transition-all duration-500"
                pathLength={1}
              />
            )
          })}

          {/* Sub-node branches */}
          {positions.map(({ orbital, x, y, angle }) => {
            const isSelected = selectedId === orbital.id
            return Array.from({ length: orbital.subCount }).map((_, i) => {
              const subAngle = angle + (i - (orbital.subCount - 1) / 2) * 0.32
              return (
                <StellarSubNode
                  key={`sub-${orbital.id}-${i}`}
                  className="cn-sat"
                  parentX={x}
                  parentY={y}
                  angle={subAngle}
                  radius={isSelected ? 52 : 38}
                  active={isSelected}
                />
              )
            })
          })}

          {/* Outer nodes */}
          {positions.map(({ orbital, x, y }) => (
            <StellarNode
              key={orbital.id}
              className="cn-node"
              x={x}
              y={y}
              centerY={centerY}
              label={orbital.label}
              selected={selectedId === orbital.id}
              onClick={() => onSelect(orbital.id)}
            />
          ))}

          {/* Central core */}
          <CoreGlow className="cn-hub" centerX={centerX} centerY={centerY} label={centerLabel} onClick={onHomeRequest} />
        </g>
      </svg>
    </div>
  )
}
