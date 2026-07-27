import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadViewerContext } from './viewerContext'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadViewerContext', () => {
  it('loads the server-authored presentation capability with credentials', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ capabilities: { operator: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadViewerContext()).resolves.toEqual({
      capabilities: { operator: true },
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/viewer-context', {
      credentials: 'include',
      headers: { accept: 'application/json' },
    })
  })

  it('rejects malformed or failed responses instead of granting capability', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ capabilities: { operator: 'yes' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    await expect(loadViewerContext()).rejects.toThrow('viewer context response was invalid')
  })
})
