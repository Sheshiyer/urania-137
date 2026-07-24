import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { appBuildInfo, formatBuildTime, formatVersionBadge, readBuildInfo } from '../appVersion'

/**
 * Release workflow — app build identity. The pure readers are exercised
 * directly; the global-backed reader is tested by stubbing the vite-define
 * globals (vitest runs in node without Vite's define pass).
 */
describe('readBuildInfo', () => {
  it('passes through well-formed injected values', () => {
    expect(readBuildInfo({ version: '0.2.0', buildTime: '2026-07-28T09:12:33.000Z', sha: 'abc1234' })).toEqual({
      version: '0.2.0',
      buildTime: '2026-07-28T09:12:33.000Z',
      sha: 'abc1234',
    })
  })

  it('falls back to a dev identity when the defines are absent or garbage', () => {
    expect(readBuildInfo({})).toEqual({ version: '0.0.0-dev', buildTime: '', sha: 'dev' })
    expect(readBuildInfo({ version: 42, buildTime: null, sha: '' })).toEqual({
      version: '0.0.0-dev',
      buildTime: '',
      sha: 'dev',
    })
  })
})

describe('formatVersionBadge', () => {
  it('renders `vX.Y.Z · sha`', () => {
    expect(formatVersionBadge({ version: '0.2.0', buildTime: '', sha: 'abc1234' })).toBe('v0.2.0 · abc1234')
    expect(formatVersionBadge({ version: '0.2.0', buildTime: '', sha: 'dev' })).toBe('v0.2.0 · dev')
  })

  it('omits the sha segment when it is empty', () => {
    expect(formatVersionBadge({ version: '0.2.0', buildTime: '', sha: '' })).toBe('v0.2.0')
  })
})

describe('formatBuildTime', () => {
  it('renders a deterministic UTC timestamp', () => {
    expect(formatBuildTime('2026-07-28T09:12:33.456Z')).toBe('2026-07-28 09:12:33 UTC')
  })

  it('reports unknown for empty or unparseable input', () => {
    expect(formatBuildTime('')).toBe('unknown')
    expect(formatBuildTime('not-a-date')).toBe('unknown')
  })
})

describe('appBuildInfo (vite-define globals)', () => {
  afterEach(() => {
    const g = globalThis as Record<string, unknown>
    delete g.__APP_VERSION__
    delete g.__APP_BUILD_TIME__
    delete g.__APP_BUILD_SHA__
  })

  it('falls back to the dev identity when no define ran', () => {
    expect(appBuildInfo()).toEqual({ version: '0.0.0-dev', buildTime: '', sha: 'dev' })
  })

  it('reads the injected globals when present', () => {
    const g = globalThis as Record<string, unknown>
    g.__APP_VERSION__ = '1.2.3'
    g.__APP_BUILD_TIME__ = '2026-01-02T03:04:05.000Z'
    g.__APP_BUILD_SHA__ = 'deadbee'
    expect(appBuildInfo()).toEqual({ version: '1.2.3', buildTime: '2026-01-02T03:04:05.000Z', sha: 'deadbee' })
  })
})

describe('vite.config define sanity', () => {
  it('injects all three build constants via define', () => {
    const configPath = fileURLToPath(new URL('../../../vite.config.ts', import.meta.url))
    const src = readFileSync(configPath, 'utf8')
    expect(src).toContain('__APP_VERSION__')
    expect(src).toContain('__APP_BUILD_TIME__')
    expect(src).toContain('__APP_BUILD_SHA__')
    expect(src).toMatch(/define\s*:/)
  })
})
