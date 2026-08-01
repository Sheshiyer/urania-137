#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const DEFAULT_LANDING_PROJECT = 'urania-137-landing'
const PROJECT_RE = /^[a-z0-9](?:[a-z0-9-]{0,56}[a-z0-9])?$/
const ACCOUNT_RE = /^[a-f0-9]{32}$/
const BRANCH_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._/-]{0,126}[A-Za-z0-9])?$/
const SHA_RE = /^[a-f0-9]{40}$/
const STATIC_CONFIG_FORBIDDEN = [
  /\[\[d1_databases\]\]/i,
  /\[vars\]/i,
  /functions(?:_directory)?\s*=/i,
  /CF_ACCESS_AUD/i,
  /SELEMENE_API_KEY/i,
]

function assertDirectory(path, label) {
  if (!existsSync(path) || !lstatSync(path).isDirectory()) {
    throw new Error(`${label} directory does not exist: ${path}`)
  }
}

function assertRegularFile(path, label) {
  if (!existsSync(path) || !lstatSync(path).isFile()) {
    throw new Error(`${label} file does not exist: ${path}`)
  }
}

function assertNoSymlinks(path, root = path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const candidate = join(path, entry.name)
    if (entry.isSymbolicLink()) {
      throw new Error(`landing artifact contains a symlink: ${relative(root, candidate)}`)
    }
    if (entry.isDirectory()) assertNoSymlinks(candidate, root)
  }
}

function assertWithinRoot(root, candidate, label) {
  const pathFromRoot = relative(root, candidate)
  if (pathFromRoot === '' || (!pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot))) return
  throw new Error(`${label} must stay inside the repository root`)
}

function regularFilesUnder(directory, root = directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const candidate = join(directory, entry.name)
      if (entry.isSymbolicLink()) {
        throw new Error(`landing artifact contains a symlink: ${relative(root, candidate)}`)
      }
      return entry.isDirectory() ? regularFilesUnder(candidate, root) : [candidate]
    })
}

export function hashLandingArtifact(artifactDir) {
  const artifact = resolve(artifactDir)
  assertDirectory(artifact, 'landing artifact')
  const digest = createHash('sha256')
  for (const file of regularFilesUnder(artifact)) {
    const path = relative(artifact, file)
    const bytes = readFileSync(file)
    digest.update(path)
    digest.update('\0')
    digest.update(String(bytes.byteLength))
    digest.update('\0')
    digest.update(bytes)
  }
  return digest.digest('hex')
}

export function validateSourceState({ expectedSha, head, porcelain }) {
  if (!SHA_RE.test(expectedSha ?? '') || head.trim() !== expectedSha) {
    throw new Error('deployment source SHA must equal the repository HEAD')
  }
  if (porcelain.trim()) throw new Error('deployment requires a clean repository worktree')
  return { sourceSha: expectedSha, clean: true }
}

function readSourceState(repositoryRoot, expectedSha) {
  const head = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
  if (head.status !== 0) throw new Error(`unable to read repository HEAD: ${head.stderr.trim()}`)
  const status = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
  if (status.status !== 0) throw new Error(`unable to read repository status: ${status.stderr.trim()}`)
  return validateSourceState({ expectedSha, head: head.stdout, porcelain: status.stdout })
}

export function validateDeployTarget({ project, accountId, branch, sha, confirm, dryRun = false }) {
  if (!PROJECT_RE.test(project ?? '')) throw new Error('invalid Cloudflare Pages project name')
  if (!ACCOUNT_RE.test(accountId ?? '')) throw new Error('invalid Cloudflare account id')
  if (!BRANCH_RE.test(branch ?? '') || branch.includes('..') || branch.includes('//')) {
    throw new Error('invalid deployment branch')
  }
  if (!SHA_RE.test(sha ?? '')) throw new Error('deployment requires an exact 40-character source SHA')
  if (!dryRun && confirm !== project) {
    throw new Error(`deployment requires --confirm ${project}`)
  }
  return { project, accountId, branch, sha }
}

export function parseProjectList(output, project) {
  let projects
  try {
    projects = JSON.parse(output)
  } catch {
    throw new Error('Wrangler project list did not return valid JSON')
  }
  if (!Array.isArray(projects)) throw new Error('Wrangler project list returned an unexpected payload')
  const match = projects.find((candidate) => candidate?.['Project Name'] === project)
  if (!match) throw new Error(`Cloudflare Pages project does not exist in the selected account: ${project}`)
  return match
}

export function parseDeploymentUrl(output, project) {
  const escapedProject = project.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = output.match(new RegExp(`https://[a-z0-9-]+\\.${escapedProject}\\.pages\\.dev`, 'i'))
  if (!match) throw new Error('Wrangler deployment output did not contain a Pages deployment URL')
  return match[0]
}

export function validateStaticLandingConfig(configPath) {
  assertRegularFile(configPath, 'landing Wrangler config')
  const config = readFileSync(configPath, 'utf8')
  const issue = STATIC_CONFIG_FORBIDDEN.find((pattern) => pattern.test(config))
  if (issue) throw new Error(`landing Wrangler config is not static-only: ${issue}`)
  if (!/^pages_build_output_dir\s*=\s*"dist\/landing"\s*$/m.test(config)) {
    throw new Error('landing Wrangler config must publish only dist/landing')
  }
  return config
}

/**
 * Copy only the built landing and the landing-only Wrangler config into a
 * disposable deployment root. Repository functions, D1 config, and app output
 * never enter this directory, so Wrangler cannot discover them accidentally.
 */
