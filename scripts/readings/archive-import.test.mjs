import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  applyArchiveSql,
  psqlArgs,
  psqlEnvironment,
  validateOperatorRequest,
  writePrivateSql,
} from './import-archive.mjs'
import {
  buildArchiveInventory,
  humanizeUnitLabel,
  serializeArchiveInventory,
} from './lib/archive-import.mjs'
import { buildArchiveUpsertSql } from './lib/archive-sql.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const actualCorpusRoot = path.resolve(
  process.env.URANIA_CORPUS_ROOT ?? path.resolve(here, '../../../723'),
)
const actualCorpusAvailable = existsSync(actualCorpusRoot)
const ownerEmail = 'archive-owner@example.test'

if (process.env.URANIA_REQUIRE_EXTERNAL_READING_SOURCES === '1' && !actualCorpusAvailable) {
  throw new Error(`required external corpus is unavailable: ${actualCorpusRoot}`)
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex')
}

async function fixtureCorpus(units = {}) {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'archive-import-test-'))
  const corpusRoot = path.join(temporaryRoot, '723')
  await mkdir(path.join(corpusRoot, 'Solos'), { recursive: true })
  await mkdir(path.join(corpusRoot, 'Synastry'), { recursive: true })

  for (const [type, definitions] of Object.entries(units)) {
    const directory = type === 'solo' ? 'Solos' : 'Synastry'
    for (const definition of definitions) {
      const unitRoot = path.join(corpusRoot, directory, definition.label)
      for (const [selection, body] of Object.entries(definition.artifacts ?? {})) {
        const artifactRoot = path.join(unitRoot, selection)
        await mkdir(artifactRoot, { recursive: true })
        await writeFile(path.join(artifactRoot, 'reading.html'), body)
      }
    }
  }

  return {
    corpusRoot,
    temporaryRoot,
    async inventory() {
      return buildArchiveInventory({
        corpusRoot,
        ownerEmail,
        expectedCounts: {
          solo: units.solo?.length ?? 0,
          synastry: units.synastry?.length ?? 0,
        },
      })
    },
    async cleanup() {
      await rm(temporaryRoot, { recursive: true, force: true })
    },
  }
}

test(
  'actual 723 corpus inventories exactly 51 Solo and 2 Synastry readings',
  { skip: actualCorpusAvailable ? false : 'requires the sibling 723 corpus' },
  async () => {
  const inventory = await buildArchiveInventory({
    corpusRoot: actualCorpusRoot,
    ownerEmail,
  })
  assert.deepEqual(inventory.counts, { solo: 51, synastry: 2, total: 53 })
  assert.equal(inventory.units.length, 53)
  assert.equal(
    inventory.units.filter((unit) => unit.artifact.selection === 'new-l0-local').length,
    51,
  )
  assert.equal(
    inventory.units.filter((unit) => unit.artifact.selection === 'local').length,
    2,
  )
  assert.ok(inventory.units.every((unit) => unit.artifact.mediaType === 'text/html'))
  assert.ok(inventory.units.every((unit) => unit.artifact.objectLocator.startsWith(`${actualCorpusRoot}/`)))
  assert.equal(
    inventory.units.find((unit) => unit.unitKey === 'Synastry/synastry-matru-putra')
      ?.relationship.relationshipLabel,
    'Arathi Pai × Rohan Kamat · mother and son',
  )
  assert.deepEqual(
    inventory.units.find((unit) => unit.unitKey === 'Synastry/synastry-matru-putra')
      ?.subjects.map(({ canonicalName, subjectRole, position }) => ({
        canonicalName,
        subjectRole,
        position,
      })),
    [
      { canonicalName: 'Arathi Pai', subjectRole: 'primary', position: 1 },
      { canonicalName: 'Rohan Kamat', subjectRole: 'secondary', position: 2 },
    ],
  )
  },
)

