import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const read = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

const runtime = [
  read('src/pages/HomePage.tsx'),
  read('src/pages/NodePage.tsx'),
  read('src/components/chrome/TopNav.tsx'),
].join('\n')

const resolvedViolations = [
  /1,337|12,851|Frequency/,
  /Resonance|Live Paths/,
  /label: 'Archive'|label: 'Library'/,
].map((pattern) => ({ pattern: String(pattern), resolved: !pattern.test(runtime) }))

assert.ok(
  resolvedViolations.every(({ resolved }) => resolved),
  'all previously documented vocabulary violations must be resolved after the instrument-shell redesign',
)

const assets = fileURLToPath(new URL('../../dist/app/assets/', import.meta.url))
const bundleBytes = readdirSync(assets)
  .filter((name) => /\.(js|css)$/.test(name))
  .reduce((sum, name) => sum + statSync(join(assets, name)).size, 0)

assert.ok(bundleBytes > 0, 'the production bundle must have a measurable size')

writeFileSync(
  new URL('../../docs/ui/realignment-baseline.json', import.meta.url),
  `${JSON.stringify({ bundleBytes, resolvedViolations }, null, 2)}\n`,
)

console.log(
  `UI baseline characterized: ${resolvedViolations.length} resolved violation groups, ${bundleBytes} bundle bytes`,
)
