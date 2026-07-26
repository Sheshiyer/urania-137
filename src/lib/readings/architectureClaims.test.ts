import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const architecture = readFileSync(new URL('../../../docs/living-readings-ecosystem.md', import.meta.url), 'utf8')
const catalogueScript = readFileSync(new URL('../../../scripts/readings/catalog-corpus.mjs', import.meta.url), 'utf8')

describe('living readings architecture claims', () => {
  it('keeps the current embedding model distinct from unverified future state', () => {
    expect(architecture).toContain('embedding model: `@cf/baai/bge-small-en-v1.5`')
    expect(architecture).toContain('A custom embedding model is not implemented')
    expect(architecture).toContain('A deployed continuous extraction → approval → write → retrieval loop was not')
  })

  it('keeps the 723 catalogue structurally read-only', () => {
    expect(catalogueScript).toContain("import { readdir, stat } from 'node:fs/promises'")
    expect(catalogueScript).not.toMatch(/\b(writeFile|appendFile|truncate|unlink|rename|rm|fetch)\s*\(/)
    expect(catalogueScript).toContain("process.stdout.write")
  })
})
