import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  CORPUS_MANIFEST_SCHEMA_VERSION,
  buildCorpusManifest,
} from './lib/corpus-manifest.mjs'

const CLI = fileURLToPath(new URL('./build-corpus-manifest.mjs', import.meta.url))

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'corpus-manifest-'))
  await mkdir(path.join(root, 'Solos', 'Ada'), { recursive: true })
  await mkdir(path.join(root, 'Solos', 'Zed'), { recursive: true })
  await mkdir(path.join(root, 'Synastry', 'Ada + Bea'), { recursive: true })
  await mkdir(path.join(root, 'Notes'), { recursive: true })
  await writeFile(path.join(root, 'Solos', 'Ada', 'reading.md'), '# Ada\n')
  await writeFile(path.join(root, 'Synastry', 'Ada + Bea', 'chart.pdf'), Buffer.from([0x25, 0x50, 0x44, 0x46]))
  await writeFile(path.join(root, 'Notes', 'portrait.jpg'), Buffer.from([0xff, 0xd8, 0xff]))
  await writeFile(path.join(root, 'manifest-import.json'), '{"name":"pilot"}\n')
  await symlink(
    path.join(root, 'Solos', 'Ada', 'reading.md'),
    path.join(root, 'Notes', 'linked-reading.md'),
  )
  return root
}

test('builds a deterministic, schema-versioned, checksummed manifest', async (t) => {
  const root = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))

  const first = await buildCorpusManifest(root, {
    owner: 'owner@example.com',
  })
  const second = await buildCorpusManifest(root, {
    owner: 'owner@example.com',
  })

  assert.deepEqual(second, first)
  assert.equal(first.schemaVersion, CORPUS_MANIFEST_SCHEMA_VERSION)
  assert.match(first.manifestId, /^manifest_[a-f0-9]{64}$/)
  assert.deepEqual(
    first.sources.map((source) => source.path),
    [
      'Notes/portrait.jpg',
      'Solos/Ada/reading.md',
      'Synastry/Ada + Bea/chart.pdf',
      'manifest-import.json',
    ],
  )
  assert.equal(
    first.sources.find((source) => source.path === 'Solos/Ada/reading.md').checksum.value,
    'a9d748d84941c6117611a40dd7163c239e08fa6dd823f538ba68b3513605720b',
  )
})

test('source IDs stay path-stable while content checksums change', async (t) => {
  const root = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))

  const before = await buildCorpusManifest(root)
  await writeFile(path.join(root, 'Solos', 'Ada', 'reading.md'), '# Changed\n')
  const after = await buildCorpusManifest(root)
  const beforeSource = before.sources.find((source) => source.path.endsWith('reading.md'))
  const afterSource = after.sources.find((source) => source.path.endsWith('reading.md'))

  assert.equal(afterSource.sourceId, beforeSource.sourceId)
  assert.notEqual(afterSource.checksum.value, beforeSource.checksum.value)
  assert.notEqual(after.manifestId, before.manifestId)
})

test('classifies media, discovers manifests, and excludes symlinks', async (t) => {
  const root = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))

  const manifest = await buildCorpusManifest(root)
  const byPath = Object.fromEntries(manifest.sources.map((source) => [source.path, source]))

  assert.equal(byPath['Solos/Ada/reading.md'].mediaType, 'text/markdown')
  assert.equal(byPath['Synastry/Ada + Bea/chart.pdf'].mediaType, 'application/pdf')
  assert.equal(byPath['Notes/portrait.jpg'].mediaType, 'image/jpeg')
  assert.equal(byPath['manifest-import.json'].mediaType, 'application/json')
  assert.equal(byPath['Notes/linked-reading.md'], undefined)
  assert.deepEqual(manifest.manifests, ['manifest-import.json'])
  assert.equal(manifest.totals.files, 4)
})

test('keeps owner identity separate from provisional subject and relationship candidates', async (t) => {
  const root = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))

  const manifest = await buildCorpusManifest(root, {
    owner: 'ada@example.com',
  })

  assert.deepEqual(manifest.owner, {
    email: 'ada@example.com',
    mapping: 'catalogue-owner-only',
  })
  assert.deepEqual(
    manifest.subjectCandidates.map(({ label, provisional }) => ({ label, provisional })),
    [
      { label: 'Ada', provisional: true },
      { label: 'Zed', provisional: true },
    ],
  )
  assert.deepEqual(
    manifest.relationshipCandidates.map(({ label, provisional }) => ({ label, provisional })),
    [{ label: 'Ada + Bea', provisional: true }],
  )
  assert.ok(manifest.subjectCandidates.every((candidate) => candidate.ownerIdentity === false))
  assert.ok(manifest.relationshipCandidates.every((candidate) => candidate.ownerIdentity === false))
})

test('catalogue-only mode never reads file bodies', async (t) => {
  const root = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))
  let bodyReads = 0

  const manifest = await buildCorpusManifest(root, {
    catalogueOnly: true,
    readFile: async () => {
      bodyReads += 1
      throw new Error('file body read')
    },
  })

  assert.equal(bodyReads, 0)
  assert.equal(manifest.mode, 'catalogue-only')
  assert.ok(manifest.sources.every((source) => source.checksum === null))
})

test('stdout-only CLI prints the manifest and creates no corpus files', async (t) => {
  const root = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))
  const before = (await buildCorpusManifest(root, { catalogueOnly: true })).sources.map(
    (source) => source.path,
  )

  const result = spawnSync(
    process.execPath,
    [CLI, root, '--owner', 'owner@example.com', '--catalogue-only'],
    { encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, '')
  const output = JSON.parse(result.stdout)
  assert.equal(output.owner.email, 'owner@example.com')
  assert.equal(output.mode, 'catalogue-only')
  const after = (await buildCorpusManifest(root, { catalogueOnly: true })).sources.map(
    (source) => source.path,
  )
  assert.deepEqual(after, before)
})
