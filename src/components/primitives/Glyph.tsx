import { ReactElement } from 'react'
import { COLORS } from '../../styles/tokens'

interface GlyphProps {
  /** Glyph key — matches a child's `glyph` field; falls back to a compass star. */
  id?: string
  cx: number
  cy: number
  /** Visual radius in px. */
  size: number
  opacity?: number
  stroke?: string
}

/**
 * Sacred-geometry line-art icons drawn inside/above the child orbs, echoing the
 * per-node glyphs in `.assets/page-references/engine-status-page.png` and kin.
 * Each renderer draws in a unit box [-1,1] and is scaled to `size`. Unknown ids
 * fall back to a compass star so every orb still reads as intentional.
 */
export function Glyph({ id, cx, cy, size, opacity = 0.8, stroke = COLORS.gold }: GlyphProps) {
  const render = GLYPHS[id ?? ''] ?? GLYPHS.star
  return (
    <g
      transform={`translate(${cx} ${cy}) scale(${size})`}
      fill="none"
      stroke={stroke}
      strokeWidth={1.1 / size}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
      pointerEvents="none"
      aria-hidden="true"
    >
      {render()}
    </g>
  )
}

const ring = (r: number, key?: string) => <circle key={key} cx={0} cy={0} r={r} />
const polygon = (n: number, r: number, rot = -90, key?: string) => {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = ((rot + (i / n) * 360) * Math.PI) / 180
    return `${r * Math.cos(a)},${r * Math.sin(a)}`
  }).join(' ')
  return <polygon key={key} points={pts} />
}

const GLYPHS: Record<string, () => ReactElement> = {
  // Compass star (default) — four-point sacred star with a ring.
  star: () => (
    <>
      {ring(0.92)}
      <path d="M0,-1 L0.16,-0.16 L1,0 L0.16,0.16 L0,1 L-0.16,0.16 L-1,0 L-0.16,-0.16 Z" />
      <circle cx={0} cy={0} r={0.14} fill={COLORS.gold} stroke="none" />
    </>
  ),
  // Flower of life — engines / consciousness.
  flower: () => (
    <>
      {ring(0.95)}
      {ring(0.42)}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        return <circle key={i} cx={0.42 * Math.cos(a)} cy={0.42 * Math.sin(a)} r={0.42} />
      })}
    </>
  ),
  // I Ching — three broken/solid lines (a trigram).
  hexagram: () => (
    <>
      <path d="M-0.7,-0.55 H0.7" />
      <path d="M-0.7,0 H-0.15 M0.15,0 H0.7" />
      <path d="M-0.7,0.55 H0.7" />
      {polygon(6, 0.95)}
    </>
  ),
  // Enneagram — nine points with the inner figure.
  enneagram: () => (
    <>
      {ring(0.95)}
      {polygon(9, 0.82)}
    </>
  ),
  // Human Design — a stacked-triangle bodygraph hint.
  bodygraph: () => (
    <>
      <path d="M0,-0.9 L0.55,-0.1 L-0.55,-0.1 Z" />
      <path d="M0,0.9 L0.55,0.1 L-0.55,0.1 Z" />
      <path d="M0,-0.1 V0.1" />
    </>
  ),
  // Pulse — a heartbeat waveform.
  pulse: () => <path d="M-0.95,0 H-0.5 L-0.28,-0.6 L0,0.6 L0.24,-0.35 L0.42,0 H0.95" />,
  // Health — a lotus / leaf.
  lotus: () => (
    <>
      <path d="M0,0.7 C-0.7,0.2 -0.5,-0.7 0,-0.85 C0.5,-0.7 0.7,0.2 0,0.7 Z" />
      <path d="M0,0.7 C-0.35,0.3 -0.3,-0.35 0,-0.55 C0.3,-0.35 0.35,0.3 0,0.7 Z" />
    </>
  ),
  // Astro / clock — astrolabe wheel with a pointer.
  astrolabe: () => (
    <>
      {ring(0.92)}
      {ring(0.5)}
      <path d="M0,-0.92 V-0.5 M0,0.5 V0.92 M-0.92,0 H-0.5 M0.5,0 H0.92" />
      <path d="M0,0 L0.34,-0.34" />
    </>
  ),
  // Key — gene keys.
  key: () => (
    <>
      <circle cx={0} cy={-0.45} r={0.35} />
      <path d="M0,-0.1 V0.9 M0,0.55 H0.32 M0,0.75 H0.24" />
    </>
  ),
  // Spiral — anamnesis / memory.
  spiral: () => <path d="M0.05,0 C0.05,-0.4 -0.5,-0.4 -0.5,0 C-0.5,0.55 0.35,0.55 0.35,-0.1 C0.35,-0.75 -0.75,-0.7 -0.8,0.15" />,
  // Sun — panchanga / solar.
  sun: () => (
    <>
      {ring(0.42)}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return <path key={i} d={`M${0.58 * Math.cos(a)},${0.58 * Math.sin(a)} L${0.92 * Math.cos(a)},${0.92 * Math.sin(a)}`} />
      })}
    </>
  ),
  // Orbit — transits / cycles.
  orbit: () => (
    <>
      {ring(0.9)}
      <ellipse cx={0} cy={0} rx={0.9} ry={0.34} />
      <circle cx={0} cy={0} r={0.12} fill={COLORS.gold} stroke="none" />
    </>
  ),
  // Twin rings — union / relationship.
  union: () => (
    <>
      <circle cx={-0.32} cy={0} r={0.55} />
      <circle cx={0.32} cy={0} r={0.55} />
    </>
  ),
  // Archive — stacked folios.
  archive: () => (
    <>
      <rect x={-0.7} y={-0.5} width={1.4} height={1.0} rx={0.08} />
      <path d="M-0.7,-0.18 H0.7 M-0.7,0.14 H0.7" />
    </>
  ),
  // Question — bridge query.
  query: () => (
    <>
      {ring(0.92)}
      <path d="M-0.28,-0.28 C-0.28,-0.62 0.28,-0.62 0.28,-0.22 C0.28,0.08 0,0.02 0,0.34" />
      <circle cx={0} cy={0.62} r={0.06} fill={COLORS.gold} stroke="none" />
    </>
  ),
}
