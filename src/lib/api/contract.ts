/**
 * FROZEN shared API contract (T-004) — imported by BOTH the SPA and the
 * Worker/Pages Functions. Changing this is a contract change (Phase 0 only).
 *
 * The ReadingDTO is 1:1 with the SPA's FolioEntry (src/lib/folioStore.ts), so the
 * Folio migrates field-for-field from localStorage to D1.
 */

export interface User {
  id: string
  email: string
}

export interface ReadingDTO {
  id: string
  nodeId: string
  nodeLabel: string
  mode: string
  title: string
  content: string
  createdAt: number
  favorite: boolean
}

/** POST /api/folio body. */
export type SaveReadingRequest = Pick<ReadingDTO, 'nodeId' | 'nodeLabel' | 'mode' | 'title' | 'content'>

/** GET /api/folio response. */
export interface FolioListResponse {
  readings: ReadingDTO[]
}

/** POST /api/folio/import body (the localStorage Folio, migrated once) + result. */
export interface ImportRequest {
  entries: ReadingDTO[]
}
export interface ImportResponse {
  imported: number
}

/** GET /api/me. */
export type MeResponse = User

/** Error envelope for every /api/* failure. */
export interface ApiError {
  error: string
  message: string
}

/** The verified CF Access identity the Worker extracts (server-only). */
export interface CfAccessIdentity {
  email: string
  sub: string
}

// ---------------------------------------------------------------------------
// T-079 fast-follow: Corpus admin data browser contract (ISC-#133, #137,
// #139, #132/#138). Shared between functions/api/[[path]].ts and the SPA.
// ---------------------------------------------------------------------------

/** A single corpus reading metadata row from D1 `catalogue_readings`. */
export interface CorpusReading {
  id: string
  sha256: string
  title: string
  mode: string
  source_type: string
  created_at: number
  is_synastry: boolean
  canonical_uri: string | null
}

/** GET /api/corpus response. */
export interface CorpusListResponse {
  readings: CorpusReading[]
  total: number
}

/** GET /api/corpus/:id response — metadata + R2 HTML body. */
export interface CorpusDetailResponse {
  reading: CorpusReading
  content_html: string
}

/** GET /api/patterns/search response. */
export interface PatternSearchResult {
  id: string
  score: number
  metadata: Record<string, unknown>
}

export interface PatternSearchResponse {
  results: PatternSearchResult[]
  query_embedding: boolean
}
