import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

interface OrbitalRingsProps {
  radii?: number[]
  color?: string
  opacity?: number
}

export function OrbitalRings({
  radii = [5, 7, 9],
  color = '#C5A017',
  opacity = 0.12,
}: OrbitalRingsProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.008
    }
  })

  return (
    <group ref={groupRef}>
      {radii.map((r, i) => (
        <Ring key={r} radius={r} color={color} opacity={opacity} tilt={i * 0.15} speed={0.002 + i * 0.001} />
      ))}
    </group>
  )
}

function Ring({ radius, color, opacity, tilt, speed }: {
  radius: number
  color: string
  opacity: number
  tilt: number
  speed: number
}) {
  const ref = useRef<THREE.Group>(null)

  const points = useMemo(() => {
    const segments = 128
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      pts.push(new THREE.Vector3(
        radius * Math.cos(angle),
        0,
        radius * Math.sin(angle),
      ))
    }
    return pts
  }, [radius])

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.z += delta * speed
    }
  })

  return (
    <group ref={ref} rotation-x={tilt}>
      <Line points={points} color={color} transparent opacity={opacity} lineWidth={1} />
    </group>
  )
}
