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
 * Birth data for the deterministic surface (`noesis_core::BirthData`).
 * `name` is REQUIRED — numerology 422s without it, and a workflow will silently
 * drop that engine from `engine_outputs` rather than erroring.
 */
export interface BirthData {
  name: string
  date: string
  time: string
  latitude: number
  longitude: number
  timezone: string
}

/** `POST /api/v1/engines/{id}/calculate` */
export interface EngineResult {
  engine_id: string
  result: Record<string, unknown>
}

/** `POST /api/v1/workflows/{id}` */
export interface WorkflowResult {
  workflow_id: string
  engine_outputs: Record<string, EngineResult>
  synthesis: unknown | null
  total_time_ms: number
  timestamp?: string
  engine_results?: Record<string, EngineResult>
}

/** `GET /api/v1/workflows` */
export interface SelemeneWorkflow {
  id: string
  name: string
  description: string
  engine_count: number
}

/**
 * What a child actually runs against the live engine. Every child maps to a
 * real, verified capability — no mode is sent that the API doesn't serve:
 *  - `workflow` → POST /api/v1/workflows/{id}        (6 real workflows)
 *  - `engine`   → POST /api/v1/engines/{id}/calculate (18 real engines)
 *  - `witness`  → POST /api/v1/assets/generate        (only the modes
 *    noesis-api's `load_mode_document` actually resolves; anything else
 *    silently returns a generic "default: Reading" pass)
 */
export type ChildRun =
  | { kind: 'workflow'; workflowId: string }
  | { kind: 'engine'; engineId: string }
  | { kind: 'witness'; mode: string; minSubjects: number; maxSubjects: number; level?: ReportLevel }

/**
 * A child of a parent node, revealed on that node's `#/node/:id` page.
 * `run` wires it to a live capability; `info` children render a panel instead.
 */
export interface SelemeneChild {
  id: string
  label: string
  run?: ChildRun
  info?: boolean
  /** Optional sacred-geometry glyph id (see `primitives/Glyph.tsx`). */
  glyph?: string
  /** Optional action for functional surfaces (Folio Archive). */
  action?: 'list' | 'search' | 'history' | 'favorites' | 'export'
  /** Export format for `action: 'export'`. */
  format?: 'markdown' | 'docx' | 'pdf'
}

export interface StellarNode {
  id: string
  label: string
  description: string
  angle: number
  distance: number
  color: 'gold' | 'cyan' | 'violet' | 'amber'
  subNodes: string[]
  /** Sub-tree revealed on the parent-node page. Absent = leaf on the home graph. */
  children?: SelemeneChild[]
  /** Optional sacred-geometry glyph id for the home planet (see `primitives/Glyph.tsx`). */
  glyph?: string
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
  /** Optional sacred-geometry glyph id drawn in the orb. */
  glyph?: string
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

/** `GET /health` — overall Selemene liveness. */
export interface SelemeneHealth {
  status: string
  version: string
  uptime_seconds: number
  engines_loaded: number
  workflows_loaded: number
}

/** One engine's live health from `GET /health/ready#bridge_engines`. */
export interface BridgeEngineHealth {
  engine_id: string
  healthy: boolean
  detail: string
  latency_ms: number
}

/** `GET /health/ready` — infra + per-engine readiness. */
export interface SelemeneReady {
  redis: string
  postgres: string
  orchestrator: string
  bridge_status: string
  bridge_engines: BridgeEngineHealth[]
  bridge_failed_engines: string[]
  overall_status: string
}

/** Combined live status the Engine Status surface renders. */
export interface EngineStatus {
  health: SelemeneHealth | null
  ready: SelemeneReady | null
  engines: string[]
  loading: boolean
  error: string | null
}
