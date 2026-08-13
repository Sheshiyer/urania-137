#!/usr/bin/env node
/**
 * Upload 723 corpus pattern embeddings to the Vectorize index configured for
 * the corpus data browser (PATTERN_INDEX = urania-137-corpus-index).
 *
 * For each reading unit in the corpus inventory:
 *   1. Extract the pattern text (assembled_preview JSON for Solo units;
 *      reading.html `<body>` text for Synastry units).
 *   2. Generate a 384-dim embedding via Workers AI `@cf/baai/bge-small-en-v1.5`
 *      (Cloudflare REST API — same model the /api/patterns/search route uses).
 *   3. Upsert the vector with owner-scoped metadata that mirrors the
 *      `.swarm/r2-vectorize-resources.md` schema:
 *        reading_sha256, owner_email, title, mode, source_type, created_at, preview.
 *
 * Vector IDs are the raw 64-char SHA-256 content checksum (the same value in
 * D1 catalogue_readings.sha256 and the R2 key) — within Vectorize's 64-byte
 * id limit and stable across re-runs, so re-runs upsert instead of duplicating.
 *
 * Dry-run by default (generates the NDJSON payload + prints a summary).
 * Use --apply to POST to the Vectorize REST API with owner consent.
 *
 * Usage:
 *   node scripts/readings/upload-embeddings-to-vectorize.mjs \
 *     --corpus-root <absolute-path-to-723> \
 *     --owner-email <email> \
 *     --confirm-owner-consent \
 *     [--apply] [--dry-run] [--report <file>] [--batch-size <n>]
 *
 * Requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in env for --apply.
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { buildArchiveInventory } from './lib/archive-import.mjs'

const EMBEDDING_MODEL = '@cf/baai/bge-small-en-v1.5'
const EMBEDDING_DIMENSIONS = 384
const VECTORIZE_INDEX = 'urania-137-corpus-index'

const USAGE = `Usage:
  node scripts/readings/upload-embeddings-to-vectorize.mjs \\
    --corpus-root <723-dir> \\
    --owner-email <email> \\
    --confirm-owner-consent \\
    [--apply] [--dry-run] [--report <file>]

Generates ${EMBEDDING_DIMENSIONS}-dim embeddings (${EMBEDDING_MODEL}) for each reading and
upserts them into the ${VECTORIZE_INDEX} Vectorize index with owner-scoped metadata.
Dry-run by default; use --apply to POST to Cloudflare.
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
      'batch-size': { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  }).values
}

/** Strip HTML to a plain-text preview for embedding + metadata. */
export function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Locate the JSON assembled preview for a Solo unit, if present. */
async function loadSoloPatternText(unit) {
  const resultJson = path.join(
    unit.source.locator.split(path.sep).slice(0, -2).join(path.sep),
    'new-l0-result.json',
  )
  try {
    const raw = await readFile(resultJson, 'utf8')
    const parsed = JSON.parse(raw)
    const preview = parsed?.assembled_preview
    if (typeof preview === 'string' && preview.trim()) {
      return preview.trim()
    }
  } catch {
    // Fall through to HTML extraction.
  }
  return null
}

/** Determine the text to embed for a reading unit. */
async function patternTextFor(unit) {
  // Solo units carry a structured assembled_preview in new-l0-result.json.
  if (unit.readingType === 'solo') {
    const preview = await loadSoloPatternText(unit)
    if (preview) return preview
  }
  // Fallback: extract text from the rendered reading.html body.
  const html = await readFile(unit.source.locator, 'utf8')
  return htmlToText(html)
}

/** Build the full vector+metadata plan without calling the network. */
export async function buildEmbeddingPlan(options = {}) {
  const { corpusRoot, ownerEmail } = options
  const inventory = await buildArchiveInventory({ corpusRoot, ownerEmail })

  const vectors = []
  for (const unit of inventory.units) {
    const text = await patternTextFor(unit)
    const preview = text.slice(0, 200)
    vectors.push({
      id: unit.artifact.contentSha256,
      text,
      metadata: {
        reading_sha256: unit.artifact.contentSha256,
        owner_email: ownerEmail,
        title: unit.title,
        mode: unit.readingType === 'synastry' ? 'Synastry' : 'Solo',
        source_type: 'integrated-kundali-l0',
        created_at: new Date().toISOString(),
        preview,
      },
      unitKey: unit.unitKey,
    })
  }

  return {
    schemaVersion: 'vectorize-upload-v1',
    ownerEmail,
    ownerEmailSha256: inventory.ownerEmailSha256,
    consentBasis: inventory.consentBasis,
    manifestId: inventory.manifestId,
    counts: inventory.counts,
    indexName: VECTORIZE_INDEX,
    embeddingModel: EMBEDDING_MODEL,
    embeddingDimensions: EMBEDDING_DIMENSIONS,
    vectors,
  }
}