export function stageLandingArtifact({ artifactDir, configPath, stageRoot }) {
  const artifact = resolve(artifactDir)
  const config = resolve(configPath)
  const stage = resolve(stageRoot)
  assertDirectory(artifact, 'landing artifact')
  assertRegularFile(join(artifact, 'index.html'), 'landing entry')
  assertNoSymlinks(artifact)
  validateStaticLandingConfig(config)

  const stagedArtifact = join(stage, 'dist', 'landing')
  mkdirSync(dirname(stagedArtifact), { recursive: true })
  cpSync(artifact, stagedArtifact, { recursive: true, errorOnExist: true })
  cpSync(config, join(stage, 'wrangler.toml'), { errorOnExist: true })
  return { stageRoot: stage, artifactDir: stagedArtifact, configPath: join(stage, 'wrangler.toml') }
}

export function buildDeployCommand({ wranglerBin, project, branch, sha }) {
  return [
    wranglerBin,
    'pages',
    'deploy',
    'dist/landing',
    '--project-name',
    project,
    '--branch',
    branch,
    '--commit-hash',
    sha,
    '--commit-dirty=false',
    '--config',
    'wrangler.toml',
  ]
}

export function parseDeployArgs(argv, env = process.env) {
  const args = {
    artifactDir: 'dist/landing',
    configPath: 'wrangler.landing.toml',
    project: env.CLOUDFLARE_LANDING_PROJECT ?? DEFAULT_LANDING_PROJECT,
    accountId: env.CLOUDFLARE_ACCOUNT_ID ?? '',
    branch: 'main',
    sha: '',
    receipt: '.release/landing-deployment.json',
    confirm: null,
    dryRun: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--artifact') args.artifactDir = argv[++index]
    else if (arg === '--config') args.configPath = argv[++index]
    else if (arg === '--project') args.project = argv[++index]
    else if (arg === '--account-id') args.accountId = argv[++index]
    else if (arg === '--branch') args.branch = argv[++index]
    else if (arg === '--sha') args.sha = argv[++index]
    else if (arg === '--receipt') args.receipt = argv[++index]
    else if (arg === '--confirm') args.confirm = argv[++index]
    else if (arg === '--dry-run') args.dryRun = true
    else throw new Error(`unknown argument: ${arg}`)
  }
  if ([args.artifactDir, args.configPath, args.project, args.accountId, args.branch, args.sha, args.receipt].some((value) => !value)) {
    throw new Error('missing value for a landing deploy argument')
  }
  return args
}

export function deployLanding(args, { repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..') } = {}) {
  const target = validateDeployTarget(args)
  const root = resolve(repositoryRoot)
  const artifactDir = resolve(root, args.artifactDir)
  const configPath = resolve(root, args.configPath)
  const receiptPath = resolve(root, args.receipt)
  const expectedArtifactDir = join(root, 'dist', 'landing')
  const expectedConfigPath = join(root, 'wrangler.landing.toml')
  const receiptsRoot = join(root, '.release')
  const wranglerBin = resolve(root, 'node_modules/.bin/wrangler')
  assertWithinRoot(root, artifactDir, 'landing artifact')
  assertWithinRoot(root, configPath, 'landing Wrangler config')
  assertWithinRoot(receiptsRoot, receiptPath, 'deployment receipt')
  if (artifactDir !== expectedArtifactDir) {
    throw new Error('landing deploy must publish the repository dist/landing artifact')
  }
  if (configPath !== expectedConfigPath) {
    throw new Error('landing deploy must use the repository wrangler.landing.toml config')
  }
  const stageRoot = mkdtempSync(join(tmpdir(), 'urania-landing-deploy-'))

  try {
    stageLandingArtifact({ artifactDir, configPath, stageRoot })
    const artifactSha256 = hashLandingArtifact(artifactDir)
    const command = buildDeployCommand({
      wranglerBin,
      project: target.project,
      branch: target.branch,
      sha: args.sha,
    })
    const plan = {
      ok: true,
      dryRun: args.dryRun,
      project: target.project,
      accountId: target.accountId,
      branch: target.branch,
      sourceSha: args.sha,
      artifactSha256,
      artifact: 'dist/landing',
      stagedConfig: basename(configPath),
      receipt: relative(root, receiptPath),
      command: command.map((part, index) => (index === 0 ? basename(part) : part)),
    }
    console.log(JSON.stringify(plan, null, 2))
    if (args.dryRun) return plan

    if (!existsSync(wranglerBin)) throw new Error(`Wrangler executable does not exist: ${wranglerBin}`)
    readSourceState(root, args.sha)
    const listResult = spawnSync(wranglerBin, ['pages', 'project', 'list', '--json'], {
      cwd: stageRoot,
      env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: target.accountId },
      encoding: 'utf8',
    })
    if (listResult.status !== 0) {
      throw new Error(`Wrangler project preflight failed: ${(listResult.stderr || listResult.stdout || '').trim()}`)
    }
    parseProjectList(listResult.stdout, target.project)

    const result = spawnSync(command[0], command.slice(1), {
      cwd: stageRoot,
      env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: target.accountId },
      encoding: 'utf8',
    })
    if (result.status !== 0) {
      throw new Error(`Wrangler landing deployment failed: ${(result.stderr || result.stdout || '').trim()}`)
    }
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
    const deploymentUrl = parseDeploymentUrl(`${result.stdout}\n${result.stderr}`, target.project)
    const receipt = {
      ...plan,
      dryRun: false,
      deploymentUrl,
      deployedAt: new Date().toISOString(),
    }
    mkdirSync(dirname(receiptPath), { recursive: true })
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 })
    return receipt
  } finally {
    rmSync(stageRoot, { recursive: true, force: true })
  }
}

function main() {
  const args = parseDeployArgs(process.argv.slice(2))
  deployLanding(args)
}

const invokedAs = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === invokedAs) {
  try {
    main()
  } catch (error) {
    console.error(`landing deploy: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
