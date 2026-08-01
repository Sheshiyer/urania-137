#!/usr/bin/env node
/**
 * Urania release preparation and dispatch.
 *
 * Local code never deploys, tags, pushes, or creates a release. It either:
 *   --prepare <patch|minor|major>  update package metadata for review, or
 *   --version <X.Y.Z>             prove the already-committed version and,
 *                                 with --dispatch --yes, request release.yml.
 *
 * Production mutation belongs to the Environment-approved GitHub workflow.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const PROD_URL = 'https://urania.tryambakam.space'
const FULL_HISTORY_CAP = 50
const SEMVER_RE = /^\d+\.\d+\.\d+$/
const SHA_RE = /^[a-f0-9]{40}$/
const CONVENTIONAL_RE = /^(\w+)(\([^)]*\))?!?:\s*/
const RELEASE_PHASES = [
  'preflight',
  'verify',
  'backup',
  'deploy',
  'smoke',
  'attest',
  'draft',
  'verify-draft',
  'publish',
]

/** Compute the next version for preparation only. */
export function computeNextVersion(current, bump = 'patch') {
  if (!SEMVER_RE.test(current)) throw new Error(`Current version "${current}" is not valid semver`)
  if (SEMVER_RE.test(bump)) return bump
  const [maj, min, pat] = current.split('.').map(Number)
  switch (bump) {
    case 'patch':
      return `${maj}.${min}.${pat + 1}`
    case 'minor':
      return `${maj}.${min + 1}.0`
    case 'major':
      return `${maj + 1}.0.0`
    default:
      throw new Error(`Invalid bump "${bump}" — expected patch|minor|major|X.Y.Z`)
  }
}

export function groupCommits(oneline) {
  const groups = { feat: [], fix: [], docs: [], chore: [], test: [], other: [] }
  for (const line of oneline.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const space = trimmed.indexOf(' ')
    const hash = space === -1 ? trimmed : trimmed.slice(0, space)
    const subject = space === -1 ? '' : trimmed.slice(space + 1)
    const match = subject.match(CONVENTIONAL_RE)
    const kind = match && Object.hasOwn(groups, match[1]) ? match[1] : 'other'
    const clean = match ? subject.slice(match[0].length) : subject
    groups[kind].push({ hash, subject: clean || subject })
  }
  return groups
}

const GROUP_TITLES = [
  ['feat', 'Features'],
  ['fix', 'Fixes'],
  ['docs', 'Docs'],
  ['chore', 'Chores'],
  ['test', 'Tests'],
  ['other', 'Other'],
]

export function buildReleaseNotes(version, groups, { deployedUrl = null } = {}) {
  const lines = [`## Urania 137 — v${version}`, '', `**Production:** ${PROD_URL}`, '']
  let any = false
  for (const [key, title] of GROUP_TITLES) {
    const items = groups[key] ?? []
    if (items.length === 0) continue
    any = true
    lines.push(`### ${title}`, '')
    for (const commit of items) lines.push(`- ${commit.subject} (${commit.hash})`)
    lines.push('')
  }
  if (!any) lines.push('_No commits since the previous tag._', '')
  if (deployedUrl) lines.push(`**Deployed:** ${deployedUrl}`, '')
  return `${lines.join('\n').trimEnd()}\n`
}

export function syncLockfileVersion(lock, next) {
  if (lock && typeof lock === 'object') {
    if (typeof lock.version === 'string') lock.version = next
    const root = lock.packages?.['']
    if (root && typeof root.version === 'string') root.version = next
  }
  return lock
}

export function parseReleaseArgs(argv) {
  const args = { mode: null, bump: null, version: null, readinessRunId: null, dryRun: false, dispatch: false, yes: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--prepare') {
      const bump = argv[++index]
      if (!['patch', 'minor', 'major'].includes(bump)) throw new Error('--prepare requires patch|minor|major')
      if (args.mode) throw new Error('choose exactly one of --prepare or --version')
      args.mode = 'prepare'
      args.bump = bump
    } else if (arg === '--version') {
      const version = argv[++index]
      if (!SEMVER_RE.test(version ?? '')) throw new Error('--version requires X.Y.Z semver')
      if (args.mode) throw new Error('choose exactly one of --prepare or --version')
      args.mode = 'publish'
      args.version = version
    } else if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--readiness-run-id') {
      const runId = argv[++index]
      if (!/^\d+$/.test(runId ?? '')) throw new Error('--readiness-run-id requires a numeric workflow run id')
      args.readinessRunId = runId
    }
    else if (arg === '--dispatch') args.dispatch = true
    else if (arg === '--yes' || arg === '-y') args.yes = true
    else if (['patch', 'minor', 'major'].includes(arg) || SEMVER_RE.test(arg)) {
      throw new Error(`implicit bump "${arg}" is unsafe; use --prepare or --version`)
    } else throw new Error(`unknown argument: ${arg}`)
  }
  if (!args.mode) throw new Error('choose exactly one of --prepare or --version')
  if (args.mode === 'prepare' && args.dispatch) throw new Error('--dispatch is valid only with --version')
  if (args.dryRun && args.dispatch) throw new Error('--dry-run and --dispatch are mutually exclusive')
  return args
}

