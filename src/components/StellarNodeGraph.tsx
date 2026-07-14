import { StellarNode } from '../types'

interface StellarNodeGraphProps {
  nodes: StellarNode[]
  selectedNode: StellarNode | null
  onNodeSelect: (node: StellarNode) => void
  width?: number
  height?: number
}

const COLORS = {
  gold: '#C5A017',
  emerald: '#10B5A7',
  indigo: '#0B50FB',
  violet: '#2D0050',
  parchment: '#F0EDE3',
  silver: '#8A9BA8',
}

export function StellarNodeGraph({
  nodes,
  selectedNode,
  onNodeSelect,
  width = 760,
  height = 760,
}: StellarNodeGraphProps) {
  const centerX = width / 2
  const centerY = height / 2
  const orbitRadius = Math.min(width, height) * 0.34

  const toRad = (deg: number) => (deg * Math.PI) / 180

  const nodePositions = nodes.map((node) => {
    const angle = toRad(node.angle - 90)
    return {
      node,
      x: centerX + orbitRadius * Math.cos(angle),
      y: centerY + orbitRadius * Math.sin(angle),
      angle,
    }
  })

  // Decorative field dots
  const fieldDots = Array.from({ length: 48 }).map((_, i) => {
    const angle = (i / 48) * Math.PI * 2
    const r = orbitRadius + 60 + (i % 3) * 28
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      opacity: 0.15 + (i % 5) * 0.05,
    }
  })

  // Inter-node constellation links between nearby outer nodes
  const constellationLinks = []
  for (let i = 0; i < nodePositions.length; i++) {
    const a = nodePositions[i]
    const b = nodePositions[(i + 1) % nodePositions.length]
    constellationLinks.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
  }

  return (
    <div className="relative w-full max-w-3xl mx-auto aspect-square">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        role="img"
        aria-label="Selemene stellar node branching architecture"
      >
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

        {/* Void canvas */}
        <rect width={width} height={height} fill="#070B1D" rx="24" />

        {/* Subtle compass frame */}
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius + 80}
          fill="none"
          stroke={COLORS.gold}
          strokeOpacity={0.06}
          strokeWidth={1}
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius + 40}
          fill="none"
          stroke={COLORS.gold}
          strokeOpacity={0.08}
          strokeWidth={1}
          strokeDasharray="2 6"
        />

        {/* Constellation field dots */}
        {fieldDots.map((dot, i) => (
          <circle
            key={`field-${i}`}
            cx={dot.x}
            cy={dot.y}
            r={1.5}
            fill={COLORS.gold}
            fillOpacity={dot.opacity}
          />
        ))}

        {/* Inter-node constellation links */}
        {constellationLinks.map((link, i) => (
          <line
            key={`constellation-${i}`}
            x1={link.x1}
            y1={link.y1}
            x2={link.x2}
            y2={link.y2}
            stroke={COLORS.gold}
            strokeOpacity={0.08}
            strokeWidth={0.5}
          />
        ))}

        {/* Spines from core to outer nodes */}
        {nodePositions.map(({ x, y, node }) => {
          const isSelected = selectedNode?.id === node.id
          return (
            <line
              key={`spine-${node.id}`}
              x1={centerX}
              y1={centerY}
              x2={x}
              y2={y}
              stroke={isSelected ? COLORS.gold : COLORS.silver}
              strokeOpacity={isSelected ? 0.85 : 0.25}
              strokeWidth={isSelected ? 1.5 : 1}
              className="transition-all duration-500"
            />
          )
        })}

        {/* Sub-node branches */}
        {nodePositions.map(({ node, x, y, angle }) => {
          const isSelected = selectedNode?.id === node.id
          return node.subNodes.map((_, i) => {
            const subAngle = angle + (i - (node.subNodes.length - 1) / 2) * 0.32
            const subRadius = isSelected ? 46 : 34
            const sx = x + subRadius * Math.cos(subAngle)
            const sy = y + subRadius * Math.sin(subAngle)
            return (
              <g key={`sub-${node.id}-${i}`}>
                <line
                  x1={x}
                  y1={y}
                  x2={sx}
                  y2={sy}
                  stroke={COLORS.gold}
                  strokeOpacity={isSelected ? 0.45 : 0.22}
                  strokeWidth={0.75}
                />
                <circle
                  cx={sx}
                  cy={sy}
                  r={isSelected ? 3.5 : 2.5}
                  fill={COLORS.gold}
                  fillOpacity={isSelected ? 0.85 : 0.55}
                />
              </g>
            )
          })
        })}

        {/* Outer nodes */}
        {nodePositions.map(({ node, x, y }) => {
          const isSelected = selectedNode?.id === node.id
          const color = isSelected ? COLORS.gold : COLORS.silver
          return (
            <g key={node.id} className="cursor-pointer" onClick={() => onNodeSelect(node)}>
              {/* Outer halo */}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 28 : 18}
                fill="none"
                stroke={color}
                strokeOpacity={isSelected ? 0.25 : 0.12}
                strokeWidth={1}
                className="transition-all duration-300"
              />
              {/* Node ring */}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 14 : 9}
                fill="#070B1D"
                stroke={color}
                strokeWidth={isSelected ? 2.5 : 1.5}
                filter={isSelected ? 'url(#glow)' : undefined}
                className="transition-all duration-300"
              />
              {/* Inner glow */}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 6 : 4}
                fill={isSelected ? COLORS.gold : COLORS.parchment}
                fillOpacity={isSelected ? 1 : 0.6}
                className="transition-all duration-300"
              />

              {/* Label */}
              <text
                x={x}
                y={y + (y > centerY ? 34 : -26)}
                textAnchor="middle"
                fill={isSelected ? COLORS.parchment : COLORS.silver}
                fontSize={isSelected ? 13 : 11}
                fontWeight={isSelected ? 600 : 500}
                letterSpacing="0.12em"
                className="uppercase transition-all duration-300 font-display"
              >
                {node.label}
              </text>
            </g>
          )
        })}

        {/* Central core rings */}
        <g className="animate-pulse-slow">
          <circle
            cx={centerX}
            cy={centerY}
            r={70}
            fill="url(#coreGradient)"
            opacity={0.35}
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={52}
            fill="none"
            stroke={COLORS.gold}
            strokeWidth={1}
            strokeOpacity={0.4}
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={38}
            fill="none"
            stroke={COLORS.gold}
            strokeWidth={0.5}
            strokeOpacity={0.25}
            strokeDasharray="3 4"
            className="origin-center animate-drift"
            style={{ transformOrigin: `${centerX}px ${centerY}px` }}
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={16}
            fill={COLORS.gold}
            fillOpacity={0.9}
            filter="url(#glow)"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={7}
            fill="#fff"
            fillOpacity={0.9}
          />
        </g>

        <text
          x={centerX}
          y={centerY + 5}
          textAnchor="middle"
          fill="#070B1D"
          fontSize={11}
          fontWeight={800}
          letterSpacing="0.14em"
          className="uppercase pointer-events-none font-display"
        >
          NOESIS
        </text>
      </svg>
    </div>
  )
}
