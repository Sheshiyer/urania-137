#!/usr/bin/env node
/**
 * V7 static delink gate (T-062) — asserts the repo carries ZERO live Vercel
 * references after the Cloudflare Pages migration. Static half of V7; the
 * deploy half is T-063 (pending the owner's Cloudflare account).
 *
 *   node scripts/verify/delink-check.mjs     # exit 0 = delinked, 1 = remnant found
 *
 * What fails the gate (scanned over every git-tracked file, contents AND
 * filenames):
 *   - the literal host string  vercel.app        (T-062 amendment)
 *   - vercel.json              (routing config)
 *   - @vercel/                 (package scope / imports)
 *   - api/proxy                (the retired serverless proxy + /api/proxy routing)
 *   - vercel dev               (retired dev instruction)
 *   - .vercel                  (the link directory)
 *   - package.json dependency keys in the @vercel/* scope or named "vercel"
 *
 * Allowlist (explicit, audited): historical records that legitimately name the
 * old host — dated evidence/captures, the migration plan/spec, changelog
 * entries, captured-fixture provenance, the docs that RECORD the delink, and
 * this gate itself. Every excused hit is printed so the allowlist can never
 * silently grow.
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const PATTERNS = [
  /vercel\.app/i,
  /vercel\.json/i,
  /@vercel\//i,
  /api\/proxy/i,
  /vercel dev/i,
  /\.vercel/i,
]

const ALLOWLIST = [
  { match: 'ISA.md', why: 'changelog/history + the V7 ISC text that names what was removed' },
  { match: 'docs/integrated-product-map.md', why: 'records the delink; names the removed artifacts' },
  { match: 'docs/selemene-engine-requests.md', why: "dated 2026-07-19 'last verified' line is history" },
  { match: 'docs/daily/engine-schema-notes.md', why: 'dated 2026-07-19 live-capture notes' },
  { match: 'docs/auth/2026-07-20-t039-phase2-exit-gate.md', why: 'Phase-2 evidence bundle (historical)' },
  { match: 'docs/superpowers/', why: 'migration plan + design spec (historical)' },
  { match: 'scripts/verify/fixtures/', why: 'captured-baseline provenance (historical)' },
  { match: 'scripts/verify/delink-check.mjs', why: 'the gate defines the patterns it greps for' },
]

const allowlisted = (path) => ALLOWLIST.find((a) => path.startsWith(a.match))

const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean)

const hits = []
const excused = []

for (const path of tracked) {
  // 1. Filenames: a tracked vercel.json / .vercel/* / api/proxy.* is a remnant
  //    even before its contents are read.
  for (const re of PATTERNS) {
    if (re.test(path)) {
      (allowlisted(path) ? excused : hits).push({ path, line: 0, text: `(filename) ${path}`, pattern: re.source })
      break
    }
  }
  // 2. Contents.
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    continue // binary or unreadable — skip contents, filename already checked
  }
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    for (const re of PATTERNS) {
      if (re.test(lines[i])) {
        const entry = { path, line: i + 1, text: lines[i].trim().slice(0, 140), pattern: re.source }
        const allow = allowlisted(path)
        if (allow) excused.push({ ...entry, why: allow.why })
        else hits.push(entry)
        break // one hit per line is enough
      }
    }
  }
}

// 3. package.json dependency keys.
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
  for (const dep of Object.keys(pkg[section] || {})) {
    if (dep === 'vercel' || dep.startsWith('@vercel/')) {
      hits.push({ path: 'package.json', line: 0, text: `"${dep}" in ${section}`, pattern: 'dep-key' })
    }
  }
}

console.log(`V7 static delink gate — scanned ${tracked.length} tracked files`)
if (excused.length) {
  console.log(`\nallowlisted (historical, ${excused.length} hit${excused.length === 1 ? '' : 's'}):`)
  for (const e of excused) console.log(`  ~ ${e.path}${e.line ? `:${e.line}` : ''}  [${e.pattern}]  (${e.why})`)
}

if (hits.length) {
  console.log(`\nFAIL — ${hits.length} live Vercel remnant${hits.length === 1 ? '' : 's'} outside the allowlist:`)
  for (const h of hits) console.log(`  ✗ ${h.path}${h.line ? `:${h.line}` : ''}  [${h.pattern}]  ${h.text}`)
  process.exit(1)
}

console.log('\nPASS — zero live Vercel references: no vercel.app host string, no vercel.json,')
console.log('no api/proxy routing, no @vercel/* dep, no .vercel dir, no `vercel dev` instruction.')
process.exit(0)
