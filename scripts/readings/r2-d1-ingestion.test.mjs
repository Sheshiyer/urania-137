import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { buildR2UploadPlan, serializeR2Plan } from './upload-corpus-to-r2.mjs'
import { buildD1Plan, serializeD1Plan } from './upload-catalogue-to-d1.mjs'

const OWNER_EMAIL = 'sheshnarayan.iyer@gmail.com'
const USER_ID = 'c04424f4-d73a-5d60-a3ef-da0ac5705ae4'

// This is a local-only integration test: the /723 archive is a private
// on-disk corpus that exists on the operator's machine but is never present
// in CI. Skip the suite when the archive is absent rather than failing.
const CORPUS_ROOT = '/Volumes/madara/2026/Projects/tryambakam-noesis/723'
const HAS_CORPUS = existsSync(CORPUS_ROOT)

describe('R2 Upload Plan (I-001)', { skip: !HAS_CORPUS }, () => {
  let plan

  before(async () => {
    plan = await buildR2UploadPlan({ corpusRoot: CORPUS_ROOT, ownerEmail: OWNER_EMAIL })
  })

  it('should inventory 53 corpus units (51 Solo + 2 Synastry)', () => {
    assert.equal(plan.counts.total, 53)
    assert.equal(plan.counts.solo, 51)
    assert.equal(plan.counts.synastry, 2)
  })

  it('should produce a SHA-256 for each upload', () => {
    plan.uploads.forEach((u) => {
      assert.equal(u.sha256.length, 64)
      assert.match(u.sha256, /^[0-9a-f]{64}$/)
    })
  })

  it('should use correct R2 key pattern corpus/readings/{sha256}/reading.html', () => {
    plan.uploads.forEach((u) => {
      assert.match(u.r2Key, /^corpus\/readings\/[0-9a-f]{64}\/reading\.html$/)
      assert.equal(u.r2Key, `corpus/readings/${u.sha256}/reading.html`)
    })
  })

  it('should tag each upload with mode (Solo or Synastry)', () => {
    plan.uploads.forEach((u) => {
      assert.match(u.mode, /^(Solo|Synastry)$/)
    })
    const synastry = plan.uploads.filter((u) => u.mode === 'Synastry')
    assert.equal(synastry.length, 2)
  })

  it('should serialize to a valid summary JSON', async () => {
    const summary = await serializeR2Plan(plan)
    const parsed = JSON.parse(summary)
    assert.equal(parsed.r2Bucket, 'urania-137-corpus')
    assert.equal(parsed.counts.total, plan.uploads.length)
  })
})

describe('D1 Catalogue Plan (I-002)', { skip: !HAS_CORPUS }, () => {
  let plan

  before(async () => {
    plan = await buildD1Plan({
      corpusRoot: CORPUS_ROOT,
      ownerEmail: OWNER_EMAIL,
      userId: USER_ID,
    })
  })

  it('should target the catalogue_readings table in urania-137-db', () => {
    assert.equal(plan.d1Database, 'urania-137-db')
    assert.equal(plan.d1Table, 'catalogue_readings')
  })

  it('should generate SQL with ON CONFLICT DO NOTHING for idempotency', () => {
    assert.match(plan.sql, /ON CONFLICT DO NOTHING/)
  })

  it('should generate INSERT for the correct columns', () => {
    assert.match(plan.sql, /INSERT INTO catalogue_readings \(/)
    assert.match(plan.sql, /id, user_id, sha256, title, mode, source_type, created_at, is_synastry, canonical_uri, r2_key/)
  })

  it('should include all 53 rows in the SQL VALUES clause', () => {
    const valueLines = plan.sql.split('\n').filter((l) => l.match(/^  \('[0-9a-f]/)).length
    assert.equal(valueLines, 53)
  })

  it('should scope all rows to the owner user_id', () => {
    plan.rows.forEach((r) => {
      // SQL should have the user_id interpolated
    })
    assert.match(plan.sql, new RegExp(USER_ID))
  })

  it('should set is_synastry correctly (1 for Synastry, 0 for Solo)', () => {
    const synastryRows = plan.rows.filter((r) => r.mode === 'Synastry')
    assert.equal(synastryRows.length, 2)
    // Verify SQL contains is_synastry = 1 for synastry rows
    const synastrySqlFragments = plan.sql.split(',\n  ').filter((frag) => frag.includes("'Synastry'"))
    assert.equal(synastrySqlFragments.length, 2)
    synastrySqlFragments.forEach((frag) => {
      assert.match(frag, /, 1,/)
    })
  })

  it('should link r2_key to the SHA-256 checksum', () => {
    plan.rows.forEach((row) => {
      assert.equal(row.r2Key, `corpus/readings/${row.sha256}/reading.html`)
    })
  })

  it('should serialize plan to JSON', async () => {
    const summary = await serializeD1Plan(plan)
    const parsed = JSON.parse(summary)
    assert.equal(parsed.rowCount, 53)
    assert.equal(parsed.d1Table, 'catalogue_readings')
  })
})
