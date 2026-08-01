export const PROTECTED_APP_HOST = 'app.urania.tryambakam.space'
export const DEFAULT_PROTECTED_APP_ORIGIN = `https://${PROTECTED_APP_HOST}`

export interface ProtectedOriginOptions {
  development?: boolean
  allowedHosts?: readonly string[]
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Validate the landing's only cross-boundary navigation target.
 *
 * Production accepts one HTTPS origin and deliberately rejects paths, query
 * strings, fragments, credentials, and ports. Development may use an HTTP
 * loopback origin, but it never broadens the production hostname allowlist.
 */
export function validateProtectedAppOrigin(
  raw: string,
  {
    development = false,
    allowedHosts = [PROTECTED_APP_HOST],
  }: ProtectedOriginOptions = {},
): string {
  if (typeof raw !== 'string' || raw.trim() !== raw || raw.length === 0) {
    throw new Error('VITE_PROTECTED_APP_ORIGIN must be a non-empty, trimmed URL')
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('VITE_PROTECTED_APP_ORIGIN must be an absolute URL')
  }

  if (url.username || url.password) {
    throw new Error('VITE_PROTECTED_APP_ORIGIN must not contain credentials')
  }
  if (url.search || url.hash) {
    throw new Error('VITE_PROTECTED_APP_ORIGIN must not contain a query or fragment')
  }
  if (url.pathname !== '/') {
    throw new Error('VITE_PROTECTED_APP_ORIGIN must identify an origin, not a path')
  }

  const loopbackDevelopment =
    development && url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname)
  if (url.protocol !== 'https:' && !loopbackDevelopment) {
    throw new Error('VITE_PROTECTED_APP_ORIGIN must use HTTPS outside loopback development')
  }

  if (loopbackDevelopment) return url.origin

  const normalizedAllowedHosts = new Set(allowedHosts.map((host) => host.toLowerCase()))
  if (!normalizedAllowedHosts.has(url.hostname.toLowerCase())) {
    throw new Error(`VITE_PROTECTED_APP_ORIGIN host is not allowlisted: ${url.hostname}`)
  }
  if (url.port) {
    throw new Error('VITE_PROTECTED_APP_ORIGIN must not contain a production port')
  }

  return url.origin
}

export function protectedAppHref(
  raw = DEFAULT_PROTECTED_APP_ORIGIN,
  options: ProtectedOriginOptions = {},
): string {
  return `${validateProtectedAppOrigin(raw, options)}/`
}
