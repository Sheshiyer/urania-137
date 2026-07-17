import { GraphOrbital } from '../types'
import { COLORS } from '../styles/tokens'
import { useNodeGraph } from '../hooks/useNodeGraph'
import { toRad, noise } from '../lib/graphUtils'
import { StellarNode } from './primitives/StellarNode'
import { CoreGlow } from './primitives/CoreGlow'
import { CompassStar } from './primitives/CompassStar'

interface ConstellationGraphProps {
  orbitals: GraphOrbital[]
  selectedId?: string | null
  onSelect: (id: string) => void
  centerLabel: string
  onHomeRequest?: () => void
  ariaLabel?: string
  /** Shift the mandala down by this fraction of height to clear the title band. */
  centerYOffset?: number
  /** Positioning class for the root wrapper (journey layers pass 'absolute inset-0'). */
  wrapperClassName?: string
  /**
   * 'node' = a parent page (children as big labelled orbs). 'home' = the galactic
   * overview (parents as smaller ringed "planets" with labels outside). One
   * renderer, both depths — the structural anti-drift guarantee.
   */
  variant?: 'home' | 'node'
}

/**
 * The ornate parent-page constellation: a golden astrolabe mandala that
 * re-centers one node and orbits its children as luminous labelled orbs.
 * A single component renders all seven `/node/:id` pages, so their rich visual
 * grammar (dense hub, beaded spokes, orbit rings, starfield, compass stars)
 * stays identical across pages — the structural anti-drift guarantee.
 */
