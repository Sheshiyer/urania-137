import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculateEngine, calculateEngineRaw, fetchCapabilities, normalizeAvailability, runWorkflow } from '../selemeneApi'

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

describe('fetchCapabilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GETs /api/selemene/api/v1/engines/capabilities and returns rows', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({
      capabilities: [{ contract_version: 'v1', engine_id: 'tarot', display_name: 'Tarot',
        availability: 'available', runtime_kind: 'typescript', dependencies: [] }],
      count: 1,
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const rows = await fetchCapabilities()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/selemene/api/v1/engines/capabilities')
    expect(rows).toHaveLength(1)
    expect(rows[0].availability).toBe('available')
  })

  it('returns [] on 404 (pre-capability deployment)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })))
    expect(await fetchCapabilities()).toEqual([])
  })

  it('throws on other non-2xx responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 503 })))
    await expect(fetchCapabilities()).rejects.toThrow('capabilities 503')
  })

  it('normalises unknown availability to declared', () => {
    expect(normalizeAvailability('available')).toBe('available')
    expect(normalizeAvailability('turbo')).toBe('declared')
    expect(normalizeAvailability(undefined)).toBe('declared')
  })
})
