/**
 * One-time legacy Folio import (T-048) — on first authenticated load, detect
 * the legacy localStorage Folio ('urania137.folio.v1'), POST its entries to
 * /api/folio/import once, then set a migrated guard flag so it never re-runs
 * in this browser.
 *
 * This module is the ONLY remaining reader of the legacy localStorage key
 * (the folioStore runtime path is fetch-only, T-045). Idempotency is enforced
 * server-side (T-044: stable dedupe key), so a retried import after a failed
 * attempt is safe; the client guard just makes the success path fire at most
 * once. Malformed/empty legacy payloads are handled without error (T-051).
 */

import type { ApiError, ImportRequest, ImportResponse } from './api/contract'
import { FolioEntry, refreshFolio } from './folioStore'

const LEGACY_KEY = 'urania137.folio.v1'
const MIGRATED_KEY = 'urania137.folio.migrated.v1'

let inFlight: Promise<void> | null = null

/** Light shape guard so a malformed legacy payload imports nothing harmful. */
function isLegacyEntry(x: unknown): x is FolioEntry {
  if (typeof x !== 'object' || x === null) return false
  const e = x as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    typeof e.nodeId === 'string' &&
    typeof e.nodeLabel === 'string' &&
    typeof e.mode === 'string' &&
    typeof e.title === 'string' &&
    typeof e.content === 'string' &&
    typeof e.createdAt === 'number' &&
    typeof e.favorite === 'boolean'
  )
}

/** Read + validate the legacy localStorage Folio ([] when absent or malformed). */
export function readLegacyFolio(): FolioEntry[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isLegacyEntry)
  } catch {
    return []
  }
}

/**
 * Run the import at most once per browser. No legacy data → no import call.
 * A failed POST leaves the guard unset so the next load retries (safe — the
 * server dedupes); a successful one clears the legacy key and refreshes the
 * D1-backed snapshot so imported readings appear immediately.
 */
export async function importLegacyFolioOnce(): Promise<void> {
  if (inFlight) return inFlight
  inFlight = run()
  try {
    await inFlight
  } finally {
    inFlight = null
  }
}

async function run(): Promise<void> {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return
    const entries = readLegacyFolio()
    if (entries.length === 0) {
      // Nothing to migrate — never POST, and never check again.
      localStorage.setItem(MIGRATED_KEY, new Date().toISOString())
      return
    }
    const res = await fetch('/api/folio/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entries } satisfies ImportRequest),
    })
    if (!res.ok) {
      // Leave the guard unset → retried on next load. Swallow the envelope;
      // a migration hiccup must never break app boot.
      try {
        await res.json() as ApiError
      } catch {
        /* non-JSON error body */
      }
      return
    }
    // Typed against the frozen ImportResponse so contract drift fails tsc (T-053).
    const result = (await res.json()) as ImportResponse
    void result.imported
    localStorage.setItem(MIGRATED_KEY, new Date().toISOString())
    localStorage.removeItem(LEGACY_KEY)
    await refreshFolio()
  } catch {
    /* localStorage unavailable / network down — retry happens next load */
  }
}