export function ConstellationGraph({
  orbitals,
  selectedId,
  onSelect,
  centerLabel,
  onHomeRequest,
  ariaLabel = 'stellar node constellation',
  centerYOffset = 0,
  wrapperClassName = 'fixed inset-0',
  variant = 'node',
}: ConstellationGraphProps) {
  const { width, height, centerX, centerY: baseCenterY, orbitRadius } = useNodeGraph()
  const centerY = baseCenterY + centerYOffset * height
  const isHome = variant === 'home'
  const small = width < 640

  const hubSize = Math.min(Math.max(orbitRadius * (isHome ? 0.4 : 0.46), small ? 46 : 72), 128)
  const orbR = isHome
    ? Math.min(Math.max(orbitRadius * 0.13, small ? 15 : 22), 34)
    : Math.min(Math.max(orbitRadius * 0.2, small ? 30 : 36), 56)
  const labelScale = small ? 0.8 : 1
  // A warmer, brighter gold for glows/blooms than the flat token gold.
  const WARM = '#E6B84D'

  const positions = orbitals.map((orbital) => {
    const a = toRad(orbital.angle - 90)
    return {
      orbital,
      angle: a,
      x: centerX + orbitRadius * Math.cos(a),
      y: centerY + orbitRadius * Math.sin(a),
    }
  })

  // Starfield — scattered across the field, plus a band clustered on the mandala.
  const scatter = Array.from({ length: 190 }).map((_, i) => ({
    x: noise(i, 1) * width,
    y: noise(i, 2) * height,
    r: 0.4 + noise(i, 3) * 1.3,
    o: 0.05 + noise(i, 4) * 0.35,
    warm: noise(i, 5) > 0.45,
  }))
  const band = Array.from({ length: 110 }).map((_, i) => {
    const a = noise(i, 6) * Math.PI * 2
    const rr = orbitRadius * (0.32 + noise(i, 7) * 0.85)
    return {
      x: centerX + rr * Math.cos(a),
      y: centerY + rr * Math.sin(a),
      r: 0.5 + noise(i, 8) * 1.4,
      o: 0.15 + noise(i, 9) * 0.45,
    }
  })

  // Concentric orbit rings between the hub and the orbit, plus faint outer rings.
  const innerRings = [0.5, 0.66, 0.82].map((f) => orbitRadius * f)
  const outerRings = [1.28, 1.7].map((f) => orbitRadius * f)

  // Beaded lattice — a bright dot where each primary/secondary spoke crosses a ring.
  const spokeAngles = positions.flatMap((p, i) => {
    const next = positions[(i + 1) % positions.length]
    const mid = (p.angle + next.angle) / 2 + (i === positions.length - 1 ? Math.PI : 0)
    return [p.angle, mid]
  })
  const lattice = spokeAngles.flatMap((a, ai) =>
    [...innerRings, orbitRadius].map((rr, ri) => ({
      x: centerX + rr * Math.cos(a),
      y: centerY + rr * Math.sin(a),
      r: ai % 2 === 0 ? 1.5 : 1,
      o: 0.5 - ri * 0.06,
    }))
  )

  // Tick marks on the main orbit ring.
  const orbitTicks = Array.from({ length: 120 }).map((_, i) => {
    const a = (i / 120) * Math.PI * 2
    const inner = orbitRadius - 4
    const outer = orbitRadius + 4
    return { x1: centerX + inner * Math.cos(a), y1: centerY + inner * Math.sin(a), x2: centerX + outer * Math.cos(a), y2: centerY + outer * Math.sin(a) }
  })

  // Secondary spokes at the mid-angles between children (adds astrolabe density).
  const midSpokes = positions.map((p, i) => {
    const next = positions[(i + 1) % positions.length]
    const mid = (p.angle + next.angle) / 2 + (i === positions.length - 1 ? Math.PI : 0)
    const r1 = hubSize * 0.9
    const r2 = orbitRadius * 0.92
    return {
      x1: centerX + r1 * Math.cos(mid),
      y1: centerY + r1 * Math.sin(mid),
      x2: centerX + r2 * Math.cos(mid),
      y2: centerY + r2 * Math.sin(mid),
    }
  })

  return (
    <div className={`${wrapperClassName} motion-safe:animate-graph-in`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label={ariaLabel}>
        <defs>
          <radialGradient id="pageBloom" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={WARM} stopOpacity="0.16" />
            <stop offset="38%" stopColor={WARM} stopOpacity="0.05" />
            <stop offset="100%" stopColor={WARM} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hubBloom" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
            <stop offset="20%" stopColor={WARM} stopOpacity="0.6" />
            <stop offset="52%" stopColor={COLORS.gold} stopOpacity="0.2" />
            <stop offset="100%" stopColor={COLORS.gold} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={WARM} stopOpacity="0.5" />
            <stop offset="60%" stopColor={COLORS.gold} stopOpacity="0.12" />
            <stop offset="100%" stopColor={COLORS.gold} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pageVignette" cx="50%" cy="50%" r="75%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
          <radialGradient id="nebulaViolet" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={COLORS.violet} stopOpacity="0.5" />
            <stop offset="55%" stopColor={COLORS.violet} stopOpacity="0.14" />
            <stop offset="100%" stopColor={COLORS.violet} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nebulaIndigo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={COLORS.indigo} stopOpacity="0.28" />
            <stop offset="60%" stopColor={COLORS.indigo} stopOpacity="0.08" />
            <stop offset="100%" stopColor={COLORS.indigo} stopOpacity="0" />
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

        {/* Nebula clouds (deep background) */}
        <g className="cn-nebula" pointerEvents="none">
          <ellipse cx={width * 0.2} cy={height * 0.24} rx={width * 0.34} ry={height * 0.3} fill="url(#nebulaViolet)" opacity={0.7} />
          <ellipse cx={width * 0.82} cy={height * 0.7} rx={width * 0.3} ry={height * 0.32} fill="url(#nebulaIndigo)" opacity={0.7} />
          <ellipse cx={width * 0.7} cy={height * 0.16} rx={width * 0.22} ry={height * 0.2} fill="url(#nebulaViolet)" opacity={0.4} />
        </g>

        <rect width={width} height={height} fill="url(#pageBloom)" />

        {/* Starfield (far parallax layer) */}
        <g className="cn-stars">
          {scatter.map((s, i) => (
            <circle key={`star-${i}`} cx={s.x} cy={s.y} r={s.r} fill={s.warm ? COLORS.gold : COLORS.parchment} fillOpacity={s.o} />
          ))}
          {band.map((s, i) => (
            <circle key={`band-${i}`} cx={s.x} cy={s.y} r={s.r} fill={COLORS.gold} fillOpacity={s.o} />
          ))}
        </g>

        {/* Mandala (near parallax + camera zoom layer) */}
        <g className="cn-mandala">
        {/* Outer + inner orbit rings */}
        {outerRings.map((r, i) => (
          <circle key={`outer-${i}`} cx={centerX} cy={centerY} r={r} fill="none" stroke={COLORS.gold} strokeOpacity={0.05} strokeWidth={1} strokeDasharray={i === 0 ? '2 10' : undefined} />
        ))}
        {innerRings.map((r, i) => (
          <circle key={`inner-${i}`} cx={centerX} cy={centerY} r={r} fill="none" stroke={COLORS.gold} strokeOpacity={0.1 - i * 0.02} strokeWidth={0.6} strokeDasharray="3 7" />
        ))}

        {/* Main orbit ring + tick marks */}
        <circle cx={centerX} cy={centerY} r={orbitRadius} fill="none" stroke={COLORS.gold} strokeOpacity={0.16} strokeWidth={0.8} />
        {orbitTicks.map((t, i) => (
          <line key={`otick-${i}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={COLORS.gold} strokeOpacity={0.1} strokeWidth={0.5} />
        ))}

        {/* Secondary spokes */}
        {midSpokes.map((s, i) => (
          <line key={`mid-${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={COLORS.gold} strokeOpacity={0.14} strokeWidth={0.5} />
        ))}

        {/* Inter-orb polygon */}
        {positions.map((p, i) => {
          const next = positions[(i + 1) % positions.length]
          return <line key={`poly-${i}`} x1={p.x} y1={p.y} x2={next.x} y2={next.y} stroke={COLORS.gold} strokeOpacity={0.12} strokeWidth={0.5} />
        })}

        {/* Beaded lattice at ring × spoke intersections */}
        {lattice.map((d, i) => (
          <circle key={`lat-${i}`} cx={d.x} cy={d.y} r={d.r + 0.3} fill={COLORS.gold} fillOpacity={Math.max(d.o + 0.1, 0.2)} />
        ))}

        {/* Primary beaded spokes */}
        {positions.map(({ x, y, orbital }) => {
          const isSel = selectedId === orbital.id
          const beads = [0.34, 0.52, 0.7].map((f) => ({ bx: centerX + (x - centerX) * f, by: centerY + (y - centerY) * f }))
          return (
            <g key={`spoke-${orbital.id}`}>
              <line x1={centerX} y1={centerY} x2={x} y2={y} stroke={COLORS.gold} strokeOpacity={isSel ? 0.85 : 0.42} strokeWidth={isSel ? 1.6 : 1} className="cn-spoke transition-all duration-500" pathLength={1} />
              {beads.map((b, i) => (
                <circle key={`bead-${orbital.id}-${i}`} cx={b.bx} cy={b.by} r={isSel ? 2.2 : 1.7} fill={COLORS.gold} fillOpacity={isSel ? 0.95 : 0.75} filter="url(#glow)" />
              ))}
            </g>
          )
        })}

        {/* Scattered compass-star glyphs at symmetric inner points */}
        {positions.slice(0, Math.min(4, positions.length)).map((p, i) => {
          const next = positions[(i + 1) % positions.length]
          const mid = (p.angle + next.angle) / 2
          const rr = orbitRadius * 0.58
          return <CompassStar key={`glyph-${i}`} cx={centerX + rr * Math.cos(mid)} cy={centerY + rr * Math.sin(mid)} size={7} opacity={0.45} />
        })}

        {/* Child orbs (node) / parent planets (home) */}
        {positions.map(({ orbital, x, y, angle }) => (
          <StellarNode
            key={orbital.id}
            className={isHome ? 'cn-node' : 'cn-orb'}
            variant={isHome ? 'planet' : 'orb'}
            x={x}
            y={y}
            centerY={centerY}
            label={orbital.label}
            radius={orbR}
            outwardAngle={angle}
            glyph={orbital.glyph}
            subCount={orbital.subCount}
            labelScale={labelScale}
            boundsWidth={width}
            selected={selectedId === orbital.id}
            onClick={() => onSelect(orbital.id)}
          />
        ))}

        {/* Ornate central hub */}
        <CoreGlow className="cn-hub" centerX={centerX} centerY={centerY} label={centerLabel} onClick={onHomeRequest} ornate size={hubSize} />
        </g>

        {/* Mid-edge compass stars with inward connector lines */}
        <line x1={width * 0.055} y1={centerY} x2={width * 0.055 + 90} y2={centerY} stroke={COLORS.gold} strokeOpacity={0.18} strokeWidth={0.6} />
        <line x1={width * 0.945} y1={centerY} x2={width * 0.945 - 90} y2={centerY} stroke={COLORS.gold} strokeOpacity={0.18} strokeWidth={0.6} />
        <CompassStar cx={width * 0.055} cy={centerY} size={Math.min(width, height) * 0.03} opacity={0.75} />
        <CompassStar cx={width * 0.945} cy={centerY} size={Math.min(width, height) * 0.03} opacity={0.75} />

        {/* Edge vignette — deepens the field toward the reference's near-black corners */}
        <rect width={width} height={height} fill="url(#pageVignette)" pointerEvents="none" />
      </svg>
    </div>
  )
}
