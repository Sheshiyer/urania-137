import { useRef, useState, useMemo, useCallback } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { ROOMS } from '../landingData'
import { ROOM_DESCRIPTIONS } from '../landingData'

const NODE_ACCENTS: Record<string, string> = {
  gold: '#C5A017',
  cyan: '#10B5A7',
  violet: '#7B68EE',
  amber: '#E6B84D',
}

const CONSTELLATION_RADIUS = 7

interface RoomNodeData {
  id: string
  label: string
  epithet: string
  color: string
  position: THREE.Vector3
  engines: string[]
  workflows: string[]
  witnesses: string[]
}

function getRoomNodes(): RoomNodeData[] {
  return ROOMS.map((room, i) => {
    const angle = (i / ROOMS.length) * Math.PI * 2 - Math.PI / 2
    return {
      id: room.id,
      label: room.label,
      epithet: room.epithet,
      color: room.color,
      position: new THREE.Vector3(
        CONSTELLATION_RADIUS * Math.cos(angle),
        (i % 2 === 0 ? 0.3 : -0.3),
        CONSTELLATION_RADIUS * Math.sin(angle),
      ),
      engines: room.engines,
      workflows: room.workflows,
      witnesses: room.witnesses,
    }
  })
}

interface RoomNodesProps {
  onRoomClick?: (roomId: string) => void
  activeRoom?: string | null
}

export function RoomNodes({ onRoomClick, activeRoom }: RoomNodesProps) {
  const groupRef = useRef<THREE.Group>(null)
  const rooms = useMemo(getRoomNodes, [])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.006
    }
  })

  return (
    <group ref={groupRef}>
      <ConstellationLines rooms={rooms} />
      {rooms.map((room) => (
        <RoomNode
          key={room.id}
          room={room}
          isActive={activeRoom === room.id}
          onClick={onRoomClick}
        />
      ))}
    </group>
  )
}

function ConstellationLines({ rooms }: { rooms: RoomNodeData[] }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i < rooms.length; i++) {
      const j = (i + 2) % rooms.length
      points.push(rooms[i].position, rooms[j].position)
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [rooms])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#C5A017" transparent opacity={0.08} />
    </lineSegments>
  )
}

function RoomNode({ room, isActive, onClick }: {
  room: RoomNodeData
  isActive: boolean
  onClick?: (roomId: string) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const accent = NODE_ACCENTS[room.color] || '#C5A017'
  const scale = isActive ? 1.6 : hovered ? 1.3 : 1

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onClick?.(room.id)
  }, [onClick, room.id])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
    }
  })

  const desc = ROOM_DESCRIPTIONS[room.id]

  return (
    <group position={room.position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color={accent} transparent opacity={hovered || isActive ? 0.9 : 0.7} />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial color={accent} transparent opacity={0.06} />
      </mesh>

      {(hovered || isActive) && (
        <Html
          center
          distanceFactor={15}
          style={{ pointerEvents: isActive ? 'auto' : 'none' }}
        >
          <div
            className="room-tooltip"
            style={{
              background: 'rgba(14, 20, 40, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${accent}33`,
              borderRadius: '12px',
              padding: '16px 20px',
              minWidth: '220px',
              maxWidth: '280px',
              color: '#F0EDE3',
              fontFamily: 'Satoshi, system-ui, sans-serif',
              cursor: isActive ? 'default' : 'pointer',
            }}
            onClick={() => onClick?.(room.id)}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: accent,
              }} />
              <span style={{
                fontFamily: 'Cinzel, Georgia, serif',
                fontSize: '0.95rem',
                fontWeight: 500,
                letterSpacing: '0.04em',
              }}>
                {room.label}
              </span>
            </div>
            <p style={{
              margin: '0 0 8px',
              fontSize: '0.7rem',
              color: accent,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 500,
            }}>
              {room.epithet}
            </p>
            {desc && (
              <p style={{
                margin: '0 0 10px',
                fontSize: '0.78rem',
                lineHeight: 1.5,
                color: '#C2CBD1',
              }}>
                {desc.tagline}
              </p>
            )}
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              {room.engines.length > 0 && (
                <span style={{
                  fontSize: '0.65rem',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: 'rgba(197, 160, 23, 0.12)',
                  color: '#C5A017',
                  fontWeight: 500,
                }}>
                  {room.engines.length} engine{room.engines.length > 1 ? 's' : ''}
                </span>
              )}
              {room.workflows.length > 0 && (
                <span style={{
                  fontSize: '0.65rem',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: 'rgba(11, 80, 251, 0.12)',
                  color: '#89A5FF',
                  fontWeight: 500,
                }}>
                  {room.workflows.length} workflow{room.workflows.length > 1 ? 's' : ''}
                </span>
              )}
              {room.witnesses.length > 0 && (
                <span style={{
                  fontSize: '0.65rem',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: 'rgba(45, 0, 80, 0.15)',
                  color: '#AFA6FF',
                  fontWeight: 500,
                }}>
                  {room.witnesses.length} witness{room.witnesses.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
