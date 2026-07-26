import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const read = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

const runtime = [
  read('src/pages/HomePage.tsx'),
  read('src/pages/NodePage.tsx'),
  read('src/components/chrome/PageTabs.tsx'),
  read('src/components/chrome/TopNav.tsx'),
].join('\n')

const knownViolations = [
  /1,337|12,851|Frequency/,
  /Resonance|Live Paths/,
  /label: 'Archive'|label: 'Library'/,
].map((pattern) => ({ pattern: String(pattern), observed: pattern.test(runtime) }))

assert.ok(
  knownViolations.every(({ observed }) => observed),
  'the characterization gate must begin with all documented violations present',
)

const assets = fileURLToPath(new URL('../../dist/assets/', import.meta.url))
const bundleBytes = readdirSync(assets)
  .filter((name) => /\.(js|css)$/.test(name))
  .reduce((sum, name) => sum + statSync(join(assets, name)).size, 0)

assert.ok(bundleBytes > 0, 'the production bundle must have a measurable size')

writeFileSync(
  new URL('../../docs/ui/realignment-baseline.json', import.meta.url),
  `${JSON.stringify({ bundleBytes, knownViolations }, null, 2)}\n`,
)

console.log(
  `UI baseline characterized: ${knownViolations.length} violation groups, ${bundleBytes} bundle bytes`,
)