test('canonical selection prefers new-l0-local and humanizes only the display label', async (t) => {
  const fixture = await fixtureCorpus({
    solo: [
      {
        label: 'anitha-nateshan',
        artifacts: {
          local: 'OLD_HTML_BODY',
          'new-l0-local': 'NEW_HTML_BODY',
        },
      },
    ],
    synastry: [
      {
        label: 'witnessalchemist-harshita-synastry',
        artifacts: { local: 'SYNASTRY_HTML_BODY' },
      },
    ],
  })
  t.after(() => fixture.cleanup())
  const inventory = await fixture.inventory()
  const solo = inventory.units.find((unit) => unit.readingType === 'solo')
  const synastry = inventory.units.find((unit) => unit.readingType === 'synastry')
  assert.equal(solo.artifact.selection, 'new-l0-local')
  assert.equal(solo.artifact.contentSha256, digest('NEW_HTML_BODY'))
  assert.equal(solo.title, 'Anitha Nateshan')
  assert.equal(solo.subjects[0].canonicalName, 'Anitha Nateshan')
  assert.deepEqual(
    synastry.subjects.map((subject) => subject.canonicalName),
    ['Witnessalchemist', 'Harshita'],
  )
  assert.equal(synastry.relationship.relationshipLabel, 'Witnessalchemist × Harshita')
  assert.equal(humanizeUnitLabel('raw-unit_slug'), 'Raw Unit Slug')
  assert.match(solo.stableReadingId, /^archive_reading_[0-9a-f]{64}$/)
})

test('canonical containment rejects an artifact reached through an escaping parent symlink', async (t) => {
  const fixture = await fixtureCorpus({
    solo: [{ label: 'escape', artifacts: {} }],
    synastry: [{ label: 'valid', artifacts: { local: 'VALID' } }],
  })
  t.after(() => fixture.cleanup())
  const outside = path.join(fixture.temporaryRoot, 'outside')
  await mkdir(outside)
  await writeFile(path.join(outside, 'reading.html'), 'OUTSIDE')
  await mkdir(path.join(fixture.corpusRoot, 'Solos', 'escape'), {
    recursive: true,
  })
  await symlink(
    outside,
    path.join(fixture.corpusRoot, 'Solos', 'escape', 'new-l0-local'),
  )
  await assert.rejects(fixture.inventory(), /escapes the corpus root/)
})

test('inventory, manifest identity, idempotency key, and SQL are deterministic', async (t) => {
  const fixture = await fixtureCorpus({
    solo: [{ label: 'alpha-reader', artifacts: { 'new-l0-local': 'ALPHA' } }],
    synastry: [{ label: 'shared-field', artifacts: { local: 'SHARED' } }],
  })
  t.after(() => fixture.cleanup())
  const first = await fixture.inventory()
  const second = await fixture.inventory()
  assert.equal(first.manifestId, second.manifestId)
  assert.equal(first.manifestSha256, second.manifestSha256)
  assert.equal(first.idempotencyKey, second.idempotencyKey)
  assert.deepEqual(
    serializeArchiveInventory(first),
    serializeArchiveInventory(second),
  )
  assert.equal(buildArchiveUpsertSql(first), buildArchiveUpsertSql(second))
})

