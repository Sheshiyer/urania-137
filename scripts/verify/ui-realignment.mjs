import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:8788'
const evidenceRoot = join(root, 'docs/ui/evidence/realignment')

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  })
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(' ')} exited ${result.status ?? 'without a status'}`,
  )
}

function bundleBytes() {
  const assets = join(root, 'dist/assets')
  return readdirSync(assets)
    .filter((name) => /\.(?:css|js)$/.test(name))
    .reduce((total, name) => total + statSync(join(assets, name)).size, 0)
}

run('npm', ['run', 'verify:ui-contracts'])
run('npx', [
  'vitest',
  'run',
  'src/styles/semanticTokens.test.ts',
  'src/components/ui/AsyncBoundary.test.ts',
  'src/components/ui/InstrumentDialog.test.ts',
  'src/components/graph/graphEntries.test.ts',
  'src/components/readings/ReadingCanvas.test.ts',
  'src/components/readings/ReadingContrastContract.test.ts',
  'src/components/threshold/sceneKit.test.ts',
  'src/hooks/useHashRoute.test.ts',
  'src/components/readings/BeginReadingDialog.test.ts',
  'src/components/chat/ReadingTransition.test.ts',
  'src/hooks/useThreadScroll.test.ts',
  'src/lib/readings/folioLayout.test.ts',
  'src/lib/readings/folioView.test.ts',
  'src/lib/readings/engineVisualRegistry.test.ts',
  'src/components/readings/artifacts/EngineArtifacts.test.ts',
  'src/lib/nodePresentation.test.ts',
  'src/components/settings/ConsentConstellation.test.ts',
  'src/components/readings/CompareField.test.ts',
  'src/pages/RelationshipReadingPage.test.ts',
  'src/lib/readings/relationshipReadings.test.ts',
])
run('node', ['--test', 'scripts/readings/engine-output-atlas.test.mjs'])
run('npm', ['test'])
run('npm', ['run', 'typecheck:functions'])
run('npm', ['run', 'build'])

const baseline = JSON.parse(
  readFileSync(join(root, 'docs/ui/realignment-baseline.json'), 'utf8'),
)
const currentBundleBytes = bundleBytes()
const maximumBundleBytes = Math.floor(baseline.bundleBytes * 1.1)
assert.ok(
  currentBundleBytes <= maximumBundleBytes,
  `production JS+CSS is ${currentBundleBytes} bytes; the unexplained 10% ceiling is ${maximumBundleBytes}`,
)

run('npm', ['run', 'verify:ui-visual', '--', baseUrl])
assert.ok(
  existsSync(join(evidenceRoot, 'manifest.json')),
  'the visual matrix must emit docs/ui/evidence/realignment/manifest.json',
)
assert.ok(
  existsSync(join(evidenceRoot, 'allowlist.txt')),
  'the visual matrix must emit its exact evidence allowlist',
)
run('npm', ['run', 'verify:ui-evidence'])
run('git', ['diff', '--check'])

console.log(
  `UI realignment verified at ${baseUrl}; bundle ${currentBundleBytes}/${maximumBundleBytes} bytes`,
)
