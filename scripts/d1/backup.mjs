#!/usr/bin/env node
/**
 * R-1 — Production D1 backup + restore-drill + isolation verifier.
 *
 * Backs up a D1 database by exporting its schema + data to a timestamped SQL
 * file, then proves the export is restorable by importing it into a
 * disposable local database and comparing row counts. The result is a
 * checksummed receipt in the frozen shape `scripts/release.mjs` expects
 * (`validateBackupReceipt`): gitSha, databaseId, sha256, restoreVerified.
 *
 * Two invocation modes:
 *   Frozen CI path (release.yml):
 *     node scripts/d1/backup.mjs --production --targets <targets.json> --output <receipt>
 *   Manual / drill path (operator):
 *     node scripts/d1/backup.mjs --local
 *     node scripts/d1/backup.mjs --production --database-id <uuid> --confirm <uuid> --output <receipt>
 *
 * Production export is read-only. Restore of production data into a live
 * database is the separate, guarded `restore-drill.mjs` (disposable local store).
 *
 * Sensitive output is redacted: oauth tokens, account ids, and emails never
 * appear on stdout/stderr or in the receipt.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  buildRestoreDrillCommands,
  runRestoreDrill,
  countTablesFromExport,
} from './restore-drill.mjs'

const REPO_ROOT = resolve(import.meta.dirname, '../..')
const DATABASE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SHA_RE = /^[a-f0-9]{40}$/

const SENSITIVE_PATTERNS = [
  /\b(oauth_token|api[-_]?token|bearer)\b\s*[=:]\s*\S+/gi,
  /\b[a-f0-9]{32}\b/gi, // account ids
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, // emails
]

/** Redact tokens, account ids, and emails from operator-facing text. */
export function redact(text) {
  return SENSITIVE_PATTERNS.reduce((out, pattern) => out.replace(pattern, '[REDACTED]'), String(text ?? ''))
}

/** The frozen receipt shape (validateBackupReceipt in scripts/release.mjs). */
export function buildBackupReceipt({
  gitSha,
  databaseId,
  exportPath,
  restoreVerified,
  tableCounts = {},
  now = () => new Date().toISOString(),
}) {
  if (!SHA_RE.test(gitSha ?? '')) throw new Error(`backup receipt requires a valid git sha (got ${gitSha})`)
  if (!DATABASE_ID_RE.test(databaseId ?? '')) throw new Error(`backup receipt requires a valid database id (got ${databaseId})`)
  if (!existsSync(exportPath)) throw new Error(`backup receipt requires an existing export file (${exportPath})`)
  const bytes = readFileSync(exportPath)
  return {
    schema: 'urania.d1-backup-receipt.v1',
    gitSha,
    databaseId,
    exportFile: basename(exportPath),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    restoreVerified: restoreVerified === true,
    exportedAt: now(),
    tableCounts,
  }
}

/**
 * Build the `wrangler d1 export` argv for an explicit target.
 * Wrangler's `d1 export` accepts exactly `--local` or `--remote` (no preview
 * flag; a full schema+data export is the default, so no `--no-schema`).
 */
export function buildExportCommand(databaseName, { local = false, remote = false, output }) {
  if (!databaseName) throw new Error('export requires a database name')
  const flags = [local, remote].filter(Boolean)
  if (flags.length !== 1) throw new Error('export requires exactly one of --local | --remote')
  if (!output) throw new Error('export requires an --output path')
  const argv = ['d1', 'export', databaseName, '--output', output, '--skip-confirmation']
  if (local) argv.push('--local')
  if (remote) argv.push('--remote')
  return argv
}

function resolveWranglerBin(root = REPO_ROOT) {
  const candidates = [
    resolve(root, 'node_modules/.bin/wrangler'),
    resolve(root, 'node_modules/wrangler/bin/wrangler.js'),
  ]
  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) throw new Error('wrangler executable not found — run `npm ci` first')
  return found
}

function run(argv, { allowFailure = false, cwd = REPO_ROOT } = {}) {
  const result = spawnSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (!allowFailure && result.status !== 0) {
    throw new Error(redact(`${argv.join(' ')} failed: ${result.stderr || result.stdout || ''}`.trim()))
  }
  return { status: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || '' }
}

function currentGitSha() {
  const result = run(['git', 'rev-parse', 'HEAD'])
  return result.stdout.trim()
}

/** Read the production D1 id from the frozen top-level targets shape. */
export function readTargetsProductionD1Id(targetsPath) {
  const targets = JSON.parse(readFileSync(targetsPath, 'utf8'))
  const id = targets?.productionD1Id
  if (!DATABASE_ID_RE.test(id ?? '')) throw new Error(`targets file ${targetsPath} has no valid productionD1Id`)
  return { targets, productionD1Id: id }
}

/** Read the preview D1 id from the frozen top-level targets shape. */
export function readTargetsPreviewD1Id(targetsPath) {
  const targets = JSON.parse(readFileSync(targetsPath, 'utf8'))
  const id = targets?.previewD1Id
  if (!DATABASE_ID_RE.test(id ?? '')) throw new Error(`targets file ${targetsPath} has no valid previewD1Id`)
  return { targets, previewD1Id: id }
}

function readWranglerProductionD1Id() {
  const text = readFileSync(resolve(REPO_ROOT, 'wrangler.toml'), 'utf8')
  const match = text.match(/^\s*database_id\s*=\s*"([0-9a-f-]+)"/mi)
  if (!match) throw new Error('wrangler.toml has no production database_id')
  return match[1]
}

/**
 * Fail-closed isolation check: the production id named in the targets file
 * must equal wrangler.toml's production database_id and must differ from the
 * preview id (R-7). Throws on any mismatch.
 */
