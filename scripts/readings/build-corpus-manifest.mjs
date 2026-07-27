#!/usr/bin/env node

import { pathToFileURL } from 'node:url'
import { buildCorpusManifest } from './lib/corpus-manifest.mjs'

const USAGE =
  'Usage: build-corpus-manifest.mjs /absolute/path/to/corpus [--owner email] [--catalogue-only]'

export function parseArguments(args) {
  let root = null
  let owner = null
  let catalogueOnly = false

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--catalogue-only') {
      catalogueOnly = true
      continue
    }
    if (argument === '--owner') {
      owner = args[index + 1]
      if (!owner || owner.startsWith('--')) throw new Error('--owner requires an email value')
      index += 1
      continue
    }
    if (argument === '--help' || argument === '-h') return { help: true }
    if (argument.startsWith('--')) throw new Error(`Unknown option: ${argument}`)
    if (root) throw new Error(`Unexpected positional argument: ${argument}`)
    root = argument
  }

  if (!root) throw new Error('A corpus root directory is required')
  return { root, owner, catalogueOnly, help: false }
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArguments(args)
  if (options.help) {
    process.stdout.write(`${USAGE}\n`)
    return
  }
  const manifest = await buildCorpusManifest(options)
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`)
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n${USAGE}\n`)
    process.exitCode = 1
  })
}
