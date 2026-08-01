#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, resolve } from 'node:path'

// Temporary no-regression ceiling for the protected app. Task 17 must ratchet
// this below the current large-entry warning after route-level code splitting.
const BUDGETS = {
  app: { entryBytes: 575_000, entryGzipBytes: 170_000, totalBytes: 625_000 },
  landing: { entryBytes: 160_000, entryGzipBytes: 55_000, totalBytes: 190_000 },
}

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(path) : [path]
  })
}

export function measureJavaScript(directory) {
  if (!existsSync(directory)) return null
  const files = filesUnder(directory).filter((file) => file.endsWith('.js'))
  if (files.length === 0) throw new Error(`no JavaScript artifacts found under ${directory}`)
  const measured = files.map((file) => {
    const body = readFileSync(file)
    return { file, bytes: statSync(file).size, gzipBytes: gzipSync(body).length }
  })
  const entry = measured.toSorted((a, b) => b.bytes - a.bytes)[0]
  return {
    files: measured,
    entry,
    totalBytes: measured.reduce((sum, file) => sum + file.bytes, 0),
  }
}

export function checkBudget(label, measurement, budget) {
  if (!measurement) return []
  const issues = []
  if (measurement.entry.bytes > budget.entryBytes) issues.push(`${label}-entry-bytes`)
  if (measurement.entry.gzipBytes > budget.entryGzipBytes) issues.push(`${label}-entry-gzip-bytes`)
  if (measurement.totalBytes > budget.totalBytes) issues.push(`${label}-total-bytes`)
  return issues
}

function parseArgs(argv) {
  const args = { appDir: null, landingDir: 'dist/landing' }
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--app-dir') args.appDir = argv[++index]
    else if (argv[index] === '--landing-dir') args.landingDir = argv[++index]
    else throw new Error(`unknown argument: ${argv[index]}`)
  }
  if (!args.appDir) args.appDir = existsSync('dist/app') ? 'dist/app' : 'dist'
  return args
}

try {
  const args = parseArgs(process.argv.slice(2))
  const app = measureJavaScript(resolve(args.appDir))
  const landing = existsSync(args.landingDir) ? measureJavaScript(resolve(args.landingDir)) : null
  const issues = [
    ...checkBudget('app', app, BUDGETS.app),
    ...checkBudget('landing', landing, BUDGETS.landing),
  ]
  console.log(JSON.stringify({ ok: issues.length === 0, budgets: BUDGETS, app, landing, issues }, null, 2))
  if (issues.length > 0) process.exitCode = 1
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
