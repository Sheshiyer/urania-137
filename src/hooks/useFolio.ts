import { useSyncExternalStore } from 'react'
import { FolioEntry, getFolioSnapshot, subscribeFolio } from '../lib/folioStore'

/** Live view of the saved Folio Archive entries. */
export function useFolio(): FolioEntry[] {
  return useSyncExternalStore(subscribeFolio, getFolioSnapshot, getFolioSnapshot)
}
