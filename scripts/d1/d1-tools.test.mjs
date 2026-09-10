import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { resolve } from 'node:path'
import {
  buildBackupReceipt,
  buildExportCommand,
  redact,
} from './backup.mjs'
import {
  buildRestoreDrillCommands,
  insertStatementCountsFromExport,
  tableNamesFromExport,
} from './restore-drill.mjs'
import { validateBackupReceipt } from '../release.mjs'

const ROOT = resolve(import.meta.dirname, '../..')
const SHA = 'a'.repeat(40)

test('backup export command requires exactly one explicit target', () => {
  assert.throws(() => buildExportCommand('DB', { output: '/tmp/x.sql' }), /exactly one of/)
  assert.throws(() => buildExportCommand('DB', { local: true, remote: true, output: '/tmp/x.sql' }), /exactly one of/)
  assert.throws(() => buildExportCommand('', { local: true, output: '/tmp/x.sql' }), /database name/)
  assert.throws(() => buildExportCommand('DB', { local: true }), /output/)
})

test('backup export command builds the expected wrangler argv', () => {
  const argv = buildExportCommand('DB', { local: true, output: '/tmp/u.sql' })
  assert.deepEqual(argv.slice(0, 4), ['d1', 'export', 'DB', '--output'])
  assert.ok(argv.includes('--local'))
  assert.ok(argv.includes('--skip-confirmation'))
  assert.ok(!argv.includes('--remote'))
  assert.ok(!argv.some((a) => a.includes('--no-schema')), 'schema is always exported (full backup)')

  const remote = buildExportCommand('DB', { remote: true, output: '/tmp/u.sql' })
  assert.ok(remote.includes('--remote'))
  assert.ok(!remote.includes('--local'))
})

test('receipt builder rejects missing sha, id, or export file', () => {
  const workspace = mkdtempSync(resolve(tmpdir(), 'urania-d1-receipt-'))
  try {
    const exportPath = resolve(workspace, 'backup.sql')
    writeFileSync(exportPath, '-- schema\nCREATE TABLE t (id INTEGER);\nINSERT INTO t (id) VALUES (1);\n')
    assert.throws(() => buildBackupReceipt({ gitSha: 'bad', databaseId: 'd57550ea-c8d3-48fc-a2ee-c6b3fc41948e', exportPath }), /git sha/)
    assert.throws(() => buildBackupReceipt({ gitSha: SHA, databaseId: 'nope', exportPath }), /database id/)
    assert.throws(() => buildBackupReceipt({ gitSha: SHA, databaseId: 'd57550ea-c8d3-48fc-a2ee-c6b3fc41948e', exportPath: resolve(workspace, 'missing.sql') }), /existing export/)
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('receipt builder emits the frozen validateBackupReceipt shape', () => {
  const workspace = mkdtempSync(resolve(tmpdir(), 'urania-d1-receipt-'))
  try {
    const exportPath = resolve(workspace, 'backup.sql')
    writeFileSync(exportPath, '-- schema\n')
    const receipt = buildBackupReceipt({
      gitSha: SHA,
      databaseId: 'd57550ea-c8d3-48fc-a2ee-c6b3fc41948e',
      exportPath,
      restoreVerified: true,
      tableCounts: { t: 1 },
      now: () => '2026-08-14T00:00:00.000Z',
    })
    assert.equal(receipt.restoreVerified, true)
    assert.match(receipt.sha256, /^[a-f0-9]{64}$/)
    assert.equal(validateBackupReceipt(receipt, SHA), true)
    // restoreVerified false must NOT validate
    assert.equal(validateBackupReceipt({ ...receipt, restoreVerified: false }, SHA), false)
    assert.equal(validateBackupReceipt({ ...receipt, gitSha: 'b'.repeat(40) }, SHA), false)
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('redact strips tokens, account ids, and emails', () => {
  const out = redact('oauth_token = "abc123secret" and 0123456789abcdef0123456789abcdef user@example.com ok')
  assert.ok(!out.includes('abc123secret'))
  assert.ok(!out.includes('0123456789abcdef0123456789abcdef'))
  assert.ok(!out.includes('user@example.com'))
  assert.ok(out.includes('[REDACTED]'))
})

test('restore drill command construction is explicit and bounded', () => {
  const workspace = mkdtempSync(resolve(tmpdir(), 'urania-drill-'))
  const exportPath = resolve(workspace, 'backup.sql')
  try {
    writeFileSync(exportPath, 'CREATE TABLE "t" (id INTEGER);\nINSERT INTO "t" (id) VALUES (1);\n')
    assert.throws(() => buildRestoreDrillCommands({ exportPath: resolve(workspace, 'nope.sql'), wranglerBin: '/bin/wrangler', workspace }), /existing export/)
    const plan = buildRestoreDrillCommands({ exportPath, wranglerBin: '/bin/wrangler', root: ROOT, workspace })
    assert.equal(plan.commands.length, 1)
    assert.equal(plan.commands[0][0], 'sqlite3')
    assert.equal(plan.commands[0][1], plan.dbPath)
    for (const argv of plan.commands) {
      assert.ok(!argv.includes('--remote'))
      assert.ok(!argv.includes('--preview'))
    }
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('export parsing recovers table names and insert bounds', () => {
  const workspace = mkdtempSync(resolve(tmpdir(), 'urania-drill-'))
  try {
    const exportPath = resolve(workspace, 'backup.sql')
    writeFileSync(
      exportPath,
      [
        'PRAGMA defer_foreign_keys=TRUE;',
        'CREATE TABLE IF NOT EXISTS "users" (id TEXT);',
        'CREATE TABLE readings (id TEXT);',
        'INSERT INTO "users" (id) VALUES (1);',
        'INSERT INTO users (id) VALUES (2);',
        'INSERT INTO readings (id) VALUES (3);',
        '',
      ].join('\n'),
    )
    assert.deepEqual(tableNamesFromExport(exportPath), ['users', 'readings'])
    const counts = insertStatementCountsFromExport(exportPath)
    assert.equal(counts.users, 2)
    assert.equal(counts.readings, 1)
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('D1 production/preview ids remain distinct in the frozen wrangler config', () => {
  const text = readFileSync(resolve(ROOT, 'wrangler.toml'), 'utf8')
  const prod = text.match(/^\s*database_id\s*=\s*"([0-9a-f-]+)"/mi)?.[1]
  const preview = text.match(/preview_database_id\s*=\s*"([0-9a-f-]+)"/i)?.[1]
  assert.ok(prod, 'database_id present')
  assert.ok(preview, 'preview_database_id present')
  assert.notEqual(prod, preview, 'preview and production D1 ids must differ')
})
