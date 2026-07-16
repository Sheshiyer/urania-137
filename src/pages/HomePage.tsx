import { SELEMENE_NODES } from '../data/selemeneNodes'
import { GraphOrbital } from '../types'
import { ConstellationGraph } from '../components/ConstellationGraph'
import { PageFrame } from '../components/layout/PageFrame'
import { StatFooter, Stat } from '../components/chrome/StatFooter'
import { navigate } from '../hooks/useHashRoute'

const overviewOrbitals: GraphOrbital[] = SELEMENE_NODES.map((node) => ({
  id: node.id,
  label: node.label,
  angle: node.angle,
  subCount: node.subNodes.length,
  color: node.color,
  glyph: node.glyph,
}))

const childCount = SELEMENE_NODES.reduce((n, node) => n + (node.children?.length ?? 0), 0)
const HOME_STATS: Stat[] = [
  { label: 'Nodes', value: '1,337' },
  { label: 'Connections', value: '12,851' },
  { label: 'Paths', value: `${SELEMENE_NODES.length * childCount}` },
  { label: 'Frequency', value: '∞' },
]

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
      />
      <PageFrame />
      <StatFooter stats={HOME_STATS} />
    </div>
  )
}
