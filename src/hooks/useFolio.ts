import { useSyncExternalStore } from 'react'
import { FolioEntry, FolioState, getFolioSnapshot, getFolioStateSnapshot, subscribeFolio } from '../lib/folioStore'

/** Live view of the saved Folio Archive entries. */
export function useFolio(): FolioEntry[] {
  return useSyncExternalStore(subscribeFolio, getFolioSnapshot, getFolioSnapshot)
}

/** Live view of the full Folio state — entries plus async status/error. */
export function useFolioState(): FolioState {
  return useSyncExternalStore(subscribeFolio, getFolioStateSnapshot, getFolioStateSnapshot)
}
