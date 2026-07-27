import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('../../', import.meta.url))
const sourceRoot = join(root, 'src')
const forbidden = [
  /\.assets\/generated/,
  /\.assets\/page-references/,
  /(?:component-atlas|reading-folio|engine-component-families|engine-reading-surfaces(?:-final)?)\.png/,
]

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : []
  })
}

test('generated references never become runtime source or fixtures', () => {
  const violations = sourceFiles(sourceRoot).flatMap((path) => {
    const source = readFileSync(path, 'utf8')
    return forbidden.some((pattern) => pattern.test(source))
      ? [relative(root, path)]
      : []
  })

  assert.deepEqual(
    violations,
    [],
    `generated-reference boundary crossed by: ${violations.join(', ')}`,
  )
})
