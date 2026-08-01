import assert from 'node:assert/strict'
import test from 'node:test'
import { runSchemaVerification } from './d1-schema.mjs'

test('migrates a populated v8 database without data or foreign-key loss', { timeout: 60_000 }, () => {
  const result = runSchemaVerification()
  assert.equal(result.ok, true)
  assert.equal(result.baseline, 8)
  assert.equal(result.applied >= 8, true)
  assert.equal(result.counts.relationship_participants, 2)
  assert.equal(result.counts.relationship_reading_grants, 2)
  assert.equal(result.counts.reading_interpretations, 1)
})
