import { useEffect, useState } from 'react'
import { StellarNode } from '../types'

interface StellarNodeGraphProps {
  nodes: StellarNode[]
  selectedNode: StellarNode | null
  onNodeSelect: (node: StellarNode) => void
}

const COLORS = {
  gold: '#C5A017',
  emerald: '#10B5A7',
  indigo: '#0B50FB',
  violet: '#2D0050',
  parchment: '#F0EDE3',
  silver: '#8A9BA8',
}

export function StellarNodeGraph({ nodes, selectedNode, onNodeSelect }: StellarNodeGraphProps) {
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
  const centerX = width / 2
  const centerY = height / 2
  const orbitRadius = Math.min(width, height) * 0.32

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
  for (let i = 0; i < nodePositions.length; i++) {
    const a = nodePositions[i]
    const b = nodePositions[(i + 1) % nodePositions.length]
    constellationLinks.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
  }

  return (
    <div className="fixed inset-0">
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

        <rect width={width} height={height} fill="#070B1D" />

        {/* Compass frame rings */}
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius + 96}
          fill="none"
          stroke={COLORS.gold}
          strokeOpacity={0.04}
          strokeWidth={1}
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius + 48}
          fill="none"
          stroke={COLORS.gold}
          strokeOpacity={0.06}
          strokeWidth={1}
          strokeDasharray="2 6"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius}
          fill="none"
          stroke={COLORS.gold}
          strokeOpacity={0.08}
          strokeWidth={1}
          strokeDasharray="4 8"
        />

        {/* Field dots */}
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

        {/* Constellation links between outer nodes */}
        {constellationLinks.map((link, i) => (
          <line
            key={`constellation-${i}`}
            x1={link.x1}
            y1={link.y1}
            x2={link.x2}
            y2={link.y2}
            stroke={COLORS.gold}
            strokeOpacity={0.06}
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
              strokeWidth={isSelected ? 2 : 1}
              className="transition-all duration-500"
            />
          )
        })}

        {/* Sub-node branches */}
        {nodePositions.map(({ node, x, y, angle }) => {
          const isSelected = selectedNode?.id === node.id
          return node.subNodes.map((_, i) => {
            const subAngle = angle + (i - (node.subNodes.length - 1) / 2) * 0.32
            const subRadius = isSelected ? 52 : 38
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
                  strokeOpacity={isSelected ? 0.5 : 0.22}
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
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 32 : 22}
                fill="none"
                stroke={color}
                strokeOpacity={isSelected ? 0.25 : 0.12}
                strokeWidth={1}
                className="transition-all duration-300"
              />
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 16 : 10}
                fill="#070B1D"
                stroke={color}
                strokeWidth={isSelected ? 2.5 : 1.5}
                filter={isSelected ? 'url(#glow)' : undefined}
                className="transition-all duration-300"
              />
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 7 : 4.5}
                fill={isSelected ? COLORS.gold : COLORS.parchment}
                fillOpacity={isSelected ? 1 : 0.6}
                className="transition-all duration-300"
              />

              <text
                x={x}
                y={y + (y > centerY ? 42 : -34)}
                textAnchor="middle"
                fill={isSelected ? COLORS.parchment : COLORS.silver}
                fontSize={isSelected ? 14 : 12}
                fontWeight={isSelected ? 600 : 500}
                letterSpacing="0.14em"
                className="uppercase transition-all duration-300 font-display"
              >
                {node.label}
              </text>
            </g>
          )
        })}

        {/* Central core */}
        <g className="animate-pulse-slow">
          <circle
            cx={centerX}
            cy={centerY}
            r={80}
            fill="url(#coreGradient)"
            opacity={0.35}
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={60}
            fill="none"
            stroke={COLORS.gold}
            strokeWidth={1}
            strokeOpacity={0.4}
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={44}
            fill="none"
            stroke={COLORS.gold}
            strokeWidth={0.5}
            strokeOpacity={0.25}
            strokeDasharray="3 4"
            style={{ transformOrigin: `${centerX}px ${centerY}px` }}
            className="animate-drift"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={18}
            fill={COLORS.gold}
            fillOpacity={0.9}
            filter="url(#glow)"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={8}
            fill="#fff"
            fillOpacity={0.9}
          />
        </g>

        <text
          x={centerX}
          y={centerY + 6}
          textAnchor="middle"
          fill={COLORS.gold}
          fontSize={12}
          fontWeight={800}
          letterSpacing="0.16em"
          className="uppercase pointer-events-none font-display"
        >
          NOESIS
        </text>
      </svg>
    </div>
  )
}
