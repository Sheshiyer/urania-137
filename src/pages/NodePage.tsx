import { useState } from 'react'
import { getNodeById } from '../data/selemeneNodes'
import { GraphOrbital, SelemeneChild, AssetGenerateRequest, BirthData } from '../types'
import { useReportGenerator } from '../hooks/useReportGenerator'
import { useEngineStatus } from '../hooks/useEngineStatus'
import { useDeterministicRun } from '../hooks/useDeterministicRun'
import { ConstellationGraph } from '../components/ConstellationGraph'
import { Modal } from '../components/Modal'
import { WitnessForm } from '../components/forms/WitnessForm'
import { BirthDataForm } from '../components/forms/BirthDataForm'
import { EngineStatusPanel } from '../components/panels/EngineStatusPanel'
import { FolioPanel } from '../components/panels/FolioPanel'
import { DeterministicResult } from '../components/panels/DeterministicResult'
import { PageHeader } from '../components/layout/PageHeader'
import { PageFrame } from '../components/layout/PageFrame'
import { StatFooter } from '../components/chrome/StatFooter'
import { PageTabs } from '../components/chrome/PageTabs'
import { BottomChrome } from '../components/chrome/BottomChrome'
import { CHROME } from '../components/chrome/insets'
import { navigate } from '../hooks/useHashRoute'

type ModalView = 'witness' | 'birth' | 'info' | 'result' | 'deterministic' | null

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
 * and its children orbit as labelled orbs. Clicking a child runs the real
 * capability it's wired to — a deterministic workflow/engine, a witness reading,
 * or a live panel — against the live Selemene engine.
 */
export function NodePage({ nodeId }: { nodeId: string }) {
  const node = getNodeById(nodeId)!
  const [selectedChild, setSelectedChild] = useState<SelemeneChild | null>(null)
  const [modalView, setModalView] = useState<ModalView>(null)
  const { generateReport, activeReport, isGenerating } = useReportGenerator()
  const engineStatus = useEngineStatus(node.id === 'engine')
  const det = useDeterministicRun()

  const openChild = (childId: string) => {
    const child = node.children?.find((c) => c.id === childId)
    if (!child) return
    setSelectedChild(child)
    det.reset()
    if (child.info || !child.run) setModalView('info')
    else if (child.run.kind === 'witness') setModalView('witness')
    else setModalView('birth')
  }

  const closeModal = () => {
    setModalView(null)
    setSelectedChild(null)
    det.reset()
  }

  const submitWitness = (request: AssetGenerateRequest) => {
    generateReport(node, request)
    setModalView('result')
  }

  const submitBirth = (birth: BirthData) => {
    if (!selectedChild?.run) return
    setModalView('deterministic')
    void det.run(node, selectedChild.label, selectedChild.run, birth)
  }

  const kids = node.children ?? []
  const runnable = kids.filter((c) => c.run).length
  const nodeStats = [
    { label: 'Sub-Nodes', value: String(kids.length) },
    { label: 'Live Paths', value: String(runnable || kids.length) },
    { label: 'Resonance', value: `${62 + ((node.label.length * 7) % 34)}.${(kids.length * 3) % 10}%` },
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
        topInset={CHROME.navAndTitle}
        bottomInset={CHROME.tabsAndFooter}
      />
      <PageHeader title={node.label} subtitle={node.description} onBack={() => navigate('/')} />
      <PageFrame />
      <BottomChrome>
        <PageTabs />
        <StatFooter stats={nodeStats} />
      </BottomChrome>

      {/* Witness reading — a mode the engine actually resolves */}
      <Modal isOpen={modalView === 'witness'} title={selectedChild?.label ?? node.label} onClose={closeModal}>
        {modalView === 'witness' && selectedChild?.run?.kind === 'witness' && (
          <WitnessForm run={selectedChild.run} actionLabel={`Generate ${selectedChild.label}`} onSubmit={submitWitness} busy={isGenerating} />
        )}
      </Modal>

      {/* Deterministic workflow / engine — needs birth_data */}
      <Modal isOpen={modalView === 'birth'} title={selectedChild?.label ?? node.label} onClose={closeModal}>
        {modalView === 'birth' && selectedChild?.run && (
          <BirthDataForm actionLabel={`Run ${selectedChild.label}`} onSubmit={submitBirth} busy={det.busy} />
        )}
      </Modal>

      <Modal isOpen={modalView === 'deterministic'} title={selectedChild?.label ?? node.label} onClose={closeModal}>
        <DeterministicResult
          result={det.workflow}
          engine={det.engine}
          declaredEngines={det.declaredEngines}
          busy={det.busy}
          error={det.error}
        />
      </Modal>

      {/* Live panels */}
      <Modal isOpen={modalView === 'info'} title={selectedChild?.label ?? node.label} onClose={closeModal}>
        {node.id === 'engine' ? (
          <EngineStatusPanel child={selectedChild} status={engineStatus} />
        ) : node.id === 'folio' ? (
          <FolioPanel child={selectedChild} />
        ) : (
          <p className="leading-relaxed text-silver">{node.description}</p>
        )}
      </Modal>

      {/* Witness result — assembled markdown */}
      <Modal isOpen={modalView === 'result'} title={activeReport?.title ?? 'Reading'} onClose={closeModal}>
        <div className="space-y-4">
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              activeReport?.status === 'error' ? 'border-terracotta/20 bg-terracotta/10 text-terracotta' : 'border-emerald/20 bg-emerald/10 text-emerald'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${activeReport?.status === 'generating' ? 'animate-pulse bg-emerald' : activeReport?.status === 'error' ? 'bg-terracotta' : 'bg-emerald'}`} />
            {activeReport?.status ?? 'generating'}
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-gold/10 bg-void/60 p-4 font-mono text-xs leading-relaxed text-parchment/90">
            {activeReport?.content || 'Contacting the Selemene engines…'}
          </pre>
        </div>
      </Modal>
    </div>
  )
}
