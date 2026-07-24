import { describe, expect, it } from 'vitest'
import {
  buildReleaseNotes,
  computeNextVersion,
  groupCommits,
  PROD_URL,
  syncLockfileVersion,
} from '../../../scripts/release.mjs'

/**
 * Release workflow — the pure helpers behind scripts/release.mjs. The script
 * guards its main behind an import-meta check, so importing it here is
 * side-effect free.
 */
describe('computeNextVersion', () => {
  it('bumps patch by default and on request', () => {
    expect(computeNextVersion('0.1.0')).toBe('0.1.1')
    expect(computeNextVersion('0.1.0', 'patch')).toBe('0.1.1')
  })

  it('bumps minor and major, resetting the lower segments', () => {
    expect(computeNextVersion('0.1.4', 'minor')).toBe('0.2.0')
    expect(computeNextVersion('0.1.4', 'major')).toBe('1.0.0')
  })

  it('accepts an explicit X.Y.Z', () => {
    expect(computeNextVersion('0.1.0', '1.4.2')).toBe('1.4.2')
  })

  it('rejects garbage', () => {
    expect(() => computeNextVersion('0.1.0', 'banana')).toThrow(/Invalid bump/)
    expect(() => computeNextVersion('0.1', 'patch')).toThrow(/not valid semver/)
  })
})

describe('groupCommits', () => {
  const oneline = [
    'aaa1111 feat(cf-auth): live-auth polish',
    'bbb2222 fix: correct logout redirect',
    'ccc3333 docs(cf-auth): phase-5 sign-off',
    'ddd4444 chore(release): v0.1.0',
    'eee5555 test: add me classification cases',
    'fff6666 random subject without prefix',
    'ggg7777 refactor: regroup something',
  ].join('\n')

  it('groups by conventional prefix with other as the catch-all', () => {
    const g = groupCommits(oneline)
    expect(g.feat).toHaveLength(1)
    expect(g.fix).toHaveLength(1)
    expect(g.docs).toHaveLength(1)
    expect(g.chore).toHaveLength(1)
    expect(g.test).toHaveLength(1)
    expect(g.other).toHaveLength(2) // no prefix + refactor (not a headline group)
  })

  it('strips the conventional prefix from the rendered subject', () => {
    const g = groupCommits(oneline)
    expect(g.feat[0]).toEqual({ hash: 'aaa1111', subject: 'live-auth polish' })
    expect(g.other[0].subject).toBe('random subject without prefix')
  })

  it('handles empty input', () => {
    const g = groupCommits('')
    expect(Object.values(g).every((arr) => arr.length === 0)).toBe(true)
  })

  it('never lets a prefix collide with Object.prototype members', () => {
    // "constructor:" used to crash: groups.constructor is a function, so the
    // truthiness check passed and .push exploded. Must fall into 'other'.
    const g = groupCommits('aaa1111 constructor: sneaky subject\nbbb2222 toString: another one')
    expect(g.other).toHaveLength(2)
    expect(g.other[0].subject).toBe('sneaky subject')
  })
})

describe('syncLockfileVersion', () => {
  it('syncs both the root version and packages[""].version', () => {
    const lock = { version: '0.2.0', packages: { '': { version: '0.2.0' }, 'node_modules/x': { version: '1.0.0' } } }
    syncLockfileVersion(lock, '0.3.0')
    expect(lock.version).toBe('0.3.0')
    expect(lock.packages[''].version).toBe('0.3.0')
    expect(lock.packages['node_modules/x'].version).toBe('1.0.0') // untouched
  })

  it('tolerates missing fields and non-objects', () => {
    expect(syncLockfileVersion({}, '1.0.0')).toEqual({})
    expect(syncLockfileVersion(null, '1.0.0')).toBeNull()
  })
})

describe('buildReleaseNotes', () => {
  const groups = groupCommits('aaa1111 feat: shiny thing\nbbb2222 fix: dull bug')

  it('includes the version heading and the production URL', () => {
    const notes = buildReleaseNotes('0.2.0', groups)
    expect(notes).toContain('## Urania 137 — v0.2.0')
    expect(notes).toContain(`**Production:** ${PROD_URL}`)
    expect(notes).toContain('### Features')
    expect(notes).toContain('- shiny thing (aaa1111)')
    expect(notes).toContain('### Fixes')
    expect(notes).not.toContain('### Docs')
  })

  it('appends the deployment URL when given one', () => {
    const notes = buildReleaseNotes('0.2.0', groups, { deployedUrl: 'https://urania-137.pages.dev' })
    expect(notes).toContain('**Deployed:** https://urania-137.pages.dev')
  })

  it('notes when there is nothing since the previous tag', () => {
    expect(buildReleaseNotes('0.2.0', groupCommits(''))).toContain('_No commits since the previous tag._')
  })
})
