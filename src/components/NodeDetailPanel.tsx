import { StellarNode } from '../types'

interface NodeDetailPanelProps {
  node: StellarNode | null
  onGenerate: (node: StellarNode) => void
}

export function NodeDetailPanel({ node, onGenerate }: NodeDetailPanelProps) {
  if (!node) {
    return (
      <div className="h-full rounded-2xl border border-gold/10 bg-surface/60 p-6 backdrop-blur">
        <p className="text-sm text-silver">
          Select a stellar node to view its signature and generate a Selemene report.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full rounded-2xl border border-gold/10 bg-surface/60 p-6 backdrop-blur">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-2 h-2 rounded-full bg-gold" />
        <h2 className="text-xl font-display font-semibold tracking-tight text-parchment">
          {node.label}
        </h2>
      </div>

      <p className="text-silver mb-6 leading-relaxed">{node.description}</p>

      <div className="mb-6">
        <h3 className="text-xs uppercase tracking-widest text-silver/60 mb-3 font-display">
          Connected Sub-Nodes
        </h3>
        <div className="flex flex-wrap gap-2">
          {node.subNodes.map((sub) => (
            <span
              key={sub}
              className="px-3 py-1 rounded-full text-xs font-medium bg-gold/5 text-gold border border-gold/15"
            >
              {sub}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => onGenerate(node)}
        className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-emerald to-gold text-void font-semibold text-sm hover:brightness-110 transition-all"
      >
        Generate {node.label} Report
      </button>
    </div>
  )
}
