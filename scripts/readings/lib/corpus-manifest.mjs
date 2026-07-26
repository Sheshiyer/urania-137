import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, readdir } from 'node:fs/promises'
import path from 'node:path'

export const CORPUS_MANIFEST_SCHEMA_VERSION = 1

const MEDIA_TYPES = new Map([
  ['.csv', 'text/csv'],
  ['.doc', 'application/msword'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['.gif', 'image/gif'],
  ['.htm', 'text/html'],
  ['.html', 'text/html'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.json', 'application/json'],
  ['.m4a', 'audio/mp4'],
  ['.md', 'text/markdown'],
  ['.mov', 'video/quicktime'],
  ['.mp3', 'audio/mpeg'],
  ['.mp4', 'video/mp4'],
  ['.ogg', 'audio/ogg'],
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.ppt', 'application/vnd.ms-powerpoint'],
  ['.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ['.rtf', 'application/rtf'],
  ['.svg', 'image/svg+xml'],
  ['.text', 'text/plain'],
  ['.txt', 'text/plain'],
  ['.wav', 'audio/wav'],
  ['.webm', 'video/webm'],
  ['.webp', 'image/webp'],
  ['.xls', 'application/vnd.ms-excel'],
  ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['.xml', 'application/xml'],
  ['.yaml', 'application/yaml'],
  ['.yml', 'application/yaml'],
])

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function normalizeRelativePath(value) {
  return value.split(path.sep).join('/').normalize('NFC')
}

function stableId(prefix, identity) {
  return `${prefix}_${sha256(identity)}`
}

export function mediaTypeFor(filePath) {
  return MEDIA_TYPES.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream'
}

export function isManifestPath(filePath) {
  return /^manifest.*\.json$/i.test(path.posix.basename(normalizeRelativePath(filePath)))
}

export async function sha256File(filePath, options = {}) {
  if (options.readFile) {
    return sha256(await options.readFile(filePath))
  }

  const digest = createHash('sha256')
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath)
    stream.on('data', (chunk) => digest.update(chunk))
    stream.on('error', reject)
    stream.on('end', resolve)
  })
  return digest.digest('hex')
}

async function candidateDirectories(root, topLevelName, prefix) {
  const directory = path.join(root, topLevelName)
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return []
    throw error
  })

  return entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.isSymbolicLink() &&
        !entry.name.startsWith('.'),
    )
    .map((entry) => {
      const label = entry.name.normalize('NFC')
      const candidatePath = `${topLevelName}/${label}`
      return {
        candidateId: stableId(prefix, candidatePath),
        label,
        path: candidatePath,
        provisional: true,
        ownerIdentity: false,
      }
    })
    .sort((left, right) => compareText(left.path, right.path))
}

function sortedCounts(counts) {
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => compareText(left, right)))
}

function topLevelFor(relativePath) {
  const separator = relativePath.indexOf('/')
  return separator === -1 ? '(root)' : relativePath.slice(0, separator)
}

function extensionFor(relativePath) {
  return path.posix.extname(relativePath).toLowerCase() || '(none)'
}

function normalizeArguments(rootOrOptions, maybeOptions) {
  if (typeof rootOrOptions === 'string' || rootOrOptions instanceof URL) {
    return {
      root: rootOrOptions instanceof URL ? rootOrOptions.pathname : rootOrOptions,
      ...maybeOptions,
    }
  }
  if (rootOrOptions && typeof rootOrOptions === 'object') return { ...rootOrOptions }
  return {}
}

/**
 * Catalogue a corpus without mutation.
 *
 * File bodies are opened only when catalogueOnly is false, solely to compute
 * their SHA-256 checksum. IDs use normalized relative paths so a source keeps
 * its identity when its content changes.
 */
export async function buildCorpusManifest(rootOrOptions, maybeOptions = {}) {
  const options = normalizeArguments(rootOrOptions, maybeOptions)
  if (!options.root) throw new TypeError('A corpus root directory is required')

  const root = path.resolve(options.root)
  const rootInfo = await lstat(root).catch((error) => {
    if (error?.code === 'ENOENT') return null
    throw error
  })
  if (!rootInfo?.isDirectory() || rootInfo.isSymbolicLink()) {
    throw new Error(`Corpus directory not found: ${root}`)
  }

  const catalogueOnly = options.catalogueOnly === true
  const sources = []
  let directories = 0

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    entries.sort((left, right) => compareText(left.name, right.name))

    for (const entry of entries) {
      if (entry.name === '.DS_Store' || entry.isSymbolicLink()) continue
      const absolutePath = path.join(directory, entry.name)
      const relativePath = normalizeRelativePath(path.relative(root, absolutePath))

      if (entry.isDirectory()) {
        directories += 1
        await walk(absolutePath)
        continue
      }
      if (!entry.isFile()) continue

      const fileInfo = await lstat(absolutePath)
      if (!fileInfo.isFile() || fileInfo.isSymbolicLink()) continue
      const checksum = catalogueOnly
        ? null
        : {
            algorithm: 'sha256',
            value: await sha256File(absolutePath, { readFile: options.readFile }),
          }

      sources.push({
        sourceId: stableId('source', relativePath),
        path: relativePath,
        bytes: fileInfo.size,
        mediaType: mediaTypeFor(relativePath),
        checksum,
        manifest: isManifestPath(relativePath),
      })
    }
  }

  await walk(root)
  sources.sort((left, right) => compareText(left.path, right.path))

  const byTopLevel = new Map()
  const byExtension = new Map()
  let bytes = 0
  for (const source of sources) {
    bytes += source.bytes
    const topLevel = topLevelFor(source.path)
    const extension = extensionFor(source.path)
    byTopLevel.set(topLevel, (byTopLevel.get(topLevel) ?? 0) + 1)
    byExtension.set(extension, (byExtension.get(extension) ?? 0) + 1)
  }

  const ownerEmail =
    typeof options.owner === 'string' && options.owner.trim()
      ? options.owner.trim().toLowerCase()
      : null
  const manifestBody = {
    schemaVersion: CORPUS_MANIFEST_SCHEMA_VERSION,
    corpus: path.basename(root).normalize('NFC'),
    mode: catalogueOnly ? 'catalogue-only' : 'checksummed',
    owner: {
      email: ownerEmail,
      mapping: ownerEmail ? 'catalogue-owner-only' : 'unassigned',
    },
    totals: {
      files: sources.length,
      directories,
      bytes,
      byTopLevel: sortedCounts(byTopLevel),
      byExtension: sortedCounts(byExtension),
    },
    subjectCandidates: await candidateDirectories(root, 'Solos', 'subject'),
    relationshipCandidates: await candidateDirectories(root, 'Synastry', 'relationship'),
    manifests: sources.filter((source) => source.manifest).map((source) => source.path),
    sources,
    invariants: [
      'owner identity is not a subject identity',
      'directory names are provisional candidates until alias review',
      'cataloguing does not import or mutate corpus content',
    ],
  }

  return {
    ...manifestBody,
    manifestId: stableId('manifest', JSON.stringify(manifestBody)),
  }
}

export const generateCorpusManifest = buildCorpusManifest