export function assertIsolation({ productionD1Id, previewD1Id = null }) {
  const wranglerProd = readWranglerProductionD1Id()
  if (productionD1Id !== wranglerProd) {
    throw new Error(`targets productionD1Id ${productionD1Id} != wrangler.toml database_id ${wranglerProd}`)
  }
  if (previewD1Id && previewD1Id === productionD1Id) {
    throw new Error('previewD1Id must differ from productionD1Id (R-7 isolation)')
  }
  return true
}

function parseArgs(argv, env = process.env) {
  const args = {
    target: null,
    databaseName: 'DB',
    databaseId: env.CLOUDFLARE_D1_ID ?? '',
    targets: null,
    output: null,
    confirm: null,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--local') args.target = 'local'
    else if (arg === '--preview') args.target = 'preview'
    else if (arg === '--production') args.target = 'production'
    else if (arg === '--database-name') args.databaseName = argv[++index]
    else if (arg === '--database-id') args.databaseId = argv[++index]
    else if (arg === '--targets') args.targets = argv[++index]
    else if (arg === '--output') args.output = argv[++index]
    else if (arg === '--confirm') args.confirm = argv[++index]
    else throw new Error(`unknown argument: ${arg}`)
  }
  if (!args.target) throw new Error('backup requires exactly one of --local | --preview | --production')
  if (args.target === 'production') {
    if (args.targets) {
      // Frozen CI path: database id comes from the targets file (release.yml).
      if (args.databaseId) throw new Error('--database-id and --targets are mutually exclusive')
      const { productionD1Id } = readTargetsProductionD1Id(args.targets)
      args.databaseId = productionD1Id
      // CI is the governed path; no --confirm needed there.
    } else if (!DATABASE_ID_RE.test(args.databaseId ?? '')) {
      throw new Error('production backup requires --database-id <uuid> or --targets <file> (never implicit)')
    } else if (args.confirm !== args.databaseId) {
      throw new Error(`production backup requires --confirm <database-id> (got ${args.confirm ?? 'none'})`)
    }
  }
  if (args.target === 'preview') {
    // Readiness path: preview id comes from the targets file (readiness.yml).
    if (args.targets) {
      if (args.databaseId) throw new Error('--database-id and --targets are mutually exclusive')
      const { previewD1Id } = readTargetsPreviewD1Id(args.targets)
      args.databaseId = previewD1Id
    } else if (!DATABASE_ID_RE.test(args.databaseId ?? '')) {
      throw new Error('preview backup requires --database-id <uuid> or --targets <file> (never implicit)')
    }
  }
  return args
}

/**
 * Run the backup: export → disposable restore drill → checksummed receipt.
 * Pure command construction is exported for tests; this wires them together
 * against the real wrangler binary.
 */
export function runBackup(args, { root = REPO_ROOT, now = () => new Date().toISOString() } = {}) {
  const wranglerBin = resolveWranglerBin(root)
  const exportDir = resolve(root, '.release', 'd1-backups')
  mkdirSync(exportDir, { recursive: true })
  const stamp = now().replace(/[:.]/g, '-')
  const exportPath = resolve(exportDir, `urania-137-${args.target}-${stamp}.sql`)

  const exportArgv = buildExportCommand(args.databaseName, {
    local: args.target === 'local' || args.target === 'preview',
    remote: args.target === 'production',
    output: exportPath,
  })
  run([process.execPath, wranglerBin, ...exportArgv], { cwd: root })
  if (!existsSync(exportPath)) throw new Error(`export did not produce ${exportPath}`)

  const tableCounts = countTablesFromExport(exportPath)
  const databaseId = DATABASE_ID_RE.test(args.databaseId ?? '')
    ? args.databaseId
    : resolveDatabaseIdForDrill(args.target)

  const drillWorkspace = mkdtempSync(resolve(tmpdir(), 'urania-restore-drill-'))
  try {
    const drillCommands = buildRestoreDrillCommands({
      exportPath,
      wranglerBin: resolve(root, 'node_modules/wrangler/bin/wrangler.js'),
      root,
      workspace: drillWorkspace,
    })
    const restoreVerified = runRestoreDrill(drillCommands, { expectedCounts: tableCounts })
    const receipt = buildBackupReceipt({
      gitSha: currentGitSha(),
      databaseId,
      exportPath,
      restoreVerified,
      tableCounts,
      now,
    })
    const output = args.output ?? resolve(exportDir, 'backup-receipt.json')
    mkdirSync(resolve(output, '..'), { recursive: true })
    writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 })
    console.log(JSON.stringify({ ok: true, receipt: output, redacted: redact(`database ${databaseId} backed up`) }, null, 2))
    return receipt
  } finally {
    rmSync(drillWorkspace, { recursive: true, force: true })
  }
}

function resolveDatabaseIdForDrill(target) {
  // Local/preview drills reference the disposable store, not a live database.
  // The receipt's databaseId records the *source* database for provenance.
  if (target === 'local') return process.env.CLOUDFLARE_D1_ID || '00000000-0000-0000-0000-000000000000'
  if (target === 'preview') {
    const id = process.env.CLOUDFLARE_D1_PREVIEW_ID || ''
    if (!DATABASE_ID_RE.test(id)) throw new Error('preview backup requires CLOUDFLARE_D1_PREVIEW_ID (the wrangler.toml preview_database_id)')
    return id
  }
  throw new Error('production backup must carry --database-id')
}

const invokedAs = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === invokedAs) {
  try {
    const args = parseArgs(process.argv.slice(2))
    runBackup(args)
  } catch (error) {
    console.error(`backup: ${redact(error instanceof Error ? error.message : String(error))}`)
    process.exitCode = 1
  }
}
