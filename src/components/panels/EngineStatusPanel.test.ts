import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { EngineStatus } from '../../types'
import { EngineStatusPanel } from './EngineStatusPanel'

const canonicalEngineIds = [
  'biofield',
  'biofield-capture',
  'biorhythm',
  'enneagram',
  'face-reading',
  'gene-keys',
  'human-design',
  'i-ching',
  'nadabrahman',
  'numerology',
  'panchanga',
  'raaga',
  'sacred-geometry',
  'sigil-forge',
  'tarot',
  'transits',
  'vedic-clock',
  'vimshottari',
]

const status: EngineStatus = {
  health: {
    status: 'ok',
    version: '3.3.1',
    uptime_seconds: 3_140,
    engines_loaded: 18,
    workflows_loaded: 6,
  },
  ready: {
    redis: 'ok',
    postgres: 'ok',
    orchestrator: 'ready',
    bridge_status: 'available',
    bridge_engines: [{
      engine_id: 'numerology',
      healthy: true,
      detail: 'ready',
      latency_ms: 12,
    }],
    bridge_failed_engines: [],
    overall_status: 'ready',
  },
  engines: canonicalEngineIds,
  capabilities: [],
  loading: false,
  error: null,
}

describe('EngineStatusPanel', () => {
  it('uses container-aware operator grids and readable dark-surface copy', () => {
    const html = renderToStaticMarkup(
      createElement(EngineStatusPanel, { child: null, status }),
    )

    expect(html).toContain('operator-status-summary')
    expect(html).toContain('operator-status-infrastructure')
    expect(html).toContain('text-parchment')
    expect(html).not.toContain('bg-reading-paper')
    expect(html).not.toContain('sm:grid-cols-4')
    expect(html).not.toContain('truncate font-mono')
  })

  it('keeps endpoint evidence and every returned engine in the rendered panel', () => {
    const html = renderToStaticMarkup(
      createElement(EngineStatusPanel, {
        child: {
          id: 'numerology',
          label: 'Numerology',
          run: { kind: 'engine', engineId: 'numerology' },
        },
        status,
      }),
    )

    expect(html).toContain('Endpoint evidence · ready')
    expect(html).toContain('operator-status-roster')
    expect(html.match(/<li/g)).toHaveLength(canonicalEngineIds.length)
    canonicalEngineIds.forEach((engineId) => expect(html).toContain(engineId))
  })

  it('renders contract-v1 capability availability, with degraded in the unavailable style', () => {
    const html = renderToStaticMarkup(
      createElement(EngineStatusPanel, {
        child: { id: 'tarot', label: 'Tarot', run: { kind: 'engine', engineId: 'tarot' } },
        status: {
          ...status,
          engines: ['tarot', 'raaga', 'numerology'],
          capabilities: [
            { contract_version: 'v1', engine_id: 'tarot', display_name: 'Tarot', availability: 'available', runtime_kind: 'typescript', dependencies: [] },
            { contract_version: 'v1', engine_id: 'raaga', display_name: 'Raaga', availability: 'degraded', runtime_kind: 'python', dependencies: [] },
          ],
        },
      }),
    )

    // Scope each assertion to that engine's roster <li> so the health and
    // infrastructure dots (also emerald) cannot satisfy it.
    const rosterRow = (id: string) => {
      const row = html.split('<li').find((chunk) => chunk.includes(`>${id}</span>`))
      expect(row, `roster row for ${id}`).toBeDefined()
      return row as string
    }
    expect(rosterRow('tarot')).toContain('bg-emerald" role="img" aria-label="available"')
    expect(rosterRow('raaga')).toContain('bg-terracotta" role="img" aria-label="degraded"')
    // numerology has no capability row, so it is `declared` (neutral) even
    // though bridge readiness reports it healthy.
    expect(rosterRow('numerology')).toContain('bg-silver/40" role="img" aria-label="unknown"')
  })
})