export function parsePorcelainStatus(output) {
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => (line.startsWith(' ') ? line.slice(1) : line))
}

export function validateLocalPreflight(input) {
  const issues = []
  if (parsePorcelainStatus(input.porcelain).length > 0) issues.push('working-tree-dirty')
  if (input.branch !== 'main') issues.push('local-branch-must-be-main')
  if (!SHA_RE.test(input.head) || input.head !== input.originMain) issues.push('head-must-equal-origin-main')
  if (input.ahead !== 0 || input.behind !== 0) issues.push('branch-must-not-be-ahead-or-behind')
  if (input.ciConclusion !== 'success') issues.push('production-gate-not-successful')
  if (input.localTagExists || input.remoteTagExists) issues.push('tag-already-exists')
  if (!input.backupReceiptValid) issues.push('backup-receipt-invalid')
  if (input.requestedVersion !== input.packageVersion) issues.push('requested-version-must-match-package')
  return [...new Set(issues)]
}

export function validateActionsPreflight(input) {
  const issues = []
  if (!SHA_RE.test(input.requestedSha)) issues.push('requested-sha-invalid')
  if (input.githubSha !== input.requestedSha) issues.push('github-sha-must-match-requested-sha')
  if (input.originMain !== input.requestedSha) issues.push('requested-sha-must-equal-origin-main')
  if (input.ciConclusion !== 'success') issues.push('production-gate-not-successful')
  if (input.localTagExists || input.remoteTagExists) issues.push('tag-already-exists')
  if (!input.backupReceiptValid) issues.push('backup-receipt-invalid')
  if (input.requestedVersion !== input.packageVersion) issues.push('requested-version-must-match-package')
  return [...new Set(issues)]
}

export function validateReleasePhases(phases) {
  if (
    phases.length !== RELEASE_PHASES.length ||
    RELEASE_PHASES.some((phase, index) => phases[index] !== phase)
  ) {
    return ['release-phase-order-invalid']
  }
  return []
}

export function publicationCleanupCommands(tag) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error(`invalid release tag: ${tag}`)
  return [['gh', 'release', 'delete', tag, '--cleanup-tag', '--yes']]
}

export function validateBackupReceipt(receipt, expectedSha) {
  return Boolean(
    receipt &&
      typeof receipt === 'object' &&
      receipt.gitSha === expectedSha &&
      receipt.restoreVerified === true &&
      typeof receipt.databaseId === 'string' &&
      receipt.databaseId.length > 0 &&
      typeof receipt.sha256 === 'string' &&
      /^[a-f0-9]{64}$/.test(receipt.sha256),
  )
}