/** Generate embeddings via the Cloudflare Workers AI REST API. */
async function embedText(apiToken, accountId, text) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${EMBEDDING_MODEL}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: [text] }),
  })
  if (!res.ok) {
    throw new Error(`embedding failed (${res.status}): ${await res.text()}`)
  }
  const body = await res.json()
  const vector = body?.result?.data?.[0]
  if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `unexpected embedding shape (got ${Array.isArray(vector) ? vector.length : 'none'} dims, expected ${EMBEDDING_DIMENSIONS})`,
    )
  }
  return vector
}

/** Upsert a batch of vectors to Vectorize via the REST API (NDJSON body). */
async function upsertVectors(apiToken, accountId, entries) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${VECTORIZE_INDEX}/upsert`
  const ndjson = entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/x-ndjson',
    },
    body: ndjson,
  })
  if (!res.ok) {
    throw new Error(`upsert failed (${res.status}): ${await res.text()}`)
  }
  return res.json()
}

export async function serializeEmbeddingPlan(plan) {
  return JSON.stringify(
    {
      schemaVersion: plan.schemaVersion,
      owner: {
        emailSha256: plan.ownerEmailSha256,
        consentBasis: plan.consentBasis,
      },
      manifestId: plan.manifestId,
      counts: plan.counts,
      indexName: plan.indexName,
      embeddingModel: plan.embeddingModel,
      embeddingDimensions: plan.embeddingDimensions,
      vectors: plan.vectors.map((v) => ({
        id: v.id,
        unitKey: v.unitKey,
        title: v.metadata.title,
        mode: v.metadata.mode,
        preview_chars: v.metadata.preview.length,
      })),
    },
    null,
    2,
  )
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

  const plan = await buildEmbeddingPlan({
    corpusRoot: path.resolve(values['corpus-root']),
    ownerEmail: values['owner-email'],
  })

  if (values['dry-run'] || !values.apply) {
    const summary = await serializeEmbeddingPlan(plan)
    if (values.report) {
      await writeFile(path.resolve(values.report), summary, 'utf8')
      process.stderr.write(`Dry-run report written to ${values.report}\n`)
    }
    process.stdout.write(summary + '\n')
    return
  }

  const apiToken = env.CLOUDFLARE_API_TOKEN
  const accountId = env.CLOUDFLARE_ACCOUNT_ID
  if (!apiToken) throw new Error('CLOUDFLARE_API_TOKEN is required for --apply')
  if (!accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID is required for --apply')

  const batchSize = values['batch-size'] ? Number(values['batch-size']) : 10
  let done = 0
  const failed = []

  for (let i = 0; i < plan.vectors.length; i += batchSize) {
    const batch = plan.vectors.slice(i, i + batchSize)
    const entries = []
    for (const v of batch) {
      const vector = await embedText(apiToken, accountId, v.text)
      entries.push({ id: v.id, values: vector, metadata: v.metadata })
    }
    try {
      await upsertVectors(apiToken, accountId, entries)
      done += entries.length
      process.stderr.write(`[Vectorize] upserted ${done}/${plan.vectors.length}\n`)
    } catch (error) {
      failed.push(...batch.map((v) => v.id))
      process.stderr.write(`[Vectorize ERROR] batch ${i} failed: ${error.message}\n`)
    }
  }

  process.stdout.write(
    JSON.stringify(
      { status: 'applied', uploaded: done, failed: failed.length, failed_ids: failed },
      null,
      2,
    ) + '\n',
  )
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isMain) {
  main().catch((error) => {
    process.stderr.write(`Vectorize upload refused: ${error.message}\n`)
    process.exitCode = 1
  })
}

export { parseOperatorArgs, patternTextFor }
