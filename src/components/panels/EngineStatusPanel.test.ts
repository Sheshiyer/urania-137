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
})
