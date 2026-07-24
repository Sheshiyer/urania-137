/**
 * APP build identity (release workflow) — distinct from the Selemene ENGINE
 * version shown in EngineStatusPanel (`health.version`). The three constants
 * are injected at build time via vite.config.ts `define` from package.json,
 * the wall clock, and `git rev-parse --short HEAD`; in tests (vitest runs
 * without Vite's define) they are absent and every reader falls back to a
 * clearly-marked dev identity instead of throwing.
 */

export interface AppBuildInfo {
  /** Semver from package.json at build time, e.g. "0.2.0". */
  version: string
  /** ISO build timestamp, e.g. "2026-07-28T09:12:33.456Z" ('' when unknown). */
  buildTime: string
  /** Short git SHA at build time, or 'dev' when git was unavailable. */
  sha: string
}

/** Pure reader — tolerates missing/garbage globals so tests and dev never crash. */
export function readBuildInfo(g: { version?: unknown; buildTime?: unknown; sha?: unknown }): AppBuildInfo {
  return {
    version: typeof g.version === 'string' && g.version.length > 0 ? g.version : '0.0.0-dev',
    buildTime: typeof g.buildTime === 'string' ? g.buildTime : '',
    sha: typeof g.sha === 'string' && g.sha.length > 0 ? g.sha : 'dev',
  }
}

/** The build identity of the running bundle. */
export function appBuildInfo(): AppBuildInfo {
  return readBuildInfo({
    version: typeof __APP_VERSION__ === 'undefined' ? undefined : __APP_VERSION__,
    buildTime: typeof __APP_BUILD_TIME__ === 'undefined' ? undefined : __APP_BUILD_TIME__,
    sha: typeof __APP_BUILD_SHA__ === 'undefined' ? undefined : __APP_BUILD_SHA__,
  })
}

/** The one-line badge form: `v0.2.0 · abc1234`. */
export function formatVersionBadge(info: AppBuildInfo): string {
  return info.sha ? `v${info.version} · ${info.sha}` : `v${info.version}`
}

/** Deterministic UTC rendering of the build ISO: `2026-07-28 09:12:33 UTC`. */
export function formatBuildTime(iso: string): string {
  if (!iso) return 'unknown'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'unknown'
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
  )
}
