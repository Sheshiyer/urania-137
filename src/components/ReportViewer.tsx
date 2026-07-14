import { GeneratedReport } from '../types'

interface ReportViewerProps {
  report: GeneratedReport | null
}

export function ReportViewer({ report }: ReportViewerProps) {
  if (!report) {
    return (
      <div className="rounded-2xl border border-gold/10 bg-surface/60 p-6 backdrop-blur min-h-[160px]">
        <p className="text-sm text-silver">No report generated yet. Select a node and generate a report.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gold/10 bg-surface/60 p-6 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display font-semibold text-parchment">{report.title}</h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            report.status === 'generating'
              ? 'bg-indigo/10 text-indigo'
              : report.status === 'complete'
              ? 'bg-emerald/10 text-emerald'
              : 'bg-terracotta/10 text-terracotta'
          }`}
        >
          {report.status}
        </span>
      </div>

      {report.status === 'generating' ? (
        <div className="flex items-center gap-3 text-sm text-silver">
          <span className="inline-block w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          Generating report from the Selemene engines...
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-parchment/90 leading-relaxed">{report.content}</p>
          <p className="text-xs text-silver/60 font-mono">
            Generated at {report.generatedAt.toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}
