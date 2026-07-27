import { useEffect, useRef } from 'react'
import { useHashRoute } from './hooks/useHashRoute'
import { useMe } from './hooks/useMe'
import { HomePage } from './pages/HomePage'
import { NodePage } from './pages/NodePage'
import { ThresholdPage } from './pages/ThresholdPage'
import { ReadingLibraryPage } from './pages/ReadingLibraryPage'
import { SettingsPage } from './pages/SettingsPage'
import { RelationshipReadingPage } from './pages/RelationshipReadingPage'
import { TopNav } from './components/chrome/TopNav'
import { importLegacyFolioOnce } from './lib/folioImport'
import { listSubjects } from './lib/subjectsApi'

/**
 * Urania 137 is a multi-page stellar console. A hash router renders the galactic
 * home (`#/`), a parent-node page (`#/node/:id`), or the pre-graph Threshold
 * (`#/threshold`); the graph is the primary way in, with the top nav as an
 * additive convenience layer. See ISA + README.
 *
 * First-run splice (W2-B): once `useMe` resolves, a caller with NO subject
 * profiles has not crossed the Threshold and is replaced to `#/threshold`
 * before the graph can paint as their landing view. Returning users (a stored
 * `self` row) never see the redirect. Fail-open: a subjects-endpoint error
 * leaves the user on the graph rather than trapping them.
 */
export default function App() {
  const route = useHashRoute()
  // Signed-in identity for the app chrome (T-024/T-025): CF Access owns the
  // session cookie, so useMe just reads GET /api/me once on mount.
  const { me } = useMe()
  // One-time legacy localStorage→D1 Folio import (T-048). CF Access guarantees
  // the user is authenticated before React mounts; the module guards so the
  // import POST fires at most once per browser.
  useEffect(() => {
    void importLegacyFolioOnce()
  }, [])

  const gateCheckedRef = useRef(false)
  useEffect(() => {
    if (!me || gateCheckedRef.current) return
    gateCheckedRef.current = true
    let live = true
    void listSubjects()
      .then((subjects) => {
        if (!live || subjects.length > 0) return
        if (window.location.hash === '#/threshold') return
        // Replace, not push: the Threshold is the landing, not a detour the
        // back button should return to.
        history.replaceState(null, '', '#/threshold')
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      })
      .catch(() => {
        // Fail-open — a profile-read hiccup never traps a returning user.
      })
    return () => {
      live = false
    }
  }, [me])

  return (
    <>
      {route.view !== 'threshold' && <TopNav route={route} me={me} />}
      {route.view === 'home' && <HomePage />}
      {route.view === 'node' && (
        <NodePage
          key={`${route.nodeId}:${route.childId ?? ''}`}
          nodeId={route.nodeId}
          initialChildId={route.childId}
          me={me}
        />
      )}
      {route.view === 'threshold' && <ThresholdPage />}
      {route.view === 'readings' && <ReadingLibraryPage me={me} readingId={route.readingId} />}
      {route.view === 'settings' && <SettingsPage me={me} />}
      {route.view === 'relationship-reading' && (
        <RelationshipReadingPage
          relationshipId={route.relationshipId}
          generationId={route.generationId}
          me={me}
        />
      )}
    </>
  )
}
