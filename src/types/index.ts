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

/**
 * A child of a parent node, revealed on that node's `/node/:id` page.
 * Sourced one-to-one from the generated page references in
 * `.assets/page-references/`. Clicking a child opens the report modal:
 * `report` presets the ReportForm to an EXISTING Selemene mode/level;
 * `info` children (Engine Status, Folio Archive) open an info panel instead.
 */
export interface SelemeneChild {
  id: string
  label: string
  report?: { surface: Surface; modeId: string; level?: ReportLevel }
  info?: boolean
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
  /** Sub-tree revealed on the parent-node page. Absent = leaf on the home graph. */
  children?: SelemeneChild[]
}

/**
 * Minimal shape the radial graph needs to place and draw one orbital item.
 * Both the home nodes and a parent's children reduce to this, so a single
 * `StellarNodeGraph` renders every depth (primary anti-drift lever).
 */
export interface GraphOrbital {
  id: string
  label: string
  /** Degrees; 0 = top, increasing clockwise. */
  angle: number
  /** Decorative satellite branches drawn around this orbital. */
  subCount: number
  color?: StellarNode['color']
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

/**
 * Request body for `POST /api/v1/assets/generate` (the Selemene "witness" surface).
 * Mirrors the Rust `AssetGenerateRequest`: `mode` is required, the rest optional.
 */
export interface AssetGenerateRequest {
  mode: string
  report_level?: ReportLevel
  language?: string
  consciousness_level?: number
  subjects?: SubjectInput[]
  relationship_context?: RelationshipContext
  options?: Record<string, unknown>
}

/** Response from `POST /api/v1/assets/generate` (Rust `AssetGenerateResponse`). */
export interface AssetGenerateResponse {
  mode: string
  register: string
  passes: { id: string; title: string; output: string }[]
  assembled: string
  engines_used: string[]
  source_pack?: unknown
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
