import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

export function FlowerOfLife3D({ radius = 3, opacity = 0.06 }: { radius?: number; opacity?: number }) {
  const ref = useRef<THREE.Group>(null)

  const circles = useMemo(() => {
    const r = radius
    const centers: [number, number][] = [[0, 0]]
    for (let i = 0; i < 6; i++) {
      const a = (i * 60 * Math.PI) / 180
      centers.push([r * Math.cos(a), r * Math.sin(a)])
    }
    for (let i = 0; i < 6; i++) {
      const a = (i * 60 * Math.PI) / 180
      const a2 = ((i + 1) * 60 * Math.PI) / 180
      centers.push([
        r * Math.cos(a) + r * Math.cos(a2),
        r * Math.sin(a) + r * Math.sin(a2),
      ])
    }
    return centers
  }, [radius])

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.z += delta * 0.005
    }
  })

  return (
    <group ref={ref} rotation-x={Math.PI / 2} position-y={-0.5}>
      {circles.map(([cx, cz], i) => (
        <CircleOutline key={i} cx={cx} cz={cz} radius={radius} color="#C5A017" opacity={opacity} />
      ))}
    </group>
  )
}

function CircleOutline({ cx, cz, radius, color, opacity }: {
  cx: number
  cz: number
  radius: number
  color: string
  opacity: number
}) {
  const points = useMemo(() => {
    const segments = 64
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      pts.push(new THREE.Vector3(
        cx + radius * Math.cos(angle),
        0,
        cz + radius * Math.sin(angle),
      ))
    }
    return pts
  }, [cx, cz, radius])

  return (
    <Line points={points} color={color} transparent opacity={opacity} lineWidth={1} />
  )
}

export function AstrolabePlates({ opacity = 0.1 }: { opacity?: number }) {
  const ref = useRef<THREE.Group>(null)

  const spokes = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2
      const length = 2.5
      return [
        new THREE.Vector3(0.3 * Math.cos(angle), 0, 0.3 * Math.sin(angle)),
        new THREE.Vector3(length * Math.cos(angle), 0, length * Math.sin(angle)),
      ]
    })
  }, [])

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y -= delta * 0.01
    }
  })

  return (
    <group ref={ref}>
      {[2.5, 1.8, 1.2].map((r, i) => (
        <mesh key={r} rotation-x={Math.PI / 2 + i * 0.1}>
          <torusGeometry args={[r, 0.02, 8, 64]} />
          <meshBasicMaterial color="#C5A017" transparent opacity={opacity + i * 0.03} />
        </mesh>
      ))}
      {spokes.map((pts, i) => (
        <Line key={`spoke-${i}`} points={pts} color="#C5A017" transparent opacity={opacity * 0.6} lineWidth={1} />
      ))}
    </group>
  )
}
