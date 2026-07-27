import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

const sources = {
  home: read('src/pages/HomePage.tsx'),
  node: read('src/pages/NodePage.tsx'),
  nodePresentation: read('src/lib/nodePresentation.ts'),
  engineStatus: read('src/components/panels/EngineStatusPanel.tsx'),
  topNav: read('src/components/chrome/TopNav.tsx'),
  pageTabs: read('src/components/chrome/PageTabs.tsx'),
  statFooter: read('src/components/chrome/StatFooter.tsx'),
  threshold: read('src/pages/ThresholdPage.tsx'),
  copy: read('src/content/uiCopy.ts'),
}
const runtime = Object.values(sources).join('\n')

test('home copy and direct reading doorway are wired to the grounded vocabulary', () => {
  assert.match(sources.home, /UI_COPY\.promise/)
  assert.match(sources.home, /UI_COPY\.beginReading/)
  assert.match(sources.home, /<BeginReadingDialog/)
  assert.match(
    sources.home,
    /wrapperClassName="fixed inset-x-0 bottom-\[8\.75rem\] top-44 sm:inset-0"/,
    'the narrow home lens must end above the 140px bottom chrome',
  )
  assert.match(sources.threshold, /UI_COPY\.thresholdGrounding/)
})

test('fictional telemetry and reference-only navigation language are absent', () => {
  assert.doesNotMatch(runtime, /1,337|12,851|\bFrequency\b|\bResonance\b|Live Paths/)
  assert.doesNotMatch(runtime, /\b(?:Explore|Connect|Understand|Ascend)\b/)
  assert.doesNotMatch(sources.home, /\bHOME_STATS\b/)
  assert.doesNotMatch(sources.topNav, /label:\s*['"](?:Archive|Library)['"]/)
  assert.doesNotMatch(sources.pageTabs, /\b(?:Nodes|Paths|Relations|Insights)\b/)
})

test('Folio is the only saved-reading navigation noun and both entries converge', () => {
  assert.doesNotMatch(sources.topNav, /\b(?:Archive|Library)\b/)
  assert.match(sources.topNav, /label:\s*['"]Folio['"][\s\S]*navigate\(['"]\/readings['"]\)/)
  assert.doesNotMatch(sources.node, /FolioPanel/)
  assert.match(sources.node, /navigate\(['"]\/readings['"]\)/)
})

test('node pages preserve equivalent graph, list, info, and run doorways', () => {
  assert.match(sources.node, /<ConstellationGraph/)
  assert.match(sources.node, /<InstrumentDialog/)
  assert.match(sources.node, /<ChatSheet/)
  assert.match(sources.nodePresentation, /buildGraphEntries/)
  assert.doesNotMatch(sources.node, /from ['"][^'"]*\/Modal['"]|<Modal(?:\s|>)/)
})

test('Engine Status is endpoint-backed operator evidence without email authority inference', () => {
  assert.match(sources.engineStatus, /<OperatorField/)
  assert.match(sources.engineStatus, /health\.version/)
  assert.match(sources.engineStatus, /latency_ms/)
  assert.doesNotMatch(`${sources.node}\n${sources.engineStatus}`, /me\.email|@.*admin/i)
})

test('runtime surfaces do not import generated image assets directly', () => {
  assert.doesNotMatch(
    runtime,
    /import\s+(?:[\s\S]*?\s+from\s+)?['"][^'"]+\.(?:gif|jpe?g|png|svg|webp)['"]/i,
  )
})
