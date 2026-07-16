/**
 * Server-side proxy to the Selemene API (Vercel Node serverless function).
 *
 * Routed via `vercel.json`: `/api/selemene/:path*` → `/api/proxy?path=:path*`.
 * Injects the secret `X-API-Key` (server-only env var) so it never reaches the
 * browser bundle, and makes the cross-origin call server-side (the upstream API
 * sends no `Access-Control-Allow-Origin` for our domain, so a direct browser
 * call is CORS-blocked).
 */

// Loosely typed to avoid a build-time dependency on @vercel/node.
export default async function handler(req: any, res: any) {
  const base = (process.env.SELEMENE_API_URL || 'https://selemene.tryambakam.space').replace(/\/+$/, '')
  const key = process.env.SELEMENE_API_KEY || ''

  const raw = req.query?.path
  const path = Array.isArray(raw) ? raw.join('/') : raw || ''
  const target = `${base}/${path}`

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
