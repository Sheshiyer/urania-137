import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const page = read('src/pages/ReadingLibraryPage.tsx')
const map = read('src/components/readings/ReadingLibraryMap.tsx')
const trust = read('src/components/readings/ReadingTrustPanel.tsx')
const folio = read('src/components/readings/ReadingFolio.tsx')
const source = read('src/components/readings/elements/ReadingSourcePayload.tsx')
const copy = read('src/content/uiCopy.ts')

test('Folio remains the one reader-facing product noun', () => {
  for (const [name, body] of Object.entries({ page, map, trust, copy })) {
    assert.doesNotMatch(body, /(['"`])[^'"`\n]*\b(?:Archive|Library)\b[^'"`\n]*\1/i, name)
  }
  assert.match(page, />\s*Browse Folio\s*</)
  assert.match(map, />\s*Folio map\s*</)
  assert.match(page, />\s*Reading\s*</)
})

test('the page derives one async state and delegates it to AsyncBoundary', () => {
  assert.match(page, /deriveFolioView/)
  assert.match(page, /folioAccessFromStatus\(httpStatus\)/)
  assert.match(page, /<AsyncBoundary\s+state=/)
  assert.match(page, /aria-label="Search canonical readings"/)
  assert.doesNotMatch(page, /\{error\s*&&/)
  assert.doesNotMatch(page, /status\s*===\s*['"]loading['"]/)
})

test('the map uses canonical layout with a complete list-first reflow lens', () => {
  assert.match(map, /deriveFolioLayout/)
  assert.match(map, /data-folio-map-encoding=/)
  assert.match(map, /node family[^<]*angular sector/i)
  assert.match(map, /creation time[^<]*radial distance/i)
  assert.match(map, /data-folio-list-lens/)
  assert.match(map, /order-1/)
  assert.match(map, /hidden\s+md:block/)
  assert.doesNotMatch(map, /readings\.slice\(0,\s*10\)/)
  assert.doesNotMatch(map, /index\s*\*\s*Math\.PI/)
})

test('selection uses interaction semantics, never evidence colors', () => {
  assert.match(map, /border-interaction-selected/)
  assert.doesNotMatch(map, /selected[\s\S]{0,180}(?:emerald|violet)/i)
})

test('canonical detail carries trust context while Source stays collapsed', () => {
  assert.match(page, /evidenceContext=/)
  for (const label of ['Owner', 'Subject', 'Source', 'Producer', 'Why you can see this', 'Checksum']) {
    assert.match(trust, new RegExp(`['"]${label}['"]`))
  }
  assert.match(folio, /data-reading-layer="reading"/)
  assert.match(folio, /data-reading-layer="evidence"/)
  assert.match(folio, /data-reading-layer="source"/)
  assert.match(source, /<details/)
  assert.doesNotMatch(source, /<details[^>]*\sopen(?:=|\s|>)/)
})

test('Folio begins and continues through the stable conversation route', () => {
  assert.match(page, /buildConversationPath\(\{\s*returnTo:\s*['"]\/readings['"]\s*\}\)/)
  assert.match(page, /data-reading-relation="continue-in-conversation"/)
  assert.match(page, /readingId:\s*selected\.id/)
  assert.match(page, /returnTo:\s*`\/readings\/\$\{encodeURIComponent\(selected\.id\)\}`/)
  assert.doesNotMatch(page, /href="#\/node\/witness"/)
})

test('production Folio contains no generated-board fixture contract', () => {
  const body = [page, map, trust, copy].join('\n')
  assert.doesNotMatch(body, /generated[-_ ]board/i)
  assert.doesNotMatch(body, /\bfixture[-_ ](?:id|count|reading)/i)
})
