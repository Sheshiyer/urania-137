export type ReportLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'

export type ReportMode =
  | 'birth-blueprint'
  | 'integrated-reading'
  | 'mother-son-lineage'
  | 'business-partners'
  | 'family-penta'
  | 'unmarried-partners'
  | 'married-partners'
  | 'synastry'
  | 'transit'
  | 'bridge-query'

export interface Subject {
  role: string
  name: string
  birthDate: string
  birthTime: string
  birthTimeConfidence: 'exact' | 'approximate' | 'unknown'
  birthLocation: string
}

export interface RelationshipContext {
  type: 'family' | 'friends' | 'business-partners' | 'unmarried-partners' | 'married-partners' | 'custom'
  mappingGoal: string
  sensitivityLevel: 'low' | 'medium' | 'high'
}

export interface StellarNode {
  id: string
  label: string
  description: string
  angle: number
  distance: number
  color: 'gold' | 'cyan' | 'violet' | 'amber'
  subNodes: string[]
  reportType?: string
  reportMode?: ReportMode
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
