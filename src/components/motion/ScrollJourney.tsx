import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { Sparkles } from 'lucide-react'
import { SELEMENE_NODES } from '../../data/selemeneNodes'
import {
  GraphOrbital,
  SelemeneChild,
  StellarNode as StellarNodeType,
  Surface,
  ReportGenerationRequest,
  DeterministicRequest,
} from '../../types'
import { useReportGenerator } from '../../hooks/useReportGenerator'
import { StellarNodeGraph } from '../StellarNodeGraph'
import { ConstellationGraph } from '../ConstellationGraph'
import { Modal } from '../Modal'
import { ReportForm } from '../ReportForm'
import { PageHeader } from '../layout/PageHeader'
import { PageFrame } from '../layout/PageFrame'
import { registerGsap, prefersReducedMotion, gsap, ScrollTrigger } from '../../lib/motion'

const N = SELEMENE_NODES.length
/** Scroll length (vh) allotted to each cluster's dive-and-resurface. */
const SEG_VH = 110
/** Peak camera zoom at the bottom of a dive. */
const ZOOM = 1.9

type ModalView = 'report' | 'info' | 'result' | null

const overviewOrbitals: GraphOrbital[] = SELEMENE_NODES.map((node) => ({
  id: node.id,
  label: node.label,
  angle: node.angle,
  subCount: node.subNodes.length,
  color: node.color,
}))

function childOrbitals(node: StellarNodeType): GraphOrbital[] {
  const kids = node.children ?? []
  return kids.map((c, i) => ({
    id: c.id,
    label: c.label,
    angle: (i / Math.max(kids.length, 1)) * 360,
    subCount: 0,
    color: node.color,
  }))
}

