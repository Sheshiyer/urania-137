#!/usr/bin/env node
/**
 * Release workflow — version bump + GitHub release (+ optional CF Pages deploy).
 *
 *   node scripts/release.mjs [patch|minor|major|X.Y.Z] [--dry-run] [--deploy] [--yes]
 *
 * What it does (non-dry run):
 *   1. Guards: clean tracked tree, target tag absent, `gh auth status` ok.
 *   2. Bumps the semver in package.json (default patch; explicit X.Y.Z validated).
 *   3. Generates release notes from `git log <last-tag>..HEAD --oneline`,
 *      grouped by conventional-commit prefix (feat/fix/docs/chore/test/other).
 *   4. Commits package.json + package-lock.json (chore(release): vX.Y.Z),
 *      creates annotated tag vX.Y.Z, pushes the current branch and the tag.
 *   5. Creates the GitHub release with the notes.
 *   6. --deploy: runs the production deploy and appends the deployment URL to
 *      the release notes via `gh release edit`.
 *
 * The pure helpers are exported for unit tests; main only runs when the file
 * is executed directly.
 */
import { execSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { pathToFileURL } from 'node:url'

export const PROD_URL = 'https://urania.tryambakam.space'
const DEPLOY_CMD =
  'npm run build && wrangler pages deploy dist --project-name urania-137 --branch main --commit-dirty=true'
const FULL_HISTORY_CAP = 50

const SEMVER_RE = /^\d+\.\d+\.\d+$/
const CONVENTIONAL_RE = /^(\w+)(\([^)]*\))?!?:\s*/

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested from src/lib/__tests__/release.test.ts)
// ---------------------------------------------------------------------------

/** Compute the next version. `bump` is patch|minor|major or an explicit X.Y.Z. */
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

