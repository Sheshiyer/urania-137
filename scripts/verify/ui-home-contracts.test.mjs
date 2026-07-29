import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

const sources = {
  home: read('src/pages/HomePage.tsx'),
  node: read('src/pages/NodePage.tsx'),
  app: read('src/App.tsx'),
  nodePresentation: read('src/lib/nodePresentation.ts'),
  engineStatus: read('src/components/panels/EngineStatusPanel.tsx'),
  topNav: read('src/components/chrome/TopNav.tsx'),
  pageHeader: read('src/components/layout/PageHeader.tsx'),
  bottomChrome: read('src/components/chrome/BottomChrome.tsx'),
  graph: read('src/components/ConstellationGraph.tsx'),
  pageTabs: read('src/components/chrome/PageTabs.tsx'),
  statFooter: read('src/components/chrome/StatFooter.tsx'),
  threshold: read('src/pages/ThresholdPage.tsx'),
  copy: read('src/content/uiCopy.ts'),
}
const runtime = Object.values(sources).join('\n')

test('home copy and direct reading doorway are wired to the grounded vocabulary', () => {
  assert.match(sources.home, /UI_COPY\.promise/)
  assert.match(sources.home, /UI_COPY\.beginReading/)
  assert.match(sources.home, /navigate\(['"]\/chat['"]\)/)
  assert.match(sources.app, /<ConversationPage/)
  assert.match(
    sources.home,
    /wrapperClassName="absolute inset-0"/,
    'the graph must occupy its measured route field instead of the viewport',
  )
  assert.match(sources.threshold, /UI_COPY\.thresholdGrounding/)
})

test('global Begin opens conversation without replacing graph-first node navigation', () => {
  assert.match(sources.topNav, /label:\s*['"]Begin['"][\s\S]*navigate\(['"]\/chat['"]\)/)
  assert.match(sources.node, /navigate\(`\/node\/\$\{node\.id\}`\)/)
  assert.match(sources.app, /route\.view === ['"]chat['"]/)
})

test('interactive chrome owns flow space while decorative framing may remain fixed', () => {
  assert.doesNotMatch(sources.topNav, /className="[^"]*\bfixed\b/)
  assert.doesNotMatch(sources.pageHeader, /className="[^"]*\bfixed\b/)
  assert.doesNotMatch(sources.bottomChrome, /className="[^"]*\bfixed\b/)
  assert.doesNotMatch(sources.graph, /wrapperClassName = ['"]fixed inset-0['"]/)
  assert.doesNotMatch(sources.home, /className="[^"]*\bfixed\b/)
  assert.doesNotMatch(sources.node, /wrapperClassName="fixed inset-0"/)
  assert.match(sources.app, /data-app-shell/)
  assert.match(
    read('src/components/layout/AppShell.tsx'),
    /h-dvh[\s\S]*overflow-y-auto/,
    'the route field must own the remaining dynamic viewport and its scroll',
  )
})

test('mobile navigation begins with one disclosure instead of four competing labels', () => {
  assert.match(sources.topNav, /aria-label="Open navigation menu"/)
  assert.doesNotMatch(
    sources.topNav,
    /md:hidden[\s\S]{0,1000}items\.map/,
    'the compact header must not paint every product route at once',
  )
})

test('experience and operator presentation stay orthogonal to authorization', () => {
  assert.match(sources.app, /experience/)
  assert.match(sources.app, /data-experience-gate/)
  assert.match(
    sources.app,
    /meLoading[\s\S]*subjectLifecycle\.status === 'loading'[\s\S]*experience\.lifecycle === 'new'/,
  )
  assert.match(sources.topNav, /operator/)
  assert.doesNotMatch(`${sources.app}\n${sources.topNav}`, /sheshnarayan\.iyer@gmail\.com/i)
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
