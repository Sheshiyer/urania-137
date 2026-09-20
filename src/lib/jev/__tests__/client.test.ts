import { describe, it, expect, vi, afterEach } from 'vitest'
import { validateEngineOutput, extractUnknownEngine, JevApiError } from '../client'

afterEach(() => {
  vi.restoreAllMocks()
})

const VALIDATE_RESPONSE = {
  engineId: 'test-engine',
  completeness: 0.9,
  quality: { score: 3.0, confidence: 0.85 },
  primaryKind: { choice: 'fact-grid', confidence: 0.9 },
  fieldFlags: { name: 0.95 },
}

const EXTRACT_RESPONSE = {
  engineId: 'test-engine',
  classifiedKind: 'fact-grid',
  kindConfidence: 0.88,
  elements: [{ id: 'el-1', title: 'Test', sourceSystem: 'test', sourcePath: 'test.result', kind: 'fact-grid' }],
  fieldCount: 3,
  extractedCount: 2,
}

describe('validateEngineOutput', () => {
  it('posts to /api/selemene/validate and returns parsed JSON', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(VALIDATE_RESPONSE), { status: 200 }),
    )
    const result = await validateEngineOutput('test-engine', { name: 'Aries' })
    expect(result).toEqual(VALIDATE_RESPONSE)
    expect(spy).toHaveBeenCalledWith('/api/selemene/validate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ engineId: 'test-engine', payload: { name: 'Aries' } }),
    }))
  })

  it('throws JevApiError on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ error: 'NOT_CONFIGURED', message: 'Jev key missing' }), { status: 501 }),
    )
    try {
      await validateEngineOutput('test', {})
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(JevApiError)
      const e = err as JevApiError
      expect(e.status).toBe(501)
      expect(e.code).toBe('NOT_CONFIGURED')
    }
  })

  it('handles non-JSON error bodies gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    )
    await expect(validateEngineOutput('test', {})).rejects.toThrow(JevApiError)
  })
})

describe('extractUnknownEngine', () => {
  it('posts to /api/selemene/extract and returns parsed JSON', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(EXTRACT_RESPONSE), { status: 200 }),
    )
    const result = await extractUnknownEngine('test-engine', { name: 'Aries' })
    expect(result).toEqual(EXTRACT_RESPONSE)
    expect(spy).toHaveBeenCalledWith('/api/selemene/extract', expect.objectContaining({
      method: 'POST',
    }))
  })
})
