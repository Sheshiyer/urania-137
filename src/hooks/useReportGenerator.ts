import { useState, useCallback } from 'react'
import { GeneratedReport, StellarNode } from '../types'

const MOCK_CONTENT: Record<string, string> = {
  'birth-report': 'Birth report generated. Natal Sun conjunct North Node, exact to the minute. The incarnation carries a forward-momentum signature.',
  'compatibility-report': 'Union mirror complete. The two charts show a shared 12th-house emphasis, suggesting unseen collaborative depth.',
  'transit-report': 'Sky weather update: Saturn crossing the descendant invites relational restructuring. Jupiter trines the natal Sun.',
  'witness-reading': 'Witness reading emitted. Non-prescriptive mirror: the question itself is the first node of the branching.',
  'engine-status': 'Engine status: all 16 consciousness engines responsive. Pulse at localhost:31337.',
  'folio': 'Folio archive loaded. 0 reports archived in this session.',
  'bridge-query': 'Bridge query sent. Awaiting engine convergence.',
}

export function useReportGenerator() {
  const [reports, setReports] = useState<GeneratedReport[]>([])
  const [activeReport, setActiveReport] = useState<GeneratedReport | null>(null)

  const generateReport = useCallback((node: StellarNode) => {
    const id = `${node.id}-${Date.now()}`
    const newReport: GeneratedReport = {
      id,
      nodeId: node.id,
      title: `${node.label} Report`,
      status: 'generating',
      content: '',
      generatedAt: new Date(),
    }

    setReports((prev) => [newReport, ...prev])
    setActiveReport(newReport)

    setTimeout(() => {
      const completed: GeneratedReport = {
        ...newReport,
        status: 'complete',
        content: MOCK_CONTENT[node.reportType ?? 'bridge-query'] ?? 'Report generated successfully.',
      }
      setReports((prev) => prev.map((r) => (r.id === id ? completed : r)))
      setActiveReport((current) => (current?.id === id ? completed : current))
    }, 1200)
  }, [])

  return {
    reports,
    activeReport,
    generateReport,
    setActiveReport,
  }
}
