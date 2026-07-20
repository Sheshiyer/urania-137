/**
 * The frozen interpreter pass model (T-007) — the single source of pass identity
 * for BOTH source implementations. ③ WitnessModeSource must emit the same pass
 * ids so the ①→③ swap is shape-safe (Phase 3 G8, ledger REQ-4).
 */
export interface PassSpec {
  id: string
  title: string
  kind: 'base' | 'overlay'
}

export const PASS_MODEL: readonly PassSpec[] = [
  { id: 'vara', title: 'The Day-Lord', kind: 'base' },
  { id: 'tithi', title: 'The Lunar Day', kind: 'base' },
  { id: 'nakshatra', title: "The Moon's Mansion", kind: 'base' },
  { id: 'conditions', title: 'Conditions of the Day', kind: 'base' },
  { id: 'native', title: 'How Today Meets Your Pattern', kind: 'overlay' },
]

export const BASE_PASS_IDS: readonly string[] = PASS_MODEL.filter((p) => p.kind === 'base').map((p) => p.id)
export const OVERLAY_PASS_IDS: readonly string[] = PASS_MODEL.filter((p) => p.kind === 'overlay').map((p) => p.id)
