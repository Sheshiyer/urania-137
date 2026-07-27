import type { ReadingDTO } from '../api/contract'

export interface FolioSector {
  id: string
  label: string
}

export const FOLIO_SECTORS: readonly FolioSector[] = [
  { id: 'birth', label: 'Birth Witness' },
  { id: 'compat', label: 'Union Mirror' },
  { id: 'transit', label: 'Sky Weather' },
  { id: 'witness', label: 'Noesis Reading' },
  { id: 'engine', label: 'Engine Status' },
  { id: 'folio', label: 'Folio' },
  { id: 'bridge', label: 'Bridge Query' },
  { id: 'unmapped', label: 'Unmapped' },
] as const

export interface FolioMapPoint {
  reading: ReadingDTO
  sectorId: string
  sectorLabel: string
  angleDegrees: number
  radius: number
  x: number
  y: number
}

export interface FolioLayout {
  points: FolioMapPoint[]
  list: ReadingDTO[]
  sectors: readonly FolioSector[]
}

const MAX_PLOTTED_READINGS = 24
const MIN_RADIUS = 23
const MAX_RADIUS = 38

function stableUnit(value: string): number {
  let hash = 2_166_136_261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return (hash >>> 0) / 0xffff_ffff
}

function finiteCreatedAt(reading: ReadingDTO): number {
  return Number.isFinite(reading.createdAt) ? reading.createdAt : 0
}

/**
 * A deterministic projection of canonical records. Node family controls the
 * angular sector; creation time controls the radial position. Identity only
 * adds a small within-sector offset so equal-time records remain discernible.
 */
export function deriveFolioLayout(
  readings: readonly ReadingDTO[],
): FolioLayout {
  const list = [...readings]
  const plotted = list.slice(0, MAX_PLOTTED_READINGS)
  const timestamps = plotted.map(finiteCreatedAt)
  const oldest = timestamps.length > 0 ? Math.min(...timestamps) : 0
  const newest = timestamps.length > 0 ? Math.max(...timestamps) : oldest
  const sectorWidth = 360 / FOLIO_SECTORS.length

  const points = plotted.map((reading): FolioMapPoint => {
    const knownIndex = FOLIO_SECTORS.findIndex(
      (sector) => sector.id === reading.nodeId && sector.id !== 'unmapped',
    )
    const sectorIndex = knownIndex >= 0
      ? knownIndex
      : FOLIO_SECTORS.length - 1
    const sector = FOLIO_SECTORS[sectorIndex]
    const jitter = (stableUnit(reading.id) - 0.5) * sectorWidth * 0.58
    const angleDegrees = -90 + sectorIndex * sectorWidth + jitter
    const createdAt = finiteCreatedAt(reading)
    const timeUnit = newest === oldest
      ? 0.5
      : (createdAt - oldest) / (newest - oldest)
    const radius = MIN_RADIUS + timeUnit * (MAX_RADIUS - MIN_RADIUS)
    const radians = (angleDegrees * Math.PI) / 180

    return {
      reading,
      sectorId: sector.id,
      sectorLabel: sector.label,
      angleDegrees,
      radius,
      x: 50 + Math.cos(radians) * radius,
      y: 50 + Math.sin(radians) * radius,
    }
  })

  return { points, list, sectors: FOLIO_SECTORS }
}
