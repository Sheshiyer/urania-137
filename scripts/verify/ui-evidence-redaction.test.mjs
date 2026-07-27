import assert from 'node:assert/strict'
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs'
import {
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('../../', import.meta.url))
const evidenceRoot = join(root, 'docs/ui/evidence/realignment')
const manifestRelative = 'docs/ui/evidence/realignment/manifest.json'
const allowlistRelative = 'docs/ui/evidence/realignment/allowlist.txt'
const readmeRelative = 'docs/ui/evidence/realignment/README.md'
const fixturesRelative = 'scripts/verify/ui-fixtures.mjs'

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function allowlist() {
  assert.ok(existsSync(join(root, allowlistRelative)), `${allowlistRelative} is missing`)
  const entries = read(allowlistRelative)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))

  assert.equal(new Set(entries).size, entries.length, 'evidence allowlist contains duplicates')
  for (const entry of entries) {
    assert.equal(isAbsolute(entry), false, `allowlist path must be repository-relative: ${entry}`)
    assert.equal(entry.includes('..'), false, `allowlist path may not traverse: ${entry}`)
    assert.equal(
      resolve(root, entry).startsWith(`${resolve(evidenceRoot)}/`) || resolve(root, entry) === resolve(evidenceRoot),
      true,
      `allowlist path escapes the evidence directory: ${entry}`,
    )
  }
  return entries
}

function filesUnder(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return filesUnder(path)
    return entry.isFile() ? [relative(root, path)] : []
  })
}

function manifest() {
  assert.ok(existsSync(join(root, manifestRelative)), `${manifestRelative} is missing`)
  return JSON.parse(read(manifestRelative))
}

function recordText(path) {
  assert.ok(existsSync(join(root, path)), `matrix record is missing: ${path}`)
  assert.ok(statSync(join(root, path)).isFile(), `matrix record is not a file: ${path}`)
  return read(path)
}

function sensitiveKeyValueViolations(text) {
  const violations = []
  const sensitiveValue = String.raw`(?!\s*["']?(?:\[(?:REDACTED|MASKED)\]|Reader A|null|none|omitted)["']?(?:[,}\n]|$))\s*`
  const keyValuePatterns = [
    new RegExp(String.raw`["']?(?:authorization|cookie|invitation_token|access_token|refresh_token|id_token|session_token|bearer_token|api_key|client_secret|private_key)["']?\s*[:=]${sensitiveValue}["'][^"'\n]+["']`, 'gi'),
    new RegExp(String.raw`["']?(?:birth_date|birth_time|birth_place|date_of_birth|birth_location|latitude|longitude)["']?\s*[:=]${sensitiveValue}["']?[^,}\n]+`, 'gi'),
    new RegExp(String.raw`["']?(?:raw_capture|capture_data|capture_payload|image_data|image_base64|audio_base64|video_base64|media_payload|b64_json)["']?\s*[:=]${sensitiveValue}["'][^"'\n]+["']`, 'gi'),
  ]
  for (const pattern of keyValuePatterns) {
    if (pattern.test(text)) violations.push(pattern.source)
  }
  return violations
}