/** Group `git log --oneline` lines by conventional-commit prefix. */
export function groupCommits(oneline) {
  const groups = { feat: [], fix: [], docs: [], chore: [], test: [], other: [] }
  for (const line of oneline.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const space = trimmed.indexOf(' ')
    const hash = space === -1 ? trimmed : trimmed.slice(0, space)
    const subject = space === -1 ? '' : trimmed.slice(space + 1)
    const m = subject.match(CONVENTIONAL_RE)
    // Object.hasOwn — NOT truthiness: a subject like "constructor: …" would
    // otherwise resolve groups.constructor (a function) and crash on .push.
    const kind = m && Object.hasOwn(groups, m[1]) ? m[1] : 'other'
    const clean = m ? subject.slice(m[0].length) : subject
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

/** Render the release notes markdown. `groups` comes from groupCommits. */
export function buildReleaseNotes(version, groups, { deployedUrl = null } = {}) {
  const lines = [`## Urania 137 — v${version}`, '', `**Production:** ${PROD_URL}`, '']
  let any = false
  for (const [key, title] of GROUP_TITLES) {
    const items = groups[key] ?? []
    if (items.length === 0) continue
    any = true
    lines.push(`### ${title}`, '')
    for (const c of items) lines.push(`- ${c.subject} (${c.hash})`)
    lines.push('')
  }
  if (!any) lines.push('_No commits since the previous tag._', '')
  if (deployedUrl) lines.push(`**Deployed:** ${deployedUrl}`, '')
  return lines.join('\n').trimEnd() + '\n'
}

/**
 * Sync the version fields of a parsed package-lock.json to `next` (the root
 * "version" plus packages[""].version). Returns the same object for chaining;
 * callers write it back. Keeps the lockfile from drifting when only
 * package.json is bumped.
 */
export function syncLockfileVersion(lock, next) {
  if (lock && typeof lock === 'object') {
    if (typeof lock.version === 'string') lock.version = next
    const root = lock.packages?.['']
    if (root && typeof root.version === 'string') root.version = next
  }
  return lock
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim()
}

function fail(msg) {
  console.error(`\nrelease: ✗ ${msg}`)
  process.exit(1)
}

function runInherited(argv, opts = {}) {
  const res = spawnSync(argv[0], argv.slice(1), { stdio: 'inherit', ...opts })
  if (res.status !== 0) fail(`command failed (${res.status}): ${argv.join(' ')}`)
  return res
}

function parseArgs(argv) {
  const args = { bump: 'patch', dryRun: false, deploy: false, yes: false }
  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true
    else if (a === '--deploy') args.deploy = true
    else if (a === '--yes' || a === '-y') args.yes = true
    else if (['patch', 'minor', 'major'].includes(a) || SEMVER_RE.test(a)) args.bump = a
    else fail(`unknown argument: ${a}`)
  }
  return args
}

async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await rl.question(`${question} [y/N] `)
    return /^y(es)?$/i.test(answer.trim())
  } finally {
    rl.close()
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  // --- guards -------------------------------------------------------------
  const dirty = sh('git status --porcelain')
    .split('\n')
    .filter((l) => l && !l.startsWith('??'))
  if (dirty.length > 0) {
    fail(
      `tracked working tree is dirty — commit or stash first:\n${dirty.map((l) => `    ${l}`).join('\n')}`,
    )
  }

  const ghAuth = spawnSync('gh', ['auth', 'status'], { stdio: 'pipe' })
  if (ghAuth.status !== 0) fail('`gh auth status` failed — authenticate the GitHub CLI first (gh auth login)')

  const branch = sh('git rev-parse --abbrev-ref HEAD')
  const pkgPath = new URL('../package.json', import.meta.url)
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const next = computeNextVersion(pkg.version, args.bump)
  const tag = `v${next}`

  if (sh(`git tag -l "${tag}"`)) fail(`tag ${tag} already exists — pick a higher version`)

  const lastTag = sh("git tag -l 'v*' --sort=-v:refname").split('\n')[0] || null
  const logCmd = lastTag ? `git log ${lastTag}..HEAD --oneline` : `git log --oneline -n ${FULL_HISTORY_CAP}`
  const oneline = sh(logCmd)
  const groups = groupCommits(oneline)
  const notes = buildReleaseNotes(next, groups)

  // --- plan ----------------------------------------------------------------
  console.log(`\nrelease: plan`)
  console.log(`  current version : v${pkg.version}`)
  console.log(`  next version    : v${next}  (${args.bump})`)
  console.log(`  tag             : ${tag}  (annotated)`)
  console.log(`  branch          : ${branch}`)
  console.log(`  notes from      : ${lastTag ? `${lastTag}..HEAD` : `full history (capped at ${FULL_HISTORY_CAP})`}`)
  console.log(`\n--- release notes ---\n${notes}----------------------`)
  console.log(`\n  commands:`)
  console.log(`    git add package.json package-lock.json && git commit -m "chore(release): ${tag}"`)
  console.log(`    git tag -a ${tag} -m "Urania 137 ${tag}"`)
  console.log(`    git push origin ${branch} && git push origin ${tag}`)
  console.log(`    gh release create ${tag} --title "${tag}" --notes-file -`)
  if (args.deploy) console.log(`    ${DEPLOY_CMD}`)

  if (args.dryRun) {
    console.log('\nrelease: dry run — no side effects.')
    return
  }

  // --- confirm --------------------------------------------------------------
  if (!args.yes) {
    if (!process.stdin.isTTY) fail('non-interactive shell — re-run with --yes to confirm the push')
    const ok = await confirm(`\nRelease ${tag} (commit, tag, push, GitHub release)?`)
    if (!ok) fail('aborted by operator')
  }

  // --- execute --------------------------------------------------------------
  pkg.version = next
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  const staged = ['package.json']
  const lockPath = new URL('../package-lock.json', import.meta.url)
  if (existsSync(lockPath)) {
    const lock = syncLockfileVersion(JSON.parse(readFileSync(lockPath, 'utf8')), next)
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n')
    staged.push('package-lock.json')
  }
  runInherited(['git', 'add', ...staged])
  runInherited(['git', 'commit', '-m', `chore(release): ${tag}`])
  runInherited(['git', 'tag', '-a', tag, '-m', `Urania 137 ${tag}`])
  runInherited(['git', 'push', 'origin', branch])
  runInherited(['git', 'push', 'origin', tag])

  const rel = spawnSync('gh', ['release', 'create', tag, '--title', tag, '--notes-file', '-'], {
    input: notes,
    encoding: 'utf8',
  })
  if (rel.status !== 0) fail(`gh release create failed:\n${rel.stderr}`)
  const releaseUrl = sh(`gh release view ${tag} --json url -q .url`)

  // --- optional deploy --------------------------------------------------------
  let deployedUrl = null
  if (args.deploy) {
    runInherited(['npm', 'run', 'build'])
    const dep = spawnSync(
      'wrangler',
      ['pages', 'deploy', 'dist', '--project-name', 'urania-137', '--branch', 'main', '--commit-dirty=true'],
      { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] },
    )
    if (dep.status !== 0) fail('wrangler pages deploy failed')
    const m = (dep.stdout || '').match(/https:\/\/\S+/)
    deployedUrl = m ? m[0] : PROD_URL
    console.log(`release: deployed → ${deployedUrl}`)
    const edit = spawnSync('gh', ['release', 'edit', tag, '--notes', buildReleaseNotes(next, groups, { deployedUrl })], {
      encoding: 'utf8',
    })
    if (edit.status !== 0) console.error('release: warning — gh release edit failed; notes not updated with deploy URL')
  }

  // --- summary ----------------------------------------------------------------
  console.log(`\nrelease: ✓ done`)
  console.log(`  version : ${tag}`)
  console.log(`  tag     : ${tag} (pushed to origin)`)
  console.log(`  release : ${releaseUrl}`)
  if (deployedUrl) console.log(`  deploy  : ${deployedUrl}`)
}

const invokedAs = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === invokedAs) {
  main().catch((err) => fail(err?.message ?? String(err)))
}
