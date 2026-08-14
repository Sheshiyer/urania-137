#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import {
  collectLocalPreflight,
  missingReleasePathScripts,
  validateActionsPreflight,
  validateBackupReceipt,
  validateLocalPreflight,
} from '../release.mjs'

function command(argv, allowFailure = false) {
  const result = spawnSync(argv[0], argv.slice(1), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${argv.join(' ')} failed: ${(result.stderr || result.stdout || '').trim()}`)
  }
  return { status: result.status ?? 1, stdout: (result.stdout || '').trim() }
}

function parseArgs(argv) {
  const parsed = { mode: 'local', sha: null, version: null, receipt: process.env.URANIA_BACKUP_RECEIPT ?? null }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--mode') parsed.mode = argv[++index]
    else if (arg === '--sha') parsed.sha = argv[++index]
    else if (arg === '--version') parsed.version = argv[++index]
    else if (arg === '--receipt') parsed.receipt = argv[++index]
    else throw new Error(`unknown argument: ${arg}`)
  }
  if (!['local', 'actions'].includes(parsed.mode)) throw new Error('--mode must be local|actions')
  return parsed
}

function readPackageVersion() {
  return JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version
}

function readReceipt(path) {
  if (!path) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function checkConclusion(ownerRepo, sha) {
  const response = command(
    [
      'gh',
      'api',
      `repos/${ownerRepo}/commits/${sha}/check-runs`,
      '--jq',
      '[.check_runs[] | select(.name == "Production gate")][0].conclusion // "missing"',
    ],
    true,
  )
  return response.status === 0 ? response.stdout || 'missing' : 'unavailable'
}

function collectActionsPreflight(args) {
  if (!args.sha) throw new Error('--sha is required in actions mode')
  command(['git', 'fetch', '--quiet', 'origin', 'main', '--tags'])
  const originMain = command(['git', 'rev-parse', 'refs/remotes/origin/main']).stdout
  const githubSha = process.env.GITHUB_SHA ?? command(['git', 'rev-parse', 'HEAD']).stdout
  const packageVersion = readPackageVersion()
  const requestedVersion = args.version ?? process.env.RELEASE_VERSION ?? ''
  const ownerRepo = process.env.GITHUB_REPOSITORY ?? command(['gh', 'repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']).stdout
  const tag = `v${requestedVersion}`
  const localTagExists = command(['git', 'tag', '--list', tag]).stdout === tag
  const remoteTagExists = command(
    ['git', 'ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${tag}`, `refs/tags/${tag}^{}`],
    true,
  ).status === 0
  const receipt = readReceipt(args.receipt)
  return {
    requestedSha: args.sha,
    githubSha,
    originMain,
    ciConclusion: checkConclusion(ownerRepo, args.sha),
    localTagExists,
    remoteTagExists,
    backupReceiptValid: validateBackupReceipt(receipt, args.sha),
    packageVersion,
    requestedVersion,
    missingReleasePathScripts: missingReleasePathScripts(),
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const version = args.version ?? readPackageVersion()
  const input = args.mode === 'actions'
    ? collectActionsPreflight({ ...args, version })
    : collectLocalPreflight(version, { ...process.env, URANIA_BACKUP_RECEIPT: args.receipt ?? '' })
  const issues = args.mode === 'actions' ? validateActionsPreflight(input) : validateLocalPreflight(input)
  console.log(JSON.stringify({ ok: issues.length === 0, mode: args.mode, issues, input }, null, 2))
  if (issues.length > 0) process.exitCode = 1
}

try {
  main()
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }))
  process.exitCode = 1
}
