import { useState, useCallback } from 'react'
import { GeneratedReport, StellarNode, Surface } from '../types'
import {
  generateWitnessReport,
  executeDeterministicWorkflow,
} from '../lib/selemeneApi'

export function useReportGenerator() {
  const [reports, setReports] = useState<GeneratedReport[]>([])
  const [activeReport, setActiveReport] = useState<GeneratedReport | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const generateReport = useCallback(
    async (
      node: StellarNode,
      surface: Surface,
      request: unknown
    ) => {
      const id = `${node.id}-${Date.now()}`
      const newReport: GeneratedReport = {
        id,
        nodeId: node.id,
        title: `${node.label} — ${surface === 'witness' ? 'Witness' : 'Deterministic'}`,
        status: 'generating',
        content: '',
        generatedAt: new Date(),
      }

      setReports((prev) => [newReport, ...prev])
      setActiveReport(newReport)
      setIsGenerating(true)

      try {
        let raw: unknown
        if (surface === 'witness') {
          raw = await generateWitnessReport(request as Parameters<typeof generateWitnessReport>[0])
        } else {
          const workflowId = (request as { workflowId: string }).workflowId
          const payload = (request as { payload: Parameters<typeof executeDeterministicWorkflow>[1] }).payload
          raw = await executeDeterministicWorkflow(workflowId as any, payload)
        }

        const completed: GeneratedReport = {
          ...newReport,
          status: 'complete',
          content: JSON.stringify(raw, null, 2),
          raw,
        }
        setReports((prev) => prev.map((r) => (r.id === id ? completed : r)))
        setActiveReport((current) => (current?.id === id ? completed : current))
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
    },
    []
  )

  return {
    reports,
    activeReport,
    isGenerating,
    generateReport,
    setActiveReport,
  }
}
