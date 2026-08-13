#!/usr/bin/env node
/**
 * Upload 723 corpus reading HTML files to the R2 bucket configured for the
 * corpus data browser (READINGS_BUCKET = urania-137-corpus).
 *
 * Each reading is addressable by its SHA-256 checksum — the same value used
 * in D1 catalogue_readings.sha256 — under the key prefix:
 *   corpus/readings/{sha256}/reading.html
 *
 * Dry-run by default (lists files that *would* be uploaded + their R2 keys).
 * Use --apply to execute uploads through the Wrangler R2 API with owner consent.
 *
 * Usage:
 *   node scripts/readings/upload-corpus-to-r2.mjs \
 *     --corpus-root <absolute-path-to-723> \
 *     --owner-email <email> \
 *     --confirm-owner-consent \
 *     [--apply] [--dry-run] [--report <file>]
 *
 * Requires CLOUDFLARE_ACCOUNT_ID in env (or wrangler login context).
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { buildArchiveInventory } from './lib/archive-import.mjs'

const USAGE = `Usage:
  node scripts/readings/upload-corpus-to-r2.mjs \\
    --corpus-root <723-dir> \\
    --owner-email <email> \\
    --confirm-owner-consent \\
    [--apply] [--dry-run] [--report <file>]

Scans the corpus directory, computes SHA-256 for each reading.html, and uploads
to R2 under corpus/readings/{sha256}/reading.html (owner-scoped).
Dry-run by default; use --apply to write to R2.
`

function parseOperatorArgs(args) {
  return parseArgs({
    args,
    allowPositionals: false,
    strict: true,
    options: {
      'corpus-root': { type: 'string' },
      'owner-email': { type: 'string' },
      'confirm-owner-consent': { type: 'boolean', default: false },
      apply: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      report: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  }).values
}

export async function buildR2UploadPlan(options = {}) {
  const { corpusRoot, ownerEmail } = options

  const inventory = await buildArchiveInventory({ corpusRoot, ownerEmail })

  const uploads = inventory.units.map((unit) => ({
    unitKey: unit.unitKey,
    unitLabel: unit.unitLabel,
    readingType: unit.readingType,
    title: unit.title,
    sha256: unit.artifact.contentSha256,
    r2Key: `corpus/readings/${unit.artifact.contentSha256}/reading.html`,
    bodySha256: unit.source.contentSha256,
    byteSize: unit.artifact.byteSize,
    locator: unit.artifact.objectLocator,
    mode: unit.readingType === 'synastry' ? 'Synastry' : 'Solo',
  }))

  return {
    schemaVersion: 'r2-upload-v1',
    ownerEmail,
    ownerEmailSha256: inventory.ownerEmailSha256,
    consentBasis: inventory.consentBasis,
    manifestId: inventory.manifestId,
    manifestSha256: inventory.manifestSha256,
    counts: inventory.counts,
    totals: inventory.totals,
    uploads,
  }
}

export async function uploadToR2(plan, options = {}) {
  const { R2, accountId } = options

  if (!accountId) throw new Error('accountId is required for --apply')
  if (!R2) {
    // Fall back to wrangler R2 via API
    const { execSync } = await import('node:child_process')
    for (const upload of plan.uploads) {
      const cmd = `wrangler r2 object put "urania-137-corpus/${upload.r2Key}" --file "${upload.locator}" --remote`
      try {
        execSync(cmd, { stdio: 'pipe' })
        console.log(`[R2] Uploaded ${upload.r2Key} (${upload.byteSize} bytes)`)
      } catch (error) {
        console.error(`[R2 ERROR] Failed ${upload.r2Key}: ${error.message}`)
      }
    }
    return { method: 'wrangler-cli', uploads: plan.uploads.length }
  }

  const results = []
  for (const upload of plan.uploads) {
    const fileBuffer = await readFile(upload.locator)
    const object = await R2.put(upload.r2Key, fileBuffer, {
      httpMetadata: {
        contentType: 'text/html; charset=utf-8',
      },
      customMetadata: {
        owner_email_sha256: plan.ownerEmailSha256,
        reading_type: upload.readingType,
        mode: upload.mode,
        source_corpus_relative_path: upload.unitKey,
        consent_basis: plan.consentBasis,
      },
    })
    results.push({ r2Key: upload.r2Key, etag: object.etag, sha256: upload.sha256 })
  }
  return { method: 'direct-api', uploads: results.length }
}

export async function serializeR2Plan(plan, options = {}) {
  const summary = {
    schemaVersion: plan.schemaVersion,
    owner: {
      emailSha256: plan.ownerEmailSha256,
      consentBasis: plan.consentBasis,
    },
    manifestId: plan.manifestId,
    manifestSha256: plan.manifestSha256,
    counts: plan.counts,
    totals: plan.totals,
    r2Bucket: 'urania-137-corpus',
    keyPattern: 'corpus/readings/{sha256}/reading.html',
    uploads: plan.uploads.map((u) => ({
      r2Key: u.r2Key,
      sha256: u.sha256,
      byteSize: u.byteSize,
      unitKey: u.unitKey,
      mode: u.mode,
      title: u.title,
    })),
  }
  return JSON.stringify(summary, null, 2)
}

async function main(args = process.argv.slice(2), env = process.env) {
  const values = parseOperatorArgs(args)
  if (values.help) {
    process.stdout.write(USAGE)
    return
  }
  if (!values['corpus-root']) throw new Error('--corpus-root is required')
  if (!values['owner-email']) throw new Error('--owner-email is required')
  if (!values['confirm-owner-consent']) {
    throw new Error('--confirm-owner-consent is required')
  }

  const plan = await buildR2UploadPlan({
    corpusRoot: path.resolve(values['corpus-root']),
    ownerEmail: values['owner-email'],
  })

  if (values['dry-run'] || !values.apply) {
    const summary = await serializeR2Plan(plan)
    if (values.report) {
      await writeFile(path.resolve(values.report), summary, 'utf8')
      process.stderr.write(`Dry-run report written to ${values.report}\n`)
    }
    process.stdout.write(summary + '\n')
    return
  }

  const result = await uploadToR2(plan, {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
  })
  process.stdout.write(
    JSON.stringify({ status: 'applied', ...result }, null, 2) + '\n'
  )
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isMain) {
  main().catch((error) => {
    process.stderr.write(`R2 upload refused: ${error.message}\n`)
    process.exitCode = 1
  })
}

export { parseOperatorArgs }
