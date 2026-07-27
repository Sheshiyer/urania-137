/**
 * Presentation capabilities authored by the authenticated Pages Function.
 *
 * This intentionally does not extend the frozen `/api/me` contract. It is
 * advisory UI context only: API authorization remains actor-scoped on the
 * server and never trusts this browser value.
 */
export interface ViewerContext {
  capabilities: {
    operator: boolean
  }
}

function isViewerContext(value: unknown): value is ViewerContext {
  if (typeof value !== 'object' || value === null) return false
  const capabilities = (value as { capabilities?: unknown }).capabilities
  return (
    typeof capabilities === 'object' &&
    capabilities !== null &&
    typeof (capabilities as { operator?: unknown }).operator === 'boolean'
  )
}

export async function loadViewerContext(): Promise<ViewerContext> {
  const response = await fetch('/api/viewer-context', {
    credentials: 'include',
    headers: { accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`viewer context ${response.status}`)
  }
  const body: unknown = await response.json()
  if (!isViewerContext(body)) {
    throw new Error('viewer context response was invalid')
  }
  return body
}
