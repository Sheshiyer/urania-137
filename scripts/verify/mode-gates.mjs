/**
 * The assertion that actually catches a fake mode surface.
 *
 * "status 200"            → a typo'd mode passes.
 * "passes[0] !== default" → a whitelisted-but-unimplemented mode passes.
 * THIS: modes must differ FROM EACH OTHER. Identical output across distinct
 * modes means the surface is undifferentiated, whatever the pass is called.
 */
import { createHash } from 'node:crypto'
// Prod default is the Cloudflare Pages deployment (T-055 delink; goes live with T-058).
const BASE = (process.argv[2] || 'https://urania-137.pages.dev').replace(/\/+$/, '')
const A = { role:'primary', name:'witnessalchemist', birth_date:'1991-08-13', birth_time:'13:31', birth_time_confidence:'exact',
  birth_location_query:'Asia/Kolkata', normalized_location:{display_name:'Asia/Kolkata',latitude:12.97,longitude:77.59,timezone:'Asia/Kolkata',provider:'manual',confidence:'manual'} }
const B = { ...A, role:'partner', name:'harshita', birth_date:'1987-10-15', birth_time:'12:05' }

const MODES = ['integrated-reading','composite-dyad','integrated-kundali-l0',
  'birth-blueprint','partner-synastry','business-partners','family-penta',
  'married-partners','mother-son-lineage','unmarried-partners','integrated-reading-l4',
  'THIS-MODE-DOES-NOT-EXIST-xyz']

const go = async (mode) => {
  const r = await fetch(`${BASE}/api/selemene/api/v1/assets/generate`, { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ mode, report_level:'L0', language:'en', consciousness_level:2, subjects:[A,B], options:{output_format:'markdown'} }) })
  const t = await r.text(); let j=null; try{ j=JSON.parse(t) }catch{}
  if (r.status !== 200) return { mode, status:r.status, code:j?.error_code, hash:null, passes:null }
  const a = j?.assembled || ''
  return { mode, status:200, code:null, passes:(j.passes||[]).map(p=>p.id).join(','), hash:createHash('sha1').update(a).digest('hex').slice(0,10) }
}

const rows = []
for (const m of MODES) rows.push(await go(m))
for (const r of rows) console.log(`  ${String(r.status).padEnd(4)} ${r.mode.padEnd(30)} ${r.code||''} ${r.passes ?? ''} ${r.hash?'#'+r.hash:''}`)

// gate 1: unknown mode must be rejected
const bogus = rows.find(r=>r.mode.startsWith('THIS-MODE'))
const g1 = bogus.status === 400 && bogus.code === 'UNKNOWN_MODE'
// gate 2: accepted modes must have DISTINCT pass plans.
// Compare pass structure, not assembled text: the text embeds time-varying
// seeds (biorhythm), so identical modes can hash differently by the second —
// a false PASS. The pass plan is what actually makes a mode a mode.
// ALIASES are legitimately identical and declared here.
const ALIASES = [['integrated-reading','composite-dyad'], ['integrated-kundali-l0','kundali','kundali-l0']]
const aliasOf = (m) => (ALIASES.find(g=>g.includes(m))||[m])[0]
const ok = rows.filter(r=>r.status===200 && r.passes!=null)
const byPlan = new Map()
for (const r of ok) byPlan.set(r.passes, [...(byPlan.get(r.passes)||[]), r.mode])
const dupes = [...byPlan.values()]
  .map(g => [...new Set(g.map(aliasOf))])   // collapse declared aliases
  .filter(v=>v.length>1)
console.log(`\n  gate 1 — unknown mode rejected 400/UNKNOWN_MODE : ${g1?'PASS':'FAIL (got '+bogus.status+')'}`)
console.log(`  gate 2 — accepted modes have distinct pass plans : ${dupes.length===0?'PASS':'FAIL'}`)
for (const d of dupes) console.log(`      share one pass plan: ${d.join(' == ')}`)
process.exit(g1 && !dupes.length ? 0 : 1)
