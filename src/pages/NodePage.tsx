import { useState } from 'react'
import { getNodeById } from '../data/selemeneNodes'
import { GraphOrbital, SelemeneChild, AssetGenerateRequest } from '../types'
import { useReportGenerator } from '../hooks/useReportGenerator'
import { useEngineStatus } from '../hooks/useEngineStatus'
import { ConstellationGraph } from '../components/ConstellationGraph'
import { Modal } from '../components/Modal'
import { ReportForm } from '../components/ReportForm'
import { EngineStatusPanel } from '../components/panels/EngineStatusPanel'
import { FolioPanel } from '../components/panels/FolioPanel'
import { PageHeader } from '../components/layout/PageHeader'
import { PageFrame } from '../components/layout/PageFrame'
import { StatFooter } from '../components/chrome/StatFooter'
import { PageTabs } from '../components/chrome/PageTabs'
import { navigate } from '../hooks/useHashRoute'

type ModalView = 'report' | 'info' | 'result' | null

/** Evenly distribute a node's children around its ring (clockwise from top). */
function childOrbitals(kids: SelemeneChild[], color: string): GraphOrbital[] {
  return kids.map((c, i) => ({
    id: c.id,
    label: c.label,
    angle: (i / Math.max(kids.length, 1)) * 360,
    subCount: 0,
    color: color as GraphOrbital['color'],
    glyph: c.glyph,
  }))
}

/**
 * A parent-node page (`#/node/:id`): the node re-centers as a golden astrolabe
 * mandala and its children orbit as labelled orbs. Clicking a child opens the
 * report form (live Selemene API) or an info panel — the report flow migrated
 * intact from the retired ScrollJourney.
 */
export function NodePage({ nodeId }: { nodeId: string }) {
  const node = getNodeById(nodeId)!
  const [selectedChild, setSelectedChild] = useState<SelemeneChild | null>(null)
  const [modalView, setModalView] = useState<ModalView>(null)
  const { generateReport, activeReport } = useReportGenerator()
  const engineStatus = useEngineStatus(node.id === 'engine')

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
  const handleSubmit = (request: AssetGenerateRequest) => {
    generateReport(node, request)
    setModalView('result')
  }
  const initialModeKey = selectedChild?.report ? `${selectedChild.report.surface}:${selectedChild.report.modeId}` : undefined

  const kids = node.children ?? []
  const nodeStats = [
    { label: 'Sub-Nodes', value: String(kids.length) },
    { label: 'Active Paths', value: String(node.modes.length || kids.length) },
    { label: 'Resonance', value: `${(62 + ((node.label.length * 7) % 34))}.${(kids.length * 3) % 10}%` },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-void">
      <ConstellationGraph
        wrapperClassName="fixed inset-0"
        orbitals={childOrbitals(kids, node.color)}
        selectedId={selectedChild?.id ?? null}
        onSelect={openChild}
        centerLabel={node.label}
        onHomeRequest={() => navigate('/')}
        ariaLabel={`${node.label} sub-node constellation`}
        centerYOffset={0.06}
      />
      <PageHeader title={node.label} subtitle={node.description} onBack={() => navigate('/')} />
      <PageFrame />
      <PageTabs />
      <StatFooter stats={nodeStats} />

      <Modal isOpen={modalView === 'report'} title={selectedChild?.label ?? node.label} onClose={closeModal}>
        {modalView === 'report' && (
          <ReportForm node={node} onSubmit={handleSubmit} initialModeKey={initialModeKey} initialLevel={selectedChild?.report?.level} />
        )}
      </Modal>

      <Modal isOpen={modalView === 'info'} title={selectedChild?.label ?? node.label} onClose={closeModal}>
        {node.id === 'engine' ? (
          <EngineStatusPanel child={selectedChild} status={engineStatus} />
        ) : node.id === 'folio' ? (
          <FolioPanel child={selectedChild} />
        ) : (
          <div className="space-y-4">
            <p className="leading-relaxed text-silver">{node.description}</p>
            <div className="rounded-lg border border-gold/10 bg-void/60 px-4 py-3 text-sm text-parchment">
              <span className="font-display uppercase tracking-widest text-gold">{selectedChild?.label}</span>
              <p className="mt-2 text-silver">This surface is informational.</p>
            </div>
          </div>
        )}
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
    </div>
  )
}
