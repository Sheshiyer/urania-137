import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs'
import {
  extname,
  join,
  relative,
} from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('../../', import.meta.url))
const sourceRoot = join(root, 'src')
const read = (path) => readFileSync(join(root, path), 'utf8')

function filesUnder(directory, extensions = new Set(['.ts', '.tsx'])) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return filesUnder(path, extensions)
    return entry.isFile() && extensions.has(extname(entry.name)) ? [path] : []
  })
}

const runtimeFiles = filesUnder(sourceRoot)
  .filter((path) => !/\.test\.[cm]?[jt]sx?$/.test(path))
const runtimeSources = new Map(
  runtimeFiles.map((path) => [relative(root, path), readFileSync(path, 'utf8')]),
)
const runtime = [...runtimeSources.values()].join('\n')

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
  })
  assert.equal(
    result.status,
    0,
    [
      `${command} ${args.join(' ')} exited ${result.status}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'),
  )
}

function registryKeys(source, declaration, terminator) {
  const body = source.match(
    new RegExp(
      `export const ${declaration}:[^=]+ = \\{([\\s\\S]*?)\\n\\}${terminator}`,
    ),
  )?.[1]
  assert.ok(body, `${declaration} declaration is missing`)
  return [...body.matchAll(/^\s*(?:'([^']+)'|([a-z][a-z0-9-]*)):\s*(?:engine|workflow)\(/gm)]
    .map((match) => match[1] ?? match[2])
    .sort()
}

test('existing home, Folio, asset, graph, engine, privacy, and Source gates stay green', () => {
  run(process.execPath, [
    '--test',
    'scripts/verify/ui-home-contracts.test.mjs',
    'scripts/verify/ui-folio-contracts.test.mjs',
    'scripts/verify/ui-asset-boundaries.test.mjs',
  ])
  run(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
    'vitest',
    'run',
    'src/styles/semanticTokens.test.ts',
    'src/components/graph/graphEntries.test.ts',
    'src/lib/readings/engineVisualRegistry.test.ts',
    'src/components/readings/elements/ReadingSourcePayload.test.ts',
  ])
})

test('generated boards and fixture contracts never enter runtime imports or source', () => {
  const forbidden = [
    /\.assets\/(?:generated|page-references)\//i,
    /(?:component-atlas|reading-folio|engine-component-families|engine-reading-surfaces(?:-corrected|-final)?)\.(?:gif|jpe?g|png|svg|webp)/i,
    /generated[-_ ]board/i,
    /\bfixture[-_ ](?:id|count|label|reading|subject)\b/i,
  ]
  const imageImport = /\b(?:import|export)\b[^\n;]*?(?:from\s*)?['"][^'"]+\.(?:gif|jpe?g|png|svg|webp)(?:\?[^'"]*)?['"]/i
  const violations = [...runtimeSources].flatMap(([path, source]) => (
    imageImport.test(source) || forbidden.some((pattern) => pattern.test(source))
      ? [path]
      : []
  ))

  assert.deepEqual(
    violations,
    [],
    `generated-reference boundary crossed by: ${violations.join(', ')}`,
  )
})

test('deprecated interaction aliases have no runtime consumers', () => {
  const violations = [...runtimeSources].flatMap(([path, source]) => (
    path === 'src/styles/tokens.ts'
      ? []
      : /\bSTATE\.(?:active|selected|focus)\b/.test(source)
        ? [path]
        : []
  ))

  assert.deepEqual(
    violations,
    [],
    `deprecated STATE interaction aliases remain in: ${violations.join(', ')}`,
  )
  assert.match(read('src/styles/tokens.ts'), /export const INTERACTION\s*=/)
})

test('retired FolioPanel and SettingsPanel cannot return as duplicate surfaces', () => {
  const forbiddenFiles = [
    'src/components/panels/FolioPanel.tsx',
    'src/components/chrome/SettingsPanel.tsx',
  ]
  assert.deepEqual(
    forbiddenFiles.filter((path) => existsSync(join(root, path))),
    [],
    'retired duplicate surface file was restored',
  )

  const violations = [...runtimeSources].flatMap(([path, source]) => (
    /\b(?:FolioPanel|SettingsPanel)\b/.test(source) ? [path] : []
  ))
  assert.deepEqual(
    violations,
    [],
    `retired duplicate surface is referenced by: ${violations.join(', ')}`,
  )
})

test('technical JSON remains privacy-filtered and collapsed by default', () => {
  const sourcePayload = read('src/components/readings/elements/ReadingSourcePayload.tsx')
  const rawElement = read('src/components/readings/elements/ReadingRaw.tsx')
  const folio = read('src/components/readings/ReadingFolio.tsx')

  for (const [name, source] of Object.entries({ sourcePayload, rawElement })) {
    assert.match(source, /<details\b/, `${name} must use a disclosure`)
    assert.doesNotMatch(source, /<details\b[^>]*\bopen(?:=|\s|>)/, `${name} defaults open`)
    assert.doesNotMatch(source, /\bdefaultOpen\b/, `${name} defaults open`)
    assert.match(source, /privacySafeSourceJson/, `${name} bypasses source redaction`)
  }
  assert.match(sourcePayload, /data-reading-source="privacy-filtered"/)
  assert.match(sourcePayload, /REDACTED/)
  assert.match(folio, /data-reading-layer="reading"/)
  assert.match(folio, /data-reading-layer="evidence"/)
  assert.match(folio, /data-reading-layer="source"/)
  assert.doesNotMatch(runtime, /<details\b[^>]*\bopen(?:=|\s|>)[\s\S]{0,800}<(?:pre|code)\b/i)
})

test('graph surfaces retain an ordered semantic equivalent and inert decoration', () => {
  const lens = read('src/components/graph/GraphLens.tsx')
  const graph = read('src/components/ConstellationGraph.tsx')
  const list = read('src/components/graph/RelationList.tsx')

  assert.match(lens, /<RelationList/)
  assert.match(graph, /<GraphLens/)
  assert.match(graph, /\bgraph=\{\(/)
  assert.match(list, /<ol\b/)
  assert.match(list, /aria-pressed=/)
  assert.match(graph, /pointerEvents="none"/)
  assert.doesNotMatch(graph, /role="img"/)
})

test('runtime registry completely reconciles all eighteen engines and six workflows', () => {
  const atlas = JSON.parse(read('docs/engine-output-atlas.json'))
  const registry = read('src/lib/readings/engineVisualRegistry.ts')
  const engineIds = registryKeys(registry, 'ENGINE_VISUAL_REGISTRY', '\\s+function workflow')
  const workflowIds = registryKeys(registry, 'WORKFLOW_VISUAL_REGISTRY', '\\s*$')
  const atlasEngineIds = atlas.engines.map(({ id }) => id).sort()
  const atlasWorkflowIds = atlas.workflows.map(({ id }) => id).sort()

  assert.equal(engineIds.length, 18)
  assert.equal(new Set(engineIds).size, 18)
  assert.deepEqual(engineIds, atlasEngineIds)
  assert.equal(workflowIds.length, 6)
  assert.equal(new Set(workflowIds).size, 6)
  assert.deepEqual(workflowIds, atlasWorkflowIds)
  assert.match(read('src/components/readings/EngineReading.tsx'), /ENGINE_VISUAL_REGISTRY/)
  assert.match(read('src/components/readings/WorkflowReading.tsx'), /WORKFLOW_VISUAL_REGISTRY/)
})
