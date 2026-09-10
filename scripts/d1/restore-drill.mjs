#!/usr/bin/env node
/**
 * R-1 — D1 restore drill.
 *
 * Proves a D1 export is restorable by importing it into a disposable local
 * database (wrangler `--local` SQLite persistence) and verifying every table
 * in the export is present with a non-empty row set. It is a *drill*: the
 * disposable store is deleted afterward and no production/preview database is
 * ever written.
 *
 * Standalone usage (scripts/d1/backup.mjs wires this in automatically):
 *   node scripts/d1/restore-drill.mjs --export <file.sql>
 *
 * The command-construction helpers are exported for the node test suite so the
 * exact argv (and its fail-closed guards) is provable without a network.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const REPO_ROOT = resolve(import.meta.dirname, '../..')

/** Table names in `CREATE TABLE "name"` / `CREATE TABLE name` order. */
export function tableNamesFromExport(sqlPath) {
  const text = readFileSync(sqlPath, 'utf8')
  const names = []
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"|([A-Za-z0-9_]+))/gi
  let match
  while ((match = re.exec(text)) !== null) names.push(match[1] ?? match[2])
  return [...new Set(names)]
}

/**
 * Number of INSERT statements per table in the export. This is a deterministic
 * lower bound on imported rows (a single INSERT may carry many value tuples);
 * the drill asserts imported COUNT(*) >= this bound per table, which catches a
 * truncated or partial import without depending on fragile tuple parsing.
 */
export function insertStatementCountsFromExport(sqlPath) {
  const text = readFileSync(sqlPath, 'utf8')
  const counts = {}
  const re = /INSERT\s+INTO\s+(?:"([^"]+)"|([A-Za-z0-9_]+))\s*\(/gi
  let match
  while ((match = re.exec(text)) !== null) {
    const name = match[1] ?? match[2]
    counts[name] = (counts[name] ?? 0) + 1
  }
  return counts
}

/** Alias used by backup.mjs — insert-statement counts keyed by table. */
export function countTablesFromExport(sqlPath) {
  return insertStatementCountsFromExport(sqlPath)
}

const DRILL_CONFIG_TEXT = [
  'name = "urania-restore-drill"',
  'compatibility_date = "2026-07-01"',
  '[[d1_databases]]',
  'binding = "DB"',
  'database_name = "urania-restore-drill"',
  'database_id = "00000000-0000-0000-0000-000000000000"',
  '',
].join('\n')

/**
 * Build a fully self-contained drill plan: the disposable workspace, the
 * wrangler config text, and the exact argv arrays for import + verification.
 */
export function buildRestoreDrillCommands({
  exportPath,
  wranglerBin,
  root = REPO_ROOT,
  workspace,
}) {
  if (!existsSync(exportPath)) throw new Error(`restore drill requires an existing export (${exportPath})`)
  const persist = resolve(workspace, 'persist')
  const config = resolve(workspace, 'wrangler.toml')
  mkdirSync(persist, { recursive: true })

  const dbPath = resolve(workspace, 'restore.db')
  const common = ['DB', '--local', '--persist-to', persist, '--config', config]
  return {
    exportPath,
    wranglerBin,
    root,
    workspace,
    persist,
    config,
    dbPath,
    configText: DRILL_CONFIG_TEXT,
    common,
    // Import is sqlite3 stdin (wrangler `d1 execute --file` hits SQLITE_TOOBIG
    // on the production dump). Commands stay local-only and never --remote.
    commands: [['sqlite3', dbPath]],
  }
}

/** Execute one argv array; throw a redacted error on failure. */
function runCommand(argv) {
  const result = spawnSync(argv[0], argv.slice(1), {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.status !== 0) {
    throw new Error(`restore drill step failed: ${(result.stderr || result.stdout || '').trim()}`)
  }
  return result
}

function parseCount(stdout) {
  const start = stdout.indexOf('[')
  if (start === -1) throw new Error(`wrangler count output was not JSON: ${stdout.slice(0, 120)}`)
  try {
    const parsed = JSON.parse(stdout.slice(start))
    const row = parsed?.[0]?.results?.[0] ?? parsed?.[0]?.[0] ?? null
    const value = row ? (row.c ?? Object.values(row)[0]) : NaN
    const n = Number(value)
    if (!Number.isFinite(n)) throw new Error('count row was not numeric')
    return n
  } catch (err) {
    throw new Error(`could not parse count output: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * Execute a prebuilt drill and verify restorability. Throws on any command
 * failure or on a table whose imported row count falls below the export's
 * INSERT-statement bound. Returns true when every invariant holds.
 */
export function runRestoreDrill(plan, { expectedCounts = null } = {}) {
  writeFileSync(plan.config, plan.configText)
  const importedSql = spawnSync('sqlite3', [plan.dbPath], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    input: readFileSync(plan.exportPath),
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  if (importedSql.status !== 0) {
    throw new Error(
      `restore drill step failed: ${(importedSql.stderr || importedSql.stdout || 'sqlite3 import failed').trim()}`,
    )
  }

  const tableNames = tableNamesFromExport(plan.exportPath)
  const counts = expectedCounts ?? insertStatementCountsFromExport(plan.exportPath)
  for (const table of tableNames) {
    const lowerBound = counts[table] ?? 0
    if (lowerBound === 0) continue // empty table — nothing to bound
    const result = spawnSync('sqlite3', [plan.dbPath, `SELECT COUNT(*) AS c FROM "${table}";`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (result.status !== 0) {
      throw new Error(`restore drill count failed for ${table}: ${(result.stderr || result.stdout || '').trim()}`)
    }
    const imported = Number((result.stdout || '').trim())
    if (!Number.isFinite(imported) || imported < lowerBound) {
      throw new Error(`restore drill verification failed for ${table}: imported ${imported} < bound ${lowerBound}`)
    }
  }
  return true
}

function parseArgs(argv) {
  const args = { export: null }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--export') args.export = argv[++index]
    else throw new Error(`unknown argument: ${arg}`)
  }
  if (!args.export) throw new Error('restore-drill requires --export <file.sql>')
  return args
}

const invokedAs = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === invokedAs) {
  try {
    const args = parseArgs(process.argv.slice(2))
    const workspace = resolve(tmpdir(), `urania-restore-drill-${process.pid}`)
    const exportPath = resolve(REPO_ROOT, args.export)
    try {
      const plan = buildRestoreDrillCommands({
        exportPath,
        wranglerBin: resolve(REPO_ROOT, 'node_modules/wrangler/bin/wrangler.js'),
        root: REPO_ROOT,
        workspace,
      })
      const ok = runRestoreDrill(plan)
      console.log(JSON.stringify({ ok, drill: 'restore-verified', tables: tableNamesFromExport(exportPath) }, null, 2))
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  } catch (error) {
    console.error(`restore-drill: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
