export interface StellarNode {
  id: string
  label: string
  description: string
  angle: number
  distance: number
  color: 'gold' | 'cyan' | 'violet' | 'amber'
  subNodes: string[]
  reportType?: string
}

export interface GeneratedReport {
  id: string
  nodeId: string
  title: string
  status: 'generating' | 'complete' | 'error'
  content: string
  generatedAt: Date
}

export interface NodeGraphConfig {
  width: number
  height: number
  centerRadius: number
  orbitRadius: number
}
