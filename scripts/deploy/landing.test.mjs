import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  buildDeployCommand,
  hashLandingArtifact,
  parseDeployArgs,
  parseDeploymentUrl,
  parseProjectList,
  stageLandingArtifact,
  validateDeployTarget,
  validateSourceState,
  validateStaticLandingConfig,
} from './landing.mjs'

const accountId = 'a'.repeat(32)
const sourceSha = 'b'.repeat(40)

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'urania-landing-test-'))
  const artifactDir = join(root, 'artifact')
  const stageRoot = join(root, 'stage')
  const configPath = join(root, 'wrangler.landing.toml')
  mkdirSync(join(artifactDir, 'assets'), { recursive: true })
  writeFileSync(join(artifactDir, 'index.html'), '<!doctype html><title>Landing</title>')
  writeFileSync(join(artifactDir, 'assets', 'landing.js'), 'console.log("landing")')
  writeFileSync(
    configPath,
    'name = "urania-137-landing"\ncompatibility_date = "2026-07-01"\npages_build_output_dir = "dist/landing"\n',
  )
  return { root, artifactDir, stageRoot, configPath }
}

test('requires an exact validated production target and confirmation', () => {
  assert.deepEqual(
    validateDeployTarget({
      project: 'urania-137-landing',
      accountId,
      branch: 'main',
      sha: sourceSha,
      confirm: 'urania-137-landing',
    }),
    { project: 'urania-137-landing', accountId, branch: 'main', sha: sourceSha },
  )
  assert.throws(
    () => validateDeployTarget({ project: 'urania-137-landing', accountId, branch: 'main', sha: sourceSha }),
    /--confirm/,
  )
  assert.throws(
    () => validateDeployTarget({ project: '../app', accountId, branch: 'main', sha: sourceSha, dryRun: true }),
    /project/,
  )
  assert.throws(
    () => validateDeployTarget({ project: 'landing', accountId: 'short', branch: 'main', sha: sourceSha, dryRun: true }),
    /account/,
  )
  assert.throws(
    () => validateDeployTarget({ project: 'landing', accountId, branch: 'main', sha: 'short', dryRun: true }),
    /source SHA/,
  )
})

test('stages only dist/landing and the landing-only config', (t) => {
  const paths = fixture()
  t.after(() => rmSync(paths.root, { recursive: true, force: true }))
  const staged = stageLandingArtifact(paths)
  assert.deepEqual(readdirSync(staged.stageRoot).sort(), ['dist', 'wrangler.toml'])
  assert.deepEqual(readdirSync(join(staged.stageRoot, 'dist')), ['landing'])
  assert.match(readFileSync(join(staged.artifactDir, 'index.html'), 'utf8'), /Landing/)
  assert.doesNotMatch(readFileSync(staged.configPath, 'utf8'), /d1_databases|functions/i)
})

test('binds receipts to deterministic artifact bytes and a clean exact HEAD', (t) => {
  const paths = fixture()
  t.after(() => rmSync(paths.root, { recursive: true, force: true }))
  const first = hashLandingArtifact(paths.artifactDir)
  const second = hashLandingArtifact(paths.artifactDir)
  assert.match(first, /^[a-f0-9]{64}$/)
  assert.equal(second, first)
  writeFileSync(join(paths.artifactDir, 'assets', 'landing.js'), 'console.log("changed")')
  assert.notEqual(hashLandingArtifact(paths.artifactDir), first)

  assert.deepEqual(
    validateSourceState({ expectedSha: sourceSha, head: `${sourceSha}\n`, porcelain: '' }),
    { sourceSha, clean: true },
  )
  assert.throws(
    () => validateSourceState({ expectedSha: sourceSha, head: 'c'.repeat(40), porcelain: '' }),
    /must equal/,
  )
  assert.throws(
    () => validateSourceState({ expectedSha: sourceSha, head: sourceSha, porcelain: ' M package.json' }),
    /clean repository/,
  )
})

test('rejects a landing config that can discover Functions or D1', (t) => {
  const paths = fixture()
  t.after(() => rmSync(paths.root, { recursive: true, force: true }))
  writeFileSync(paths.configPath, 'pages_build_output_dir = "dist/landing"\n[[d1_databases]]\nbinding = "DB"\n')
  assert.throws(() => validateStaticLandingConfig(paths.configPath), /static-only/)
})

test('builds a direct-upload command rooted in the isolated stage', () => {
  assert.deepEqual(
    buildDeployCommand({
      wranglerBin: '/repo/node_modules/.bin/wrangler',
      project: 'urania-137-landing',
      branch: 'main',
      sha: sourceSha,
    }),
    [
      '/repo/node_modules/.bin/wrangler',
      'pages',
      'deploy',
      'dist/landing',
      '--project-name',
      'urania-137-landing',
      '--branch',
      'main',
      '--commit-hash',
      sourceSha,
      '--commit-dirty=false',
      '--config',
      'wrangler.toml',
    ],
  )
})

test('parses environment-backed dry-run arguments without accepting unknown flags', () => {
  const args = parseDeployArgs(['--sha', sourceSha, '--dry-run'], {
    CLOUDFLARE_ACCOUNT_ID: accountId,
    CLOUDFLARE_LANDING_PROJECT: 'urania-137-landing',
  })
  assert.equal(args.dryRun, true)
  assert.equal(args.accountId, accountId)
  assert.equal(args.sha, sourceSha)
  assert.throws(() => parseDeployArgs(['--surprise'], {}), /unknown argument/)
})

test('requires the exact live project and parses its immutable deployment URL', () => {
  const projects = JSON.stringify([
    { 'Project Name': 'urania-137', 'Project Domains': 'urania-137.pages.dev' },
    { 'Project Name': 'urania-137-landing', 'Project Domains': 'urania-137-landing.pages.dev' },
  ])
  assert.equal(parseProjectList(projects, 'urania-137-landing')['Project Name'], 'urania-137-landing')
  assert.throws(() => parseProjectList(projects, 'other-project'), /does not exist/)
  assert.equal(
    parseDeploymentUrl(
      'Deployment complete! Take a peek over at https://01234567.urania-137-landing.pages.dev',
      'urania-137-landing',
    ),
    'https://01234567.urania-137-landing.pages.dev',
  )
})
