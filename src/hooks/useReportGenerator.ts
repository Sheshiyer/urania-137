import { useState, useCallback } from 'react'
import { AssetGenerateRequest, GeneratedReport, StellarNode } from '../types'
import { generateAsset } from '../lib/selemeneApi'
import { saveReport } from '../lib/folioStore'

export function useReportGenerator() {
  const [reports, setReports] = useState<GeneratedReport[]>([])
  const [activeReport, setActiveReport] = useState<GeneratedReport | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const generateReport = useCallback(async (node: StellarNode, request: AssetGenerateRequest) => {
    const id = `${node.id}-${request.mode}`
    const newReport: GeneratedReport = {
      id,
      nodeId: node.id,
      title: `${node.label} — ${request.mode}`,
      status: 'generating',
      content: '',
      generatedAt: new Date(),
    }

    setReports((prev) => [newReport, ...prev])
    setActiveReport(newReport)
    setIsGenerating(true)

    try {
      const raw = await generateAsset(request)
      const content =
        raw.assembled?.trim() ||
        (raw.passes || []).map((p) => `## ${p.title}\n\n${p.output}`).join('\n\n') ||
        'No content returned.'
      const engines = raw.engines_used?.length ? `\n\n---\n_Engines: ${raw.engines_used.join(', ')} · register ${raw.register}_` : ''
      const completed: GeneratedReport = { ...newReport, status: 'complete', content: content + engines, raw }
      setReports((prev) => prev.map((r) => (r.id === id ? completed : r)))
      setActiveReport((current) => (current?.id === id ? completed : current))
      // Persist to the Folio Archive (async, D1-backed). A save failure surfaces
      // as saveError instead of silently dropping the reading; the generated
      // report itself is already complete and stays complete.
      try {
        await saveReport({ nodeId: node.id, nodeLabel: node.label, mode: request.mode, title: completed.title, content: completed.content })
        setSaveError(null)
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Could not save the report to the Folio.')
      }
    } catch (err) {
      const errorReport: GeneratedReport = {
        ...newReport,
        status: 'error',
        content: err instanceof Error ? err.message : 'Unknown error',
      }
      setReports((prev) => prev.map((r) => (r.id === id ? errorReport : r)))
      setActiveReport((current) => (current?.id === id ? errorReport : current))
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return { reports, activeReport, isGenerating, saveError, generateReport, setActiveReport }
}
