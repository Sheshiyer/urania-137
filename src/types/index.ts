export type ReportLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
export type Surface = 'deterministic' | 'witness'

export type WitnessMode =
  | 'birth-blueprint'
  | 'integrated-reading'
  | 'integrated-reading-l4'
  | 'mother-son-lineage'
  | 'business-partners'
  | 'family-penta'
  | 'unmarried-partners'
  | 'married-partners'
  | 'synastry'
  | 'transit'
  | 'bridge-query'

export type DeterministicWorkflow =
  | 'birth-blueprint'
  | 'daily-practice'
  | 'decision-support'
  | 'self-inquiry'
  | 'creative-expression'
  | 'full-spectrum'

export interface NormalizedLocation {
  display_name: string
  latitude: number
  longitude: number
  timezone: string
  provider: string
  confidence: string
}

export interface SubjectInput {
  role: string
  name: string
  birth_date: string
  birth_time: string
  birth_time_confidence: 'exact' | 'approximate' | 'unknown'
  birth_location_query: string
  normalized_location: NormalizedLocation
}

export interface RelationshipContext {
  type: 'family' | 'friends' | 'business-partners' | 'unmarried-partners' | 'married-partners' | 'custom'
  mapping_goal: string
  sensitivity_level: 'low' | 'medium' | 'high'
}

export interface SelemeneMode {
  id: WitnessMode | DeterministicWorkflow
  label: string
  surface: Surface
  minSubjects: number
  maxSubjects: number
  needsRelationship?: boolean
  needsTransitDate?: boolean
  needsQuestion?: boolean
  description?: string
}

export interface StellarNode {
  id: string
  label: string
  description: string
  angle: number
  distance: number
  color: 'gold' | 'cyan' | 'violet' | 'amber'
  subNodes: string[]
  modes: SelemeneMode[]
}

export interface ReportGenerationRequest {
  report_level: ReportLevel
  report_mode: WitnessMode
  subjects: SubjectInput[]
  relationship_context?: RelationshipContext
  language: string
  output: {
    format: 'markdown' | 'docx' | 'pdf' | 'source-pack'
    include_rubric: boolean
    include_pattern_extraction: boolean
  }
}

export interface DeterministicRequest {
  birth_data: {
    date: string
    time: string
    latitude: number
    longitude: number
    timezone: string
  }
  current_time?: string
  options?: Record<string, unknown>
}

export interface GeneratedReport {
  id: string
  nodeId: string
  title: string
  status: 'generating' | 'complete' | 'error'
  content: string
  raw?: unknown
  generatedAt: Date
}

export interface NodeGraphConfig {
  width: number
  height: number
  centerRadius: number
  orbitRadius: number
}
