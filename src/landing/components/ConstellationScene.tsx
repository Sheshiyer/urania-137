import { Suspense, useState, useCallback, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Starfield } from './Starfield'
import { OrbitalRings } from './OrbitalRings'
import { FlowerOfLife3D, AstrolabePlates } from './SacredGeometry'
import { RoomNodes } from './RoomNodes'

interface ConstellationSceneProps {
  onRoomClick?: (roomId: string) => void
  className?: string
}

function canRunWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function SceneContent({ onRoomClick }: { onRoomClick?: (roomId: string) => void }) {
  const [activeRoom, setActiveRoom] = useState<string | null>(null)

  const handleRoomClick = useCallback((roomId: string) => {
    setActiveRoom((prev) => prev === roomId ? null : roomId)
    onRoomClick?.(roomId)
  }, [onRoomClick])

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#C5A017" />

      <Starfield />
      <OrbitalRings radii={[5, 7, 9]} color="#C5A017" opacity={0.2} />
      <FlowerOfLife3D radius={2} opacity={0.08} />
      <AstrolabePlates opacity={0.14} />
      <RoomNodes onRoomClick={handleRoomClick} activeRoom={activeRoom} />

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={8}
        maxDistance={25}
        maxPolarAngle={Math.PI * 0.65}
        minPolarAngle={Math.PI * 0.25}
        autoRotate
        autoRotateSpeed={0.15}
        dampingFactor={0.05}
        enableDamping
      />
    </>
  )
}

export function ConstellationScene({ onRoomClick, className }: ConstellationSceneProps) {
  const [webglSupported, setWebglSupported] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setWebglSupported(canRunWebGL())
  }, [])

  if (!webglSupported) return null

  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
      }}
    >
      <Canvas
        camera={{
          position: [0, 6, 14],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
        frameloop={prefersReduced ? 'demand' : 'always'}
      >
        <Suspense fallback={null}>
          <SceneContent onRoomClick={onRoomClick} />
        </Suspense>
      </Canvas>
    </div>
  )
}