function run(argv, { allowFailure = false, input } = {}) {
  const result = spawnSync(argv[0], argv.slice(1), {
    encoding: 'utf8',
    input,
    stdio: input === undefined ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'],
  })
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${argv.join(' ')} failed: ${(result.stderr || result.stdout || '').trim()}`)
  }
  return { status: result.status ?? 1, stdout: (result.stdout || '').trim(), stderr: (result.stderr || '').trim() }
}

function packageFiles() {
  return {
    packageUrl: new URL('../package.json', import.meta.url),
    lockUrl: new URL('../package-lock.json', import.meta.url),
  }
}

function readPackage() {
  return JSON.parse(readFileSync(packageFiles().packageUrl, 'utf8'))
}

function updatePackageVersion(next) {
  const { packageUrl, lockUrl } = packageFiles()
  const pkg = JSON.parse(readFileSync(packageUrl, 'utf8'))
  pkg.version = next
  writeFileSync(packageUrl, `${JSON.stringify(pkg, null, 2)}\n`)
  if (existsSync(lockUrl)) {
    const lock = syncLockfileVersion(JSON.parse(readFileSync(lockUrl, 'utf8')), next)
    writeFileSync(lockUrl, `${JSON.stringify(lock, null, 2)}\n`)
  }
}

function readReceipt(path) {
  if (!path || !existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function checkConclusion(ownerRepo, sha) {
  const response = run(
    [
      'gh',
      'api',
      `repos/${ownerRepo}/commits/${sha}/check-runs`,
      '--jq',
      '[.check_runs[] | select(.name == "Production gate")][0].conclusion // "missing"',
    ],
    { allowFailure: true },
  )
  return response.status === 0 ? response.stdout || 'missing' : 'unavailable'
}

export function collectLocalPreflight(version, env = process.env) {
  run(['git', 'fetch', '--quiet', 'origin', 'main', '--tags'])
  const porcelain = run(['git', 'status', '--porcelain=v1', '-uall']).stdout
  const branch = run(['git', 'branch', '--show-current']).stdout || 'HEAD'
  const head = run(['git', 'rev-parse', 'HEAD']).stdout
  const originMain = run(['git', 'rev-parse', 'refs/remotes/origin/main']).stdout
  const [behindText = '0', aheadText = '0'] = run([
    'git',
    'rev-list',
    '--left-right',
    '--count',
    'refs/remotes/origin/main...HEAD',
  ]).stdout.split(/\s+/)
  const tag = `v${version}`
  const localTagExists = run(['git', 'tag', '--list', tag]).stdout === tag
  const remoteTagExists = run(
    ['git', 'ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${tag}`, `refs/tags/${tag}^{}`],
    { allowFailure: true },
  ).status === 0
  const ownerRepo = run(['gh', 'repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']).stdout
  const ciConclusion = checkConclusion(ownerRepo, head)
  const receipt = readReceipt(env.URANIA_BACKUP_RECEIPT)
  return {
    porcelain,
    branch,
    head,
    originMain,
    ahead: Number(aheadText),
    behind: Number(behindText),
    ciConclusion,
    localTagExists,
    remoteTagExists,
    backupReceiptValid: validateBackupReceipt(receipt, head),
    packageVersion: readPackage().version,
    requestedVersion: version,
  }
}

function releaseNotes(version) {
  const tags = run(['git', 'tag', '--list', 'v*', '--sort=-v:refname']).stdout.split('\n').filter(Boolean)
  const lastTag = tags[0] ?? null
  const logArgs = lastTag
    ? ['git', 'log', `${lastTag}..HEAD`, '--oneline']
    : ['git', 'log', '--oneline', '-n', String(FULL_HISTORY_CAP)]
  return buildReleaseNotes(version, groupCommits(run(logArgs).stdout))
}

async function main() {
  const args = parseReleaseArgs(process.argv.slice(2))
  const pkg = readPackage()

  if (args.mode === 'prepare') {
    const dirty = parsePorcelainStatus(run(['git', 'status', '--porcelain=v1', '-uall']).stdout)
    if (dirty.length > 0) throw new Error(`working tree is dirty:\n${dirty.map((line) => `  ${line}`).join('\n')}`)
    const next = computeNextVersion(pkg.version, args.bump)
    console.log(JSON.stringify({ mode: 'prepare', currentVersion: pkg.version, nextVersion: next, dryRun: args.dryRun }, null, 2))
    if (!args.dryRun) updatePackageVersion(next)
    return
  }

  const preflight = collectLocalPreflight(args.version)
  const issues = validateLocalPreflight(preflight)
  const plan = {
    mode: 'publish',
    version: args.version,
    tag: `v${args.version}`,
    sha: preflight.head,
    dryRun: args.dryRun,
    dispatch: args.dispatch,
    readinessRunId: args.readinessRunId ?? process.env.URANIA_READINESS_RUN_ID ?? null,
    issues,
    notes: releaseNotes(args.version),
  }
  console.log(JSON.stringify(plan, null, 2))
  if (issues.length > 0) throw new Error(`release preflight failed: ${issues.join(', ')}`)
  if (!args.dispatch) return
  if (!args.yes) throw new Error('--dispatch requires --yes; review --dry-run output first')
  const readinessRunId = args.readinessRunId ?? process.env.URANIA_READINESS_RUN_ID
  if (!/^\d+$/.test(readinessRunId ?? '')) {
    throw new Error('--dispatch requires --readiness-run-id or URANIA_READINESS_RUN_ID')
  }
  run([
    'gh',
    'workflow',
    'run',
    'release.yml',
    '-f',
    `sha=${preflight.head}`,
    '-f',
    `version=${args.version}`,
    '-f',
    `readiness_run_id=${readinessRunId}`,
  ])
}

const invokedAs = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === invokedAs) {
  main().catch((error) => {
    console.error(`release: ✗ ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
