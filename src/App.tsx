import { useState } from 'react'
import { SELEMENE_NODES } from './data/selemeneNodes'
import { useReportGenerator } from './hooks/useReportGenerator'
import { StellarNode, GeneratedReport, Surface, ReportGenerationRequest, DeterministicRequest } from './types'
import { StellarNodeGraph } from './components/StellarNodeGraph'
import { Modal } from './components/Modal'
import { ReportForm } from './components/ReportForm'
import { Sparkles, Activity, Archive } from 'lucide-react'

type ModalView = 'input' | 'info' | 'result' | null

export default function App() {
  const [selectedNode, setSelectedNode] = useState<StellarNode | null>(null)
  const [selectedMode, setSelectedMode] = useState<string | null>(null)
  const [modalView, setModalView] = useState<ModalView>(null)
  const [activeReport, setActiveReport] = useState<GeneratedReport | null>(null)
  const { generateReport } = useReportGenerator()

  const openNode = (node: StellarNode) => {
    setSelectedNode(node)
    setSelectedMode(node.modes[0] ? `${node.modes[0].surface}:${node.modes[0].id}` : null)
    setActiveReport(null)
    if (node.id === 'engine' || node.id === 'folio') {
      setModalView('info')
    } else {
      setModalView('input')
    }
  }

  const closeModal = () => {
    setModalView(null)
    setSelectedNode(null)
    setSelectedMode(null)
    setActiveReport(null)
  }

  const handleSubmit = (payload: {
    surface: Surface
    request: ReportGenerationRequest | DeterministicRequest
  }) => {
    if (!selectedNode || !selectedMode) return
    const mode = selectedNode.modes.find((m) => `${m.surface}:${m.id}` === selectedMode)
    if (!mode) return

    if (payload.surface === 'witness') {
      generateReport(selectedNode, 'witness', payload.request)
    } else {
      generateReport(selectedNode, 'deterministic', {
        workflowId: mode.id,
        payload: payload.request,
      })
    }
    setModalView('result')
  }

  const renderInfoContent = () => {
    if (!selectedNode) return null

    if (selectedNode.id === 'engine') {
      return (
        <div className="space-y-5">
          <div className="flex items-center gap-3 text-gold">
            <Activity className="w-5 h-5" />
            <span className="text-sm uppercase tracking-widest font-display">Live Engine Status</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              'Anamnesis',
              'Gene Keys',
              'Enneagram',
              'Human Design',
              'Vedic Clock',
              'Panchanga',
              'I Ching',
              'Astro',
            ].map((engine) => (
              <div key={engine} className="rounded-lg bg-void/60 border border-gold/10 px-3 py-2 text-sm text-parchment">
                {engine}
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-emerald/10 border border-emerald/20 px-3 py-2 text-sm text-emerald">
            All 16 consciousness engines responsive. Pulse at localhost:31337.
          </div>
        </div>
      )
    }

    if (selectedNode.id === 'folio') {
      return (
        <div className="space-y-5">
          <div className="flex items-center gap-3 text-gold">
            <Archive className="w-5 h-5" />
            <span className="text-sm uppercase tracking-widest font-display">Folio Archive</span>
          </div>
          <p className="text-silver">No saved reports in this session yet.</p>
          <div className="rounded-lg bg-void/60 border border-gold/10 p-4 text-center text-silver text-sm">
            Generated reports will appear here.
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="relative min-h-screen bg-void overflow-hidden">
      <div className="fixed top-6 left-6 z-10 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gold/10">
          <Sparkles className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h1 className="text-sm font-display font-semibold text-parchment tracking-widest">
            URANIA 137
          </h1>
          <p className="text-[10px] text-silver uppercase tracking-widest font-display">
            Selemene Report Console
          </p>
        </div>
      </div>

      <div className="fixed bottom-6 left-6 z-10 max-w-xs text-xs text-silver/70">
        Click any stellar node to open its input window. The graph is the interface.
      </div>

      <StellarNodeGraph
        nodes={SELEMENE_NODES}
        selectedNode={selectedNode}
        onNodeSelect={openNode}
      />

      <Modal
        isOpen={modalView === 'input' || modalView === 'info'}
        title={selectedNode?.label ?? ''}
        onClose={closeModal}
      >
        {modalView === 'input' && selectedNode && (
          <ReportForm
            node={selectedNode}
            onSubmit={handleSubmit}
          />
        )}
        {modalView === 'info' && renderInfoContent()}
      </Modal>

      <Modal
        isOpen={modalView === 'result'}
        title={activeReport?.title ?? 'Report'}
        onClose={closeModal}
      >
        <div className="space-y-4">
          <div
            className={`rounded-lg border px-3 py-2 text-sm flex items-center gap-2 ${
              activeReport?.status === 'error'
                ? 'bg-terracotta/10 border-terracotta/20 text-terracotta'
                : 'bg-emerald/10 border-emerald/20 text-emerald'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                activeReport?.status === 'generating' ? 'bg-emerald animate-pulse' : activeReport?.status === 'error' ? 'bg-terracotta' : 'bg-emerald'
              }`}
            />
            {activeReport?.status}
          </div>
          <pre className="rounded-lg bg-void/60 border border-gold/10 p-4 text-xs text-parchment/90 font-mono overflow-auto max-h-[320px]">
            {activeReport?.content ?? 'No report content.'}
          </pre>
        </div>
      </Modal>
    </div>
  )
}
