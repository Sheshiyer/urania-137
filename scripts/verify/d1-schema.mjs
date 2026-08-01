#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const BASELINE_VERSION = 8
const EXPECTED_COUNTS = {
  users: 2,
  readings: 1,
  chat_sessions: 1,
  chat_turns: 1,
  subjects: 2,
  relationship_invitations: 1,
  relationship_participants: 2,
  relationship_synastry_generations: 1,
  relationship_reading_grants: 2,
  relationship_generation_audit: 1,
  reading_interpretations: 1,
}

function run(argv, cwd) {
  const result = spawnSync(argv[0], argv.slice(1), {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.status !== 0) {
    throw new Error(`${argv.join(' ')} failed:\n${result.stderr || result.stdout}`)
  }
  return { stdout: result.stdout.trim(), stderr: result.stderr.trim() }
}

function migrationFiles(root) {
  return readdirSync(resolve(root, 'migrations')).filter((file) => file.endsWith('.sql')).sort()
}

function parseJsonOutput(output) {
  const start = output.indexOf('[')
  if (start === -1) throw new Error(`Wrangler did not emit JSON: ${output}`)
  return JSON.parse(output.slice(start))
}

export function runSchemaVerification({ root = resolve(import.meta.dirname, '../..'), keep = false } = {}) {
  const workspace = mkdtempSync(join(tmpdir(), 'urania-d1-schema-'))
  const migrations = migrationFiles(root)
  const baseline = migrations.filter((file) => Number(file.slice(0, 4)) <= BASELINE_VERSION)
  if (baseline.length !== BASELINE_VERSION) throw new Error(`expected ${BASELINE_VERSION} baseline migrations`)
  const later = migrations.filter((file) => Number(file.slice(0, 4)) > BASELINE_VERSION)
  const tempMigrations = join(workspace, 'migrations')
  const persist = join(workspace, 'persist')
  mkdirSync(tempMigrations)
  mkdirSync(persist)
  const config = join(workspace, 'wrangler.toml')
  writeFileSync(
    config,
    [
      'name = "urania-schema-verifier"',
      'compatibility_date = "2026-07-01"',
      '[[d1_databases]]',
      'binding = "DB"',
      'database_name = "urania-schema-verifier"',
      'database_id = "00000000-0000-0000-0000-000000000000"',
      'migrations_dir = "migrations"',
      '',
    ].join('\n'),
  )
  for (const file of baseline) copyFileSync(resolve(root, 'migrations', file), join(tempMigrations, file))
  const wrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js')
  const baseArgs = [process.execPath, wrangler]
  const common = ['DB', '--local', '--persist-to', persist, '--config', config]

  try {
    run([...baseArgs, 'd1', 'migrations', 'apply', ...common], workspace)
    run(
      [
        ...baseArgs,
        'd1',
        'execute',
        ...common,
        '--file',
        resolve(root, 'scripts/fixtures/d1-v8-populated.sql'),
      ],
      workspace,
    )
    for (const file of later) copyFileSync(resolve(root, 'migrations', file), join(tempMigrations, file))
    run([...baseArgs, 'd1', 'migrations', 'apply', ...common], workspace)

    const countSql = `SELECT ${Object.keys(EXPECTED_COUNTS)
      .map((table) => `(SELECT COUNT(*) FROM ${table}) AS ${table}`)
      .join(', ')}`
    const query = [
      'PRAGMA foreign_key_check;',
      `${countSql};`,
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name IN ('idx_readings_user_time','idx_subjects_self','idx_relationship_reading_grants_user','idx_reading_interpretations_owner') ORDER BY name;",
      'SELECT COUNT(*) AS migration_count FROM d1_migrations;',
    ].join(' ')
    const response = parseJsonOutput(
      run([...baseArgs, 'd1', 'execute', ...common, '--command', query, '--json'], workspace).stdout,
    )
    const foreignKeyRows = response[0]?.results ?? []
    if (foreignKeyRows.length > 0) throw new Error(`foreign key violations: ${JSON.stringify(foreignKeyRows)}`)
    const countRow = response[1]?.results?.[0] ?? {}
    const counts = Object.fromEntries(Object.keys(EXPECTED_COUNTS).map((table) => [table, Number(countRow[table])]))
    for (const [table, expected] of Object.entries(EXPECTED_COUNTS)) {
      if (counts[table] !== expected) throw new Error(`${table} row count ${counts[table]} != ${expected}`)
    }
    const indexes = (response[2]?.results ?? []).map((row) => row.name)
    if (indexes.length !== 4) throw new Error(`required indexes missing: ${JSON.stringify(indexes)}`)
    const applied = Number(response[3]?.results?.[0]?.migration_count)
    if (applied !== migrations.length) throw new Error(`applied migration count ${applied} != ${migrations.length}`)
    run([...baseArgs, 'd1', 'migrations', 'apply', ...common], workspace)

    return { ok: true, baseline: baseline.length, upgrades: later.length, applied, counts, indexes, workspace: keep ? workspace : null }
  } finally {
    if (!keep) rmSync(workspace, { recursive: true, force: true })
  }
}

const invokedAs = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === invokedAs) {
  try {
    console.log(JSON.stringify(runSchemaVerification({ keep: process.argv.includes('--keep') }), null, 2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
