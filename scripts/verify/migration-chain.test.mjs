import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'
import { resolve } from 'node:path'

const migrationsDir = resolve(import.meta.dirname, '../../migrations')

test('D1 migrations are contiguous, unique, and non-empty', () => {
  const files = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort()
  assert.ok(files.length > 0)
  const seen = new Set()
  files.forEach((file, index) => {
    const match = file.match(/^(\d{4})_[a-z0-9_]+\.sql$/)
    assert.ok(match, `invalid migration filename: ${file}`)
    const number = Number(match[1])
    assert.equal(number, index + 1, `migration gap or reorder at ${file}`)
    assert.equal(seen.has(number), false, `duplicate migration number: ${number}`)
    seen.add(number)
    const sql = readFileSync(resolve(migrationsDir, file), 'utf8')
      .replace(/--.*$/gm, '')
      .trim()
    assert.ok(sql.length > 0, `migration contains no SQL: ${file}`)
  })
})
