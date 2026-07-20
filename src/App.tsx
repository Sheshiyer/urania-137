import { useEffect } from 'react'
import { useHashRoute } from './hooks/useHashRoute'
import { HomePage } from './pages/HomePage'
import { NodePage } from './pages/NodePage'
import { TopNav } from './components/chrome/TopNav'
import { importLegacyFolioOnce } from './lib/folioImport'

/**
 * Urania 137 is a multi-page stellar console. A hash router renders the galactic
 * home (`#/`) or a parent-node page (`#/node/:id`); the graph is the primary way
 * in, with the top nav as an additive convenience layer. See ISA + README.
 */
export default function App() {
  const route = useHashRoute()
  // One-time legacy localStorage→D1 Folio import (T-048). CF Access guarantees
  // the user is authenticated before React mounts; the module guards so the
  // import POST fires at most once per browser.
  useEffect(() => {
    void importLegacyFolioOnce()
  }, [])
  return (
    <>
      <TopNav route={route} />
      {route.view === 'home' ? <HomePage /> : <NodePage key={route.nodeId} nodeId={route.nodeId} />}
    </>
  )
}
