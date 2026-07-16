/**
 * Server-side proxy to the Selemene API.
 *
 * Why this exists:
 *  - The Selemene API requires an `X-API-Key`, and `VITE_` env vars are inlined
 *    into the public client bundle — so the key must never live in the browser.
 *    Here it is read from a server-only env var and injected server-side.
 *  - The upstream API returns no `Access-Control-Allow-Origin` for our domain,
 *    so a direct browser call is CORS-blocked. The SPA calls this same-origin
 *    endpoint (`/api/selemene/...`) instead; the proxy makes the cross-origin
 *    call server-side where CORS does not apply.
 *
 * Runs as a Vercel Node serverless function. `[...path]` forwards any subpath,
 * e.g. `/api/selemene/api/v1/assets/generate` → `<base>/api/v1/assets/generate`.
 */

// Loosely typed to avoid a build-time dependency on @vercel/node.
export default async function handler(req: any, res: any) {
  const base = (process.env.SELEMENE_API_URL || 'https://selemene.tryambakam.space').replace(/\/+$/, '')
  const key = process.env.SELEMENE_API_KEY || ''

  const segments = req.query?.path
  const path = Array.isArray(segments) ? segments.join('/') : segments || ''
  const queryString = typeof req.url === 'string' && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const target = `${base}/${path}${queryString}`

  const method = (req.method || 'GET').toUpperCase()
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (key) headers['X-API-Key'] = key

  const hasBody = method !== 'GET' && method !== 'HEAD'
  const body = hasBody ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})) : undefined

  try {
    const upstream = await fetch(target, { method, headers, body })
    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    res.send(text)
  } catch (err: any) {
    res.status(502).json({ error: 'proxy_failed', message: String(err?.message || err) })
  }
}