test('SQL is one fail-closed migration-036 transaction containing metadata only', async (t) => {
  const fixture = await fixtureCorpus({
    solo: [
      {
        label: 'alpha-reader',
        artifacts: { 'new-l0-local': '<html>SECRET_HTML_BODY_MARKER</html>' },
      },
    ],
    synastry: [
      {
        label: 'canonical-dyad-label',
        artifacts: { local: '<html>SECOND_SECRET_MARKER</html>' },
      },
    ],
  })
  t.after(() => fixture.cleanup())
  const inventory = await fixture.inventory()
  const sql = buildArchiveUpsertSql(inventory)
  const orderedTables = [
    'reading_import_runs',
    'reading_sources',
    'corpus_relationships',
    'corpus_subjects',
    'corpus_relationship_members',
    'archived_readings',
    'archived_reading_subjects',
    'archived_reading_artifacts',
    'archived_reading_editorial_states',
  ]
  let cursor = -1
  for (const table of orderedTables) {
    const index = sql.indexOf(`INSERT INTO ${table}`)
    assert.ok(index > cursor, `${table} is not FK-ordered`)
    cursor = index
  }
  assert.match(sql, /^-- Generated[\s\S]*\nBEGIN;/)
  assert.match(sql, /\nCOMMIT;\n$/)
  assert.match(sql, /ON CONFLICT \(owner_user_id, idempotency_key\) DO NOTHING/)
  assert.match(sql, /storage_provider[\s\S]*'filesystem'/)
  assert.match(sql, /'approved', 'owner_only'/)
  assert.match(sql, /note IS DISTINCT FROM \(CASE[\s\S]*END\) THEN/)
  assert.match(sql, /collision or deleted record/)
  assert.match(sql, /relationship_id IS DISTINCT FROM v_relationship_id/)
  assert.match(sql, /identityInference'/)
  assert.doesNotMatch(sql, /SECRET_HTML_BODY_MARKER|SECOND_SECRET_MARKER/)
  assert.doesNotMatch(sql, /DATABASE_URL|postgres(?:ql)?:\/\/|db-password/)
  assert.equal((sql.match(/INSERT INTO archived_readings/g) ?? []).length, 1)
})

test('default summary is privacy-safe and paths require explicit opt-in', async (t) => {
  const fixture = await fixtureCorpus({
    solo: [{ label: 'alpha', artifacts: { 'new-l0-local': 'ALPHA' } }],
    synastry: [{ label: 'beta-gamma', artifacts: { local: 'BETA' } }],
  })
  t.after(() => fixture.cleanup())
  const inventory = await fixture.inventory()
  const summaryText = JSON.stringify(serializeArchiveInventory(inventory))
  assert.doesNotMatch(summaryText, /archive-owner@example\.test/)
  assert.doesNotMatch(summaryText, /\/(?:private|tmp|Volumes|Users)\//)
  assert.doesNotMatch(summaryText, /reading\.html/)
  assert.match(summaryText, /--sql-out <file>/)

  const disclosed = serializeArchiveInventory(inventory, { showPaths: true })
  assert.equal(disclosed.corpusRoot, inventory.corpusRoot)
  assert.equal(disclosed.artifacts.length, 2)
})

test('apply is gated and psql receives credentials only through libpq environment', async () => {
  const base = {
    'corpus-root': '/private/corpus/723',
    'owner-email': ownerEmail,
    'confirm-owner-consent': true,
    apply: true,
  }
  assert.throws(
    () => validateOperatorRequest({ ...base, 'confirm-owner-consent': false }, {}),
    /--confirm-owner-consent/,
  )
  assert.throws(
    () => validateOperatorRequest(base, {}),
    /DATABASE_URL/,
  )
  assert.throws(
    () =>
      validateOperatorRequest(base, {
        DATABASE_URL: 'postgresql://user:secret@db.test/archive',
      }),
    /LIVING_READING_ARTIFACT_ROOT/,
  )
  assert.doesNotThrow(() =>
    validateOperatorRequest(base, {
      DATABASE_URL: 'postgresql://user:secret@db.test/archive',
      LIVING_READING_ARTIFACT_ROOT: '/private/corpus/723',
    }),
  )

  const args = psqlArgs('/private/tmp/import.sql')
  assert.doesNotMatch(args.join(' '), /secret|postgresql|DATABASE_URL/)
  const env = psqlEnvironment(
    'postgresql://operator:db-password@db.example.test:6543/living?sslmode=require',
    { PATH: '/usr/bin', DATABASE_URL: 'must-be-removed' },
  )
  assert.equal(env.DATABASE_URL, undefined)
  assert.equal(env.PGHOST, 'db.example.test')
  assert.equal(env.PGPORT, '6543')
  assert.equal(env.PGDATABASE, 'living')
  assert.equal(env.PGUSER, 'operator')
  assert.equal(env.PGPASSWORD, 'db-password')
  assert.equal(env.PGSSLMODE, 'require')
})

test('SQL destination and apply temp files stay mode 0600 and apply output is suppressed', async (t) => {
  const destinationRoot = await mkdtemp(path.join(tmpdir(), 'archive-sql-mode-'))
  t.after(() => rm(destinationRoot, { recursive: true, force: true }))
  const destination = path.join(destinationRoot, 'archive.sql')
  await writePrivateSql(destination, 'BEGIN;\nCOMMIT;\n')
  assert.equal((await stat(destination)).mode & 0o777, 0o600)
  await assert.rejects(
    writePrivateSql(destination, 'overwrite'),
    /EEXIST/,
  )

  let observedFile
  let observedArgs
  let observedEnv
  const spawnProcess = (_command, args, options) => {
    observedFile = args.at(-1)
    observedArgs = args
    observedEnv = options.env
    const child = new EventEmitter()
    child.stderr = new PassThrough()
    process.nextTick(() => child.emit('close', 0))
    return child
  }
  await applyArchiveSql(
    'BEGIN;\nCOMMIT;\n',
    'postgresql://operator:db-password@db.example.test/living',
    { spawnProcess, env: { PATH: '/usr/bin' } },
  )
  assert.equal((await stat(observedFile).catch(() => null)), null)
  assert.equal(observedArgs.includes('db-password'), false)
  assert.equal(observedEnv.PGPASSWORD, 'db-password')
  await assert.rejects(access(observedFile))
  assert.equal(await readFile(destination, 'utf8'), 'BEGIN;\nCOMMIT;\n')
})