function initialActive(): number {
  const m = typeof window !== 'undefined' && window.location.hash.match(/^#\/node\/([^/?#]+)/)
  if (m) {
    const i = SELEMENE_NODES.findIndex((n) => n.id === decodeURIComponent(m[1]))
    if (i >= 0) return i
  }
  return 0
}

/**
 * The scroll-driven camera journey. Landing shows the galactic overview; each
 * scroll dives into the next cluster (that parent re-centers and its sub-nodes
 * appear), then resurfaces before diving into the next. Clicking a node jumps
 * the journey to its beat and the URL syncs to `#/node/:id`. See the motion spec.
 */
export function ScrollJourney() {
  const reduced = prefersReducedMotion()
  const scrollRef = useRef<HTMLDivElement>(null)
  const overviewRef = useRef<HTMLDivElement>(null)
  const clusterRef = useRef<HTMLDivElement>(null)
  const overviewOverlayRef = useRef<HTMLDivElement>(null)
  const clusterOverlayRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(initialActive())
  const lastHashRef = useRef<string>('')

  const [active, setActive] = useState<number>(initialActive)
  // Reduced-motion only: whether the static cluster view is showing.
  const [reducedInCluster, setReducedInCluster] = useState<boolean>(() => reduced && initialActive() >= 0 && !!window.location.hash.match(/^#\/node\//))
  const [selectedChild, setSelectedChild] = useState<SelemeneChild | null>(null)
  const [modalView, setModalView] = useState<ModalView>(null)
  const { generateReport, activeReport } = useReportGenerator()

  const node = SELEMENE_NODES[active]

  const jumpTo = (id: string) => {
    const k = SELEMENE_NODES.findIndex((n) => n.id === id)
    if (k < 0) return
    if (reduced) {
      setActive(k)
      activeRef.current = k
      setReducedInCluster(true)
      history.replaceState(null, '', `#/node/${id}`)
      return
    }
    const scroller = scrollRef.current
    if (!scroller) return
    const total = scroller.scrollHeight - window.innerHeight
    window.scrollTo({ top: ((k + 0.5) / N) * total, behavior: 'smooth' })
  }

  const goOverview = () => {
    if (reduced) {
      setReducedInCluster(false)
      history.replaceState(null, '', '#/')
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openChild = (childId: string) => {
    const child = node.children?.find((c) => c.id === childId)
    if (!child) return
    setSelectedChild(child)
    setModalView(child.info || node.modes.length === 0 ? 'info' : 'report')
  }
  const closeModal = () => {
    setModalView(null)
    setSelectedChild(null)
  }
  const handleSubmit = (payload: {
    surface: Surface
    modeId: string
    request: ReportGenerationRequest | DeterministicRequest
  }) => {
    if (payload.surface === 'witness') generateReport(node, 'witness', payload.request)
    else generateReport(node, 'deterministic', { workflowId: payload.modeId, payload: payload.request })
    setModalView('result')
  }
  const initialModeKey = selectedChild?.report ? `${selectedChild.report.surface}:${selectedChild.report.modeId}` : undefined

  useGSAP(
    () => {
      if (reduced || !scrollRef.current) return
      registerGsap()
      gsap.set(clusterRef.current, { autoAlpha: 0 })
      gsap.set(clusterOverlayRef.current, { autoAlpha: 0 })

      const st = ScrollTrigger.create({
        trigger: scrollRef.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          const p = self.progress
          const segF = Math.min(p * N, N - 1e-6)
          const segIndex = Math.min(Math.floor(segF), N - 1)
          const segT = segF - segIndex
          const d = Math.sin(segT * Math.PI) // 0 → 1 → 0 across the segment

          const w = window.innerWidth
          const h = window.innerHeight
          const cx = w / 2
          const cy = h / 2
          const R = Math.min(w, h) * 0.32
          const nd = SELEMENE_NODES[segIndex]
          const a = ((nd.angle - 90) * Math.PI) / 180
          const px = cx + R * Math.cos(a)
          const py = cy + R * Math.sin(a)
          const tX = cx - px * (1 + ZOOM)
          const tY = cy - py * (1 + ZOOM)

          gsap.set(overviewRef.current, { transformOrigin: '0px 0px', scale: 1 + d * ZOOM, x: d * tX, y: d * tY, autoAlpha: 1 - d * 0.92 })
          gsap.set(clusterRef.current, { transformOrigin: '50% 50%', scale: 0.5 + d * 0.5, autoAlpha: d })
          gsap.set(overviewOverlayRef.current, { autoAlpha: 1 - d })
          gsap.set(clusterOverlayRef.current, { autoAlpha: d })

          if (segIndex !== activeRef.current) {
            activeRef.current = segIndex
            setActive(segIndex)
          }
          const desired = d > 0.5 ? `#/node/${SELEMENE_NODES[segIndex].id}` : '#/'
          if (desired !== lastHashRef.current) {
            lastHashRef.current = desired
            history.replaceState(null, '', desired)
          }
        },
      })

      // Deep-link: land at the requested cluster's beat.
      const m = window.location.hash.match(/^#\/node\/([^/?#]+)/)
      if (m && scrollRef.current) {
        const k = SELEMENE_NODES.findIndex((n) => n.id === decodeURIComponent(m[1]))
        if (k >= 0) {
          const total = scrollRef.current.scrollHeight - window.innerHeight
          window.scrollTo(0, ((k + 0.5) / N) * total)
          ScrollTrigger.update()
        }
      }

      return () => st.kill()
    },
    { scope: scrollRef, dependencies: [reduced] }
  )

  const brandMark = (
    <div className="fixed top-6 left-6 flex items-center gap-3">
      <div className="rounded-lg bg-gold/10 p-2">
        <Sparkles className="h-5 w-5 text-gold" />
      </div>
      <div>
        <h1 className="font-display text-sm font-semibold tracking-widest text-parchment">URANIA 137</h1>
        <p className="font-display text-[10px] uppercase tracking-widest text-silver">Selemene Report Console</p>
      </div>
    </div>
  )

  const modals = (
    <>
      <Modal isOpen={modalView === 'report'} title={selectedChild?.label ?? node.label} onClose={closeModal}>
        {modalView === 'report' && (
          <ReportForm node={node} onSubmit={handleSubmit} initialModeKey={initialModeKey} initialLevel={selectedChild?.report?.level} />
        )}
      </Modal>
      <Modal isOpen={modalView === 'info'} title={selectedChild?.label ?? node.label} onClose={closeModal}>
        <div className="space-y-4">
          <p className="leading-relaxed text-silver">{node.description}</p>
          <div className="rounded-lg border border-gold/10 bg-void/60 px-4 py-3 text-sm text-parchment">
            <span className="font-display uppercase tracking-widest text-gold">{selectedChild?.label}</span>
            <p className="mt-2 text-silver">This surface is informational — it reflects live Selemene engine state rather than generating a report.</p>
          </div>
        </div>
      </Modal>
      <Modal isOpen={modalView === 'result'} title={activeReport?.title ?? 'Report'} onClose={closeModal}>
        <div className="space-y-4">
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              activeReport?.status === 'error' ? 'border-terracotta/20 bg-terracotta/10 text-terracotta' : 'border-emerald/20 bg-emerald/10 text-emerald'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${activeReport?.status === 'generating' ? 'animate-pulse bg-emerald' : activeReport?.status === 'error' ? 'bg-terracotta' : 'bg-emerald'}`} />
            {activeReport?.status ?? 'generating'}
          </div>
          <pre className="max-h-[320px] overflow-auto rounded-lg border border-gold/10 bg-void/60 p-4 font-mono text-xs text-parchment/90">
            {activeReport?.content || 'Contacting the Selemene engines…'}
          </pre>
        </div>
      </Modal>
    </>
  )

  const clusterFrame = <PageFrame />

  // --- Reduced-motion: static overview <-> cluster toggle, no journey --------
  if (reduced) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-void">
        {reducedInCluster ? (
          <>
            <ConstellationGraph
              wrapperClassName="fixed inset-0"
              orbitals={childOrbitals(node)}
              selectedId={selectedChild?.id ?? null}
              onSelect={openChild}
              centerLabel={node.label}
              onHomeRequest={goOverview}
              centerYOffset={0.06}
            />
            <div className="pointer-events-auto">
              <PageHeader title={node.label} subtitle={node.description} onBack={goOverview} />
            </div>
            {clusterFrame}
          </>
        ) : (
          <>
            <StellarNodeGraph wrapperClassName="fixed inset-0" orbitals={overviewOrbitals} selectedId={null} onSelect={jumpTo} centerLabel="NOESIS" />
            {brandMark}
            <div className="fixed bottom-6 left-6 z-10 max-w-xs text-xs text-silver/70">Click any stellar node to enter its constellation. The graph is the interface.</div>
          </>
        )}
        {modals}
      </div>
    )
  }

  // --- Full scroll journey ---------------------------------------------------
  return (
    <div ref={scrollRef} className="relative bg-void">
      <div className="fixed inset-0 overflow-hidden">
        <div ref={overviewRef} className="absolute inset-0 will-change-transform">
          <StellarNodeGraph wrapperClassName="absolute inset-0" orbitals={overviewOrbitals} selectedId={null} onSelect={jumpTo} centerLabel="NOESIS" />
        </div>
        <div ref={clusterRef} className="absolute inset-0 will-change-transform">
          <ConstellationGraph
            wrapperClassName="absolute inset-0"
            orbitals={childOrbitals(node)}
            selectedId={selectedChild?.id ?? null}
            onSelect={openChild}
            centerLabel={node.label}
            onHomeRequest={goOverview}
            ariaLabel={`${node.label} sub-node constellation`}
            centerYOffset={0.06}
          />
        </div>
      </div>

      {/* Overview overlay */}
      <div ref={overviewOverlayRef} className="fixed inset-0 z-10">
        {brandMark}
        <div className="fixed bottom-6 left-6 max-w-xs text-xs text-silver/70">
          Scroll to journey through the constellation — each turn dives into the next node. Or click a node to dive straight in.
        </div>
      </div>

      {/* Cluster overlay (title + frame) */}
      <div ref={clusterOverlayRef} className="fixed inset-0 z-10">
        <PageHeader title={node.label} subtitle={node.description} onBack={goOverview} />
        {clusterFrame}
      </div>

      {/* Scroll length */}
      <div style={{ height: `${N * SEG_VH}vh` }} aria-hidden />

      {modals}
    </div>
  )
}
