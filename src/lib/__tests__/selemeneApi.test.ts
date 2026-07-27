import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculateEngine, calculateEngineRaw, runWorkflow } from '../selemeneApi'

describe('Selemene client context', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as Record<string, unknown>).__APP_VERSION__
  })

  it('attaches Urania context to engine and workflow bodies', async () => {
    ;(globalThis as Record<string, unknown>).__APP_VERSION__ = '0.5.0'
    const fetchMock = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ engine_id: 'panchanga', result: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const birth = {
      name: 'Test Witness',
      date: '1990-01-01',
      time: '12:00:00',
      latitude: 12.9716,
      longitude: 77.5946,
      timezone: 'Asia/Kolkata',
    }
    await calculateEngine('panchanga', birth)
    await runWorkflow('daily-practice', birth)

    for (const [, init] of fetchMock.mock.calls) {
      const body = JSON.parse(String((init as RequestInit).body))
      expect(body.client_context).toEqual({
        source_client: 'urania',
        device_platform: 'web',
        device_app_version: '0.5.0',
      })
    }
  })

  it('overrides caller-supplied context on raw engine calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ engine_id: 'panchanga', result: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await calculateEngineRaw('panchanga', {
      options: {},
      client_context: { source_client: 'raycast-noesis' },
    })

    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))
    expect(body.client_context.source_client).toBe('urania')
  })
})