function privacyViolations(path, text, syntheticLabels) {
  const violations = []
  for (const match of text.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)) {
    if (!match[0].toLowerCase().endsWith('.test')) {
      violations.push(`real email ${match[0]}`)
    }
  }
  const forbidden = [
    [/\bBearer\s+[A-Za-z0-9._~+/-]{8,}=*/i, 'bearer credential'],
    [/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/, 'JWT-shaped credential'],
    [/(?:[?&](?:token|access_token|invitation_token|sig|signature|key)=)[^&\s"']+/i, 'credential URL'],
    [/(?:^|[\s"'(])\/(?:Volumes|Users)\/[^\s"')]+/m, 'absolute local path'],
    [/\b(?:twc-vault|Selemene-engine\/|tryambakam-noesis\/723\/)\b/i, 'absolute corpus reference'],
    [/data:(?:image|audio|video|application\/octet-stream)\/?[^,]*;base64,/i, 'embedded media payload'],
    [/(?:^|[^A-Za-z0-9+/])[A-Za-z0-9+/]{256,}={0,2}(?:$|[^A-Za-z0-9+/])/m, 'base64-shaped payload'],
    [/\bshesh\s*narayan(?:i?yer)?\b|\bsheshnarayan(?:i?yer)?\b/i, 'unmasked production name'],
  ]
  for (const [pattern, label] of forbidden) {
    if (pattern.test(text)) violations.push(label)
  }
  violations.push(...sensitiveKeyValueViolations(text).map(() => 'sensitive key value'))

  const identityValue = /["']?(?:ownerName|subjectName|participantName|displayName|userName)["']?\s*[:=]\s*["']([^"']+)["']/gi
  for (const match of text.matchAll(identityValue)) {
    if (!syntheticLabels.has(match[1]) && !/^\[(?:REDACTED|MASKED)\]$/i.test(match[1])) {
      violations.push(`unmasked identity name ${match[1]}`)
    }
  }

  return violations.map((violation) => `${path}: ${violation}`)
}

test('manifest and allowlist enumerate the complete bounded evidence set', () => {
  const entries = allowlist()
  for (const required of [allowlistRelative, readmeRelative, manifestRelative]) {
    assert.ok(entries.includes(required), `${required} is not allowlisted`)
  }
  for (const entry of entries) {
    assert.ok(existsSync(join(root, entry)), `allowlisted evidence is missing: ${entry}`)
    assert.ok(statSync(join(root, entry)).isFile(), `allowlisted evidence is not a file: ${entry}`)
  }
  assert.deepEqual(
    filesUnder(evidenceRoot).sort(),
    [...entries].sort(),
    'evidence directory and allowlist differ',
  )
})

test('every matrix row has DOM, request, console, axe, and screenshot evidence', () => {
  const entries = new Set(allowlist())
  const evidence = manifest()
  assert.ok(Array.isArray(evidence.rows) && evidence.rows.length > 0, 'manifest.rows is empty')
  assert.ok(
    Array.isArray(evidence.syntheticFixtureLabels) && evidence.syntheticFixtureLabels.length > 0,
    'manifest.syntheticFixtureLabels is empty',
  )
  const labels = new Set(evidence.syntheticFixtureLabels)
  assert.equal(labels.size, evidence.syntheticFixtureLabels.length, 'synthetic fixture labels repeat')

  const rowIds = new Set()
  const screenshots = new Set()
  for (const row of evidence.rows) {
    assert.equal(typeof row.id, 'string', 'matrix row id is missing')
    assert.ok(row.id.length > 0, 'matrix row id is empty')
    assert.equal(rowIds.has(row.id), false, `matrix row id repeats: ${row.id}`)
    rowIds.add(row.id)
    assert.ok(labels.has(row.fixtureLabel), `${row.id} uses undeclared fixture label`)

    for (const field of ['screenshot', 'domText', 'requests', 'console', 'axe']) {
      assert.equal(typeof row[field], 'string', `${row.id}.${field} must be an artifact path`)
      assert.ok(entries.has(row[field]), `${row.id}.${field} is not allowlisted`)
      recordText(row[field])
    }
    assert.equal(extname(row.screenshot).toLowerCase(), '.png', `${row.id} screenshot is not PNG`)
    assert.equal(screenshots.has(row.screenshot), false, `screenshot reused across rows: ${row.screenshot}`)
    screenshots.add(row.screenshot)

    const dom = recordText(row.domText)
    assert.match(dom, new RegExp(row.fixtureLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('allowlisted text, JSON records, and deterministic fixtures contain no private data', () => {
  const evidence = manifest()
  const labels = new Set(evidence.syntheticFixtureLabels)
  const entries = allowlist()
  const textArtifacts = entries.filter((path) => ['.json', '.txt', '.md'].includes(extname(path)))
  assert.ok(existsSync(join(root, fixturesRelative)), `${fixturesRelative} is missing`)

  const violations = [
    ...textArtifacts.flatMap((path) => privacyViolations(path, read(path), labels)),
    ...privacyViolations(fixturesRelative, read(fixturesRelative), labels),
  ]
  assert.deepEqual(violations, [], violations.join('\n'))
})

test('screenshot rows use only declared synthetic identity labels', () => {
  const evidence = manifest()
  const labels = new Set(evidence.syntheticFixtureLabels)
  assert.ok(labels.has('Reader A'), 'Reader A must be the screenshot identity mask')

  for (const row of evidence.rows) {
    assert.ok(labels.has(row.fixtureLabel), `${row.id} screenshot label is not synthetic`)
    const dom = recordText(row.domText)
    for (const match of dom.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)) {
      assert.ok(match[0].toLowerCase().endsWith('.test'), `${row.id} exposes a non-test email`)
    }
  }
})
