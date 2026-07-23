import { afterEach, describe, expect, it, vi } from 'vitest'
import { routeHandoff, type HandoffSinks } from '../useChatHandoff'
import type { SubmitPayload } from '../../lib/chat/stateMachine'
import { DAILY_LOCATION_STORAGE_KEY } from '../../lib/daily/location'

/**
 * W3-B routing contract: each SubmitPayload variant the story state machine
 * can emit must reach exactly one existing submit sink, with its arguments
 * untouched. Submit/save logic itself is out of scope (covered upstream).
 * Phase 3: the sinks feed the in-thread result surface — the daily sink now
 * carries the chat-resolved place (or `undefined` for "use my default").
 */

const makeSinks = (): HandoffSinks & { [K in keyof HandoffSinks]: ReturnType<typeof vi.fn> } => ({
  witness: vi.fn(),
  birth: vi.fn(),
  daily: vi.fn(),
})

const witnessPayload = {
  mode: 'natal-interpretation',
  report_level: 'L0',
  language: 'en',
  consciousness_level: 2,
  subjects: [
    {
      role: 'primary',
      name: 'Asha',
      birth_date: '1990-04-12',
      birth_time: '12:00',
      birth_time_confidence: 'unknown',
      birth_location_query: 'Ujjain, India',
      normalized_location: {
        display_name: 'Ujjain, India',
        latitude: 23.1765,
        longitude: 75.7885,
        timezone: 'Asia/Kolkata',
        provider: 'manual',
        confidence: 'manual',
      },
    },
  ],
  relationship_context: null,
  options: { output_format: 'markdown', include_rubric: true, include_pattern_extraction: true },
} as unknown as SubmitPayload

const birthData = { name: 'Asha', date: '1990-04-12', time: '12:00', latitude: 23.1765, longitude: 75.7885, timezone: 'Asia/Kolkata' }

const nominatimOk = () =>
  vi.fn(async (_input: unknown) => ({
    json: async () => [{ display_name: 'Bengaluru, Karnataka, India', lat: '12.9716', lon: '77.5946' }],
  }))

describe('routeHandoff — payload-variant routing (W3-B)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('witness AssetGenerateRequest → witness sink, request passed through untouched', async () => {
    const sinks = makeSinks()
    await routeHandoff(witnessPayload, sinks)
    expect(sinks.witness).toHaveBeenCalledTimes(1)
    expect(sinks.witness).toHaveBeenCalledWith(witnessPayload)
    expect(sinks.birth).not.toHaveBeenCalled()
    expect(sinks.daily).not.toHaveBeenCalled()
  })

  it('{ birthData, intention } → birth sink with both arguments', async () => {
    const sinks = makeSinks()
    await routeHandoff({ birthData, intention: 'clarity' }, sinks)
    expect(sinks.birth).toHaveBeenCalledTimes(1)
    expect(sinks.birth).toHaveBeenCalledWith(birthData, 'clarity')
    expect(sinks.witness).not.toHaveBeenCalled()
    expect(sinks.daily).not.toHaveBeenCalled()
  })

  it('{ birthData } without intention → birth sink, intention undefined', async () => {
    const sinks = makeSinks()
    await routeHandoff({ birthData }, sinks)
    expect(sinks.birth).toHaveBeenCalledWith(birthData, undefined)
    expect(sinks.witness).not.toHaveBeenCalled()
    expect(sinks.daily).not.toHaveBeenCalled()
  })

  it('{ locationQuery } → geocodes + remembers the place, then daily sink with the resolved location', async () => {
    const fetchMock = nominatimOk()
    vi.stubGlobal('fetch', fetchMock)
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    })

    const sinks = makeSinks()
    await routeHandoff({ locationQuery: 'Bengaluru' }, sinks)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain(encodeURIComponent('Bengaluru'))
    expect(sinks.daily).toHaveBeenCalledTimes(1)
    // Phase 3: the sink receives the resolved place so the in-thread daily
    // run uses it directly (no panel remount to re-resolve it).
    expect(sinks.daily).toHaveBeenCalledWith({
      display: 'Bengaluru, Karnataka, India',
      latitude: 12.9716,
      longitude: 77.5946,
      timezone: 'Etc/GMT-5', // 77.59°E → +5h
    })
    expect(sinks.witness).not.toHaveBeenCalled()
    expect(sinks.birth).not.toHaveBeenCalled()

    const remembered = JSON.parse(store.get(DAILY_LOCATION_STORAGE_KEY)!) as { display: string; timezone: string }
    expect(remembered.display).toBe('Bengaluru, Karnataka, India')
    expect(remembered.timezone).toBe('Etc/GMT-5')
  })

  it('{} (daily "use my default" skip) → daily sink with undefined, no geocode call', async () => {
    const fetchMock = nominatimOk()
    vi.stubGlobal('fetch', fetchMock)
    const sinks = makeSinks()
    await routeHandoff({}, sinks)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(sinks.daily).toHaveBeenCalledTimes(1)
    expect(sinks.daily).toHaveBeenCalledWith(undefined)
    expect(sinks.witness).not.toHaveBeenCalled()
    expect(sinks.birth).not.toHaveBeenCalled()
  })

  it('geocode failure still fires the daily run with the default place (place hint is never a blocker)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => [] })))
    const sinks = makeSinks()
    await routeHandoff({ locationQuery: 'nowhere-real' }, sinks)
    expect(sinks.daily).toHaveBeenCalledTimes(1)
    expect(sinks.daily).toHaveBeenCalledWith(undefined)
  })
})
