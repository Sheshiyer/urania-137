#!/usr/bin/env node

/**
 * Read-only catalogue pass for the 723 historical corpus.
 *
 * It prints structural metadata to stdout and never reads file bodies, writes
 * files, or mutates a remote service. Ownership is an explicit catalogue field;
 * immediate Solos/Synastry directories remain separate subject/relationship
 * candidates.
 *
 * Usage:
 *   node scripts/readings/catalog-corpus.mjs /absolute/path/to/723 \
 *     --owner sheshnarayan.iyer@gmail.com
 */

import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const args = process.argv.slice(2)
const rootArg = args.find((arg) => !arg.startsWith('--'))
const ownerIndex = args.indexOf('--owner')
const ownerEmail = ownerIndex >= 0 ? args[ownerIndex + 1] ?? null : null

if (!rootArg) {
  console.error('Usage: catalog-corpus.mjs /absolute/path/to/corpus [--owner email]')
  process.exit(1)
}

const root = path.resolve(rootArg)
const rootStat = await stat(root).catch(() => null)
if (!rootStat?.isDirectory()) {
  console.error(`Corpus directory not found: ${root}`)
  process.exit(1)
}

const totals = {
  files: 0,
  directories: 0,
  bytes: 0,
  byTopLevel: {},
  byExtension: {},
}
const manifests = []

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue
    const absolute = path.join(directory, entry.name)
    const relative = path.relative(root, absolute)
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) {
      totals.directories += 1
      await walk(absolute)
      continue
    }
    if (!entry.isFile()) continue
    totals.files += 1
    const info = await stat(absolute)
    totals.bytes += info.size
    const topLevel = relative.split(path.sep)[0] || '(root)'
    totals.byTopLevel[topLevel] = (totals.byTopLevel[topLevel] ?? 0) + 1
    const extension = path.extname(entry.name).toLowerCase() || '(none)'
    totals.byExtension[extension] = (totals.byExtension[extension] ?? 0) + 1
    if (/^manifest.*\.json$/i.test(entry.name)) manifests.push(relative)
  }
}

async function immediateDirectories(name) {
  const directory = path.join(root, name)
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort()
}

await walk(root)

const catalogue = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  root,
  owner: {
    email: ownerEmail,
    mapping: ownerEmail ? 'catalogue-owner-only' : 'unassigned',
  },
  totals: {
    ...totals,
    byTopLevel: Object.fromEntries(Object.entries(totals.byTopLevel).sort((a, b) => b[1] - a[1])),
    byExtension: Object.fromEntries(Object.entries(totals.byExtension).sort((a, b) => b[1] - a[1])),
  },
  subjectCandidates: await immediateDirectories('Solos'),
  relationshipCandidates: await immediateDirectories('Synastry'),
  manifests: manifests.sort(),
  invariants: [
    'owner identity is not a subject identity',
    'directory names are candidates until alias review',
    'legacy content is not current copy',
    'no corpus content was read or imported',
  ],
}

process.stdout.write(`${JSON.stringify(catalogue, null, 2)}\n`)
