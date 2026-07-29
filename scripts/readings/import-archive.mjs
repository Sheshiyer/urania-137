#!/usr/bin/env node
import { mkdtemp, open, realpath, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import {
  buildArchiveInventory,
  serializeArchiveInventory,
} from './lib/archive-import.mjs'
import { buildArchiveUpsertSql } from './lib/archive-sql.mjs'

const USAGE = `Usage:
  npm run readings:import-archive -- \\
    --corpus-root <723-dir> \\
    --owner-email <email> \\
    --confirm-owner-consent \\
    [--sql-out <file> | --show-sql] [--show-paths]

  Add --apply to execute through local psql. Apply requires DATABASE_URL and
  LIVING_READING_ARTIFACT_ROOT in the environment; the latter must resolve to
  the same canonical directory as --corpus-root.
`

export function parseOperatorArgs(args) {
  return parseArgs({
    args,
    allowPositionals: false,
    strict: true,
    options: {
      'corpus-root': { type: 'string' },
      'owner-email': { type: 'string' },
      'confirm-owner-consent': { type: 'boolean', default: false },
      apply: { type: 'boolean', default: false },
      'sql-out': { type: 'string' },
      'show-sql': { type: 'boolean', default: false },
      'show-paths': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  }).values
}

export function validateOperatorRequest(values, env = process.env) {
  if (!values['corpus-root']) throw new Error('--corpus-root is required')
  if (!values['owner-email']) throw new Error('--owner-email is required')
  if (!values['confirm-owner-consent']) {
    throw new Error('--confirm-owner-consent is required')
  }
  if (values['sql-out'] && values['show-sql']) {
    throw new Error('--sql-out and --show-sql are mutually exclusive')
  }
  if (values.apply && (values['sql-out'] || values['show-sql'])) {
    throw new Error('--apply cannot be combined with --sql-out or --show-sql')
  }
  if (values.apply && !env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is required for --apply')
  }
  if (values.apply && !env.LIVING_READING_ARTIFACT_ROOT?.trim()) {
    throw new Error('LIVING_READING_ARTIFACT_ROOT is required for --apply')
  }
}

export function psqlArgs(sqlFile) {
  return [
    '--no-psqlrc',
    '--quiet',
    '--set',
    'ON_ERROR_STOP=1',
    '--file',
    sqlFile,
  ]
}

/**
 * Translate DATABASE_URL to libpq environment variables. This keeps every
 * credential out of argv, generated SQL, process output, and error messages.
 */
export function psqlEnvironment(databaseUrl, baseEnv = process.env) {
  let url
  try {
    url = new URL(databaseUrl)
  } catch {
    throw new Error('DATABASE_URL is not a valid PostgreSQL URL')
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL is not a PostgreSQL URL')
  }
  if (!url.hostname || !url.username || url.pathname.length <= 1) {
    throw new Error('DATABASE_URL must include host, user, and database')
  }

  const childEnv = { ...baseEnv }
  delete childEnv.DATABASE_URL
  childEnv.PGHOST = url.hostname
  childEnv.PGPORT = url.port || '5432'
  childEnv.PGDATABASE = decodeURIComponent(url.pathname.slice(1))
  childEnv.PGUSER = decodeURIComponent(url.username)
  if (url.password) childEnv.PGPASSWORD = decodeURIComponent(url.password)
  else delete childEnv.PGPASSWORD
  if (url.searchParams.has('sslmode')) {
    childEnv.PGSSLMODE = url.searchParams.get('sslmode')
  }
  return childEnv
}

async function assertArtifactRootAlignment(corpusRoot, configuredRoot) {
  let canonicalConfigured
  try {
    canonicalConfigured = await realpath(path.resolve(configuredRoot))
  } catch {
    throw new Error('LIVING_READING_ARTIFACT_ROOT is not a readable directory')
  }
  if (canonicalConfigured !== corpusRoot) {
    throw new Error(
      'LIVING_READING_ARTIFACT_ROOT must match the canonical --corpus-root',
    )
  }
}

function runPsql(sqlFile, databaseUrl, options = {}) {
  const spawnProcess = options.spawnProcess ?? spawn
  return new Promise((resolve, reject) => {
    const child = spawnProcess(options.psqlBinary ?? 'psql', psqlArgs(sqlFile), {
      env: psqlEnvironment(databaseUrl, options.env ?? process.env),
      shell: false,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderrBytes = 0
    child.stderr?.on('data', (chunk) => {
      stderrBytes += chunk.length
    })
    child.once('error', (error) => {
      if (error?.code === 'ENOENT') reject(new Error('Local psql executable was not found'))
      else reject(new Error('Local psql could not be started'))
    })
    child.once('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`psql apply failed (exit ${code}; stderr ${stderrBytes} bytes suppressed)`))
    })
  })
}

export async function applyArchiveSql(sql, databaseUrl, options = {}) {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'living-archive-import-'))
  const sqlFile = path.join(temporaryRoot, 'archive-import.sql')
  try {
    await writePrivateSql(sqlFile, sql)
    await runPsql(sqlFile, databaseUrl, options)
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

export async function writePrivateSql(filePath, sql) {
  const handle = await open(filePath, 'wx', 0o600)
  try {
    await handle.writeFile(sql, { encoding: 'utf8' })
    await handle.chmod(0o600)
    await handle.sync()
  } finally {
    await handle.close()
  }
}

async function main(args = process.argv.slice(2), env = process.env) {
  const values = parseOperatorArgs(args)
  if (values.help) {
    process.stdout.write(USAGE)
    return
  }
  validateOperatorRequest(values, env)

  const inventory = await buildArchiveInventory({
    corpusRoot: values['corpus-root'],
    ownerEmail: values['owner-email'],
  })
  const sql = buildArchiveUpsertSql(inventory)

  if (values.apply) {
    await assertArtifactRootAlignment(
      inventory.corpusRoot,
      env.LIVING_READING_ARTIFACT_ROOT,
    )
    await applyArchiveSql(sql, env.DATABASE_URL)
    process.stdout.write(
      `${JSON.stringify(
        serializeArchiveInventory(inventory, {
          mode: 'applied',
          showPaths: values['show-paths'],
          sqlDestination: 'temporary-file-removed',
        }),
        null,
        2,
      )}\n`,
    )
    return
  }

  const sqlDestination = values['sql-out']
    ? path.resolve(values['sql-out'])
    : null
  const summary = serializeArchiveInventory(inventory, {
    mode: 'dry-run',
    showPaths: values['show-paths'],
    sqlDestination,
  })

  if (sqlDestination) {
    await writePrivateSql(sqlDestination, sql)
  }
  if (values['show-sql']) {
    process.stderr.write(`${JSON.stringify(summary, null, 2)}\n`)
    process.stdout.write(sql)
  } else {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
  }
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`Archive import refused: ${error.message}\n`)
    process.exitCode = 1
  })
}
