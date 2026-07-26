import { SELEMENE_NODES } from '../data/selemeneNodes'
import { GraphOrbital } from '../types'
import { ConstellationGraph } from '../components/ConstellationGraph'
import { PageFrame } from '../components/layout/PageFrame'
import { StatFooter, Stat } from '../components/chrome/StatFooter'
import { BottomChrome } from '../components/chrome/BottomChrome'
import { CHROME } from '../components/chrome/insets'
import { navigate } from '../hooks/useHashRoute'

const overviewOrbitals: GraphOrbital[] = SELEMENE_NODES.map((node) => ({
  id: node.id,
  label: node.label,
  angle: node.angle,
  subCount: node.subNodes.length,
  color: node.color,
  glyph: node.glyph,
  epithet: node.epithet,
}))

const childCount = SELEMENE_NODES.reduce((n, node) => n + (node.children?.length ?? 0), 0)
const HOME_STATS: Stat[] = [
  { label: 'Nodes', value: '1,337' },
  { label: 'Connections', value: '12,851' },
  { label: 'Paths', value: `${SELEMENE_NODES.length * childCount}` },
  { label: 'Frequency', value: '∞' },
]

/** The four verbs from the moodboard's home header — the console's promise,
 *  set as a quiet right rail. Presentational; the graph is the interface. */
const VERBS = ['Explore', 'Connect', 'Understand', 'Ascend'] as const

/**
 * The galactic home view (`#/`): the NOESIS core ringed by the seven parent
 * nodes. Clicking a node enters its page. The graph is the interface.
 */
export function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-void">
      <ConstellationGraph
        variant="home"
        wrapperClassName="fixed inset-0"
        orbitals={overviewOrbitals}
        selectedId={null}
        onSelect={(id) => navigate(`/node/${id}`)}
        centerLabel="NOESIS"
        ariaLabel="Selemene stellar node overview"
        topInset={CHROME.nav}
        bottomInset={CHROME.footer}
      />
      <PageFrame />

      {/* Right rail — the moodboard's EXPLORE / CONNECT / UNDERSTAND / ASCEND,
          parked under the header where the reference home keeps it. */}
      <nav
        aria-hidden="true"
        className="pointer-events-none fixed right-10 top-24 z-10 hidden flex-col items-end gap-4 lg:flex"
      >
        {VERBS.map((v, i) => (
          <span key={v} className="flex items-center gap-3 font-display text-[10px] uppercase tracking-[0.34em] text-silver/45">
            <span className={i === 0 ? 'text-gold/80' : undefined}>{v}</span>
            <span className={`h-1 w-1 rotate-45 ${i === 0 ? 'bg-gold/80' : 'border border-silver/30'}`} />
          </span>
        ))}
      </nav>

      <BottomChrome>
        <StatFooter stats={HOME_STATS} />
      </BottomChrome>
    </div>
  )
}
