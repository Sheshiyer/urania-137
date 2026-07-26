import { useEffect, useState } from 'react'
import { SELEMENE_NODES } from '../data/selemeneNodes'
import { GraphOrbital } from '../types'
import { ConstellationGraph } from '../components/ConstellationGraph'
import { PageFrame } from '../components/layout/PageFrame'
import { StatFooter, Stat } from '../components/chrome/StatFooter'
import { BottomChrome } from '../components/chrome/BottomChrome'
import { CHROME } from '../components/chrome/insets'
import { navigate } from '../hooks/useHashRoute'
import { UI_COPY } from '../content/uiCopy'
import { BeginReadingDialog } from '../components/readings/BeginReadingDialog'

export const BEGIN_READING_EVENT = 'urania:begin-reading'

const overviewOrbitals: GraphOrbital[] = SELEMENE_NODES.map((node) => ({
  id: node.id,
  label: node.label,
  angle: node.angle,
  subCount: node.subNodes.length,
  color: node.color,
  glyph: node.glyph,
  epithet: node.epithet,
  description: node.description,
}))

const runnableCount = SELEMENE_NODES.reduce(
  (count, node) => count + (node.children ?? []).filter((child) => child.run).length,
  0,
)
const HOME_TAXONOMY: Stat[] = [
  { label: 'Parent lenses', value: String(SELEMENE_NODES.length) },
  { label: 'Runnable doorways', value: String(runnableCount) },
]

/**
 * The galactic home view (`#/`): the NOESIS core ringed by the seven parent
 * nodes. Clicking a node enters its page. The graph is the interface.
 */
export function HomePage() {
  const [beginOpen, setBeginOpen] = useState(false)

  useEffect(() => {
    const open = () => setBeginOpen(true)
    window.addEventListener(BEGIN_READING_EVENT, open)
    return () => window.removeEventListener(BEGIN_READING_EVENT, open)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-void">
      <ConstellationGraph
        variant="home"
        wrapperClassName="fixed inset-x-0 bottom-0 top-44 sm:inset-0"
        orbitals={overviewOrbitals}
        selectedId={null}
        onSelect={(id) => navigate(`/node/${id}`)}
        centerLabel="NOESIS"
        ariaLabel="Selemene stellar node overview"
        topInset={CHROME.nav}
        bottomInset={CHROME.footer}
      />
      <PageFrame />

      <section className="pointer-events-none fixed inset-x-4 top-[6.8rem] z-10 flex flex-col items-center text-center sm:inset-x-auto sm:left-10 sm:top-28 sm:max-w-[21rem] sm:items-start sm:text-left">
        <p className="max-w-[32rem] font-serif text-[clamp(15px,1.7vw,21px)] leading-relaxed text-parchment [text-shadow:0_2px_16px_rgba(7,11,29,0.95)]">
          {UI_COPY.promise}
        </p>
        <button
          type="button"
          onClick={() => setBeginOpen(true)}
          className="pointer-events-auto mt-4 min-h-11 border border-gold/55 bg-void/80 px-5 py-3 font-display text-[10px] uppercase tracking-[0.23em] text-gold backdrop-blur-md transition-colors hover:bg-gold hover:text-void focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {UI_COPY.beginReading}
        </button>
      </section>

      <BottomChrome>
        <StatFooter stats={HOME_TAXONOMY} />
      </BottomChrome>

      <BeginReadingDialog open={beginOpen} onClose={() => setBeginOpen(false)} />
    </div>
  )
}
