import { useState } from 'react'
import { SELEMENE_NODES } from './data/selemeneNodes'
import { useReportGenerator } from './hooks/useReportGenerator'
import { StellarNodeGraph } from './components/StellarNodeGraph'
import { NodeDetailPanel } from './components/NodeDetailPanel'
import { ReportViewer } from './components/ReportViewer'
import { SelemeneHeader } from './components/SelemeneHeader'

function App() {
  const [selectedNode, setSelectedNode] = useState(SELEMENE_NODES[0])
  const { activeReport, generateReport } = useReportGenerator()

  return (
    <div className="min-h-screen bg-void text-parchment">
      <SelemeneHeader />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-parchment mb-2">
            Stellar Node Console
          </h2>
          <p className="text-silver max-w-2xl">
            Select a stellar node to generate a Selemene report. The architecture mirrors the seven
            report surfaces and their branching sub-criteria.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-gold/10 bg-void p-4 shadow-2xl overflow-hidden">
              <StellarNodeGraph
                nodes={SELEMENE_NODES}
                selectedNode={selectedNode}
                onNodeSelect={setSelectedNode}
              />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <NodeDetailPanel node={selectedNode} onGenerate={generateReport} />

            <ReportViewer report={activeReport} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
