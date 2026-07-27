import { useCallback, useEffect, useMemo, useState } from 'react'
import { useHashRoute } from './hooks/useHashRoute'
import { useMe } from './hooks/useMe'
import { HomePage } from './pages/HomePage'
import { NodePage } from './pages/NodePage'
import { ThresholdPage } from './pages/ThresholdPage'
import { ReadingLibraryPage } from './pages/ReadingLibraryPage'
import { SettingsPage } from './pages/SettingsPage'
import { RelationshipReadingPage } from './pages/RelationshipReadingPage'
import { TopNav } from './components/chrome/TopNav'
import { AppShell } from './components/layout/AppShell'
import { importLegacyFolioOnce } from './lib/folioImport'
import { listSubjects } from './lib/subjectsApi'
import { useViewerContext } from './hooks/useViewerContext'
import {
  deriveExperience,
  INITIAL_SUBJECT_LIFECYCLE,
  type SubjectLifecycleState,
} from './lib/experience'

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
  const { me, loading: meLoading } = useMe()
  const viewerContext = useViewerContext(Boolean(me))
  const [subjectLifecycle, setSubjectLifecycle] =
    useState<SubjectLifecycleState>(INITIAL_SUBJECT_LIFECYCLE)
  // One-time legacy localStorage→D1 Folio import (T-048). CF Access guarantees
  // the user is authenticated before React mounts; the module guards so the
  // import POST fires at most once per browser.
  useEffect(() => {
    void importLegacyFolioOnce()
  }, [])

  useEffect(() => {
    if (!me) {
      setSubjectLifecycle(INITIAL_SUBJECT_LIFECYCLE)
      return
    }
    let live = true
    setSubjectLifecycle(INITIAL_SUBJECT_LIFECYCLE)
    void listSubjects()
      .then((subjects) => {
        if (live) {
          setSubjectLifecycle({
            status: 'ready',
            subjects,
            error: null,
          })
        }
      })
      .catch((error) => {
        if (!live) return
        setSubjectLifecycle({
          status: 'degraded',
          subjects: null,
          error:
            error instanceof Error
              ? error.message
              : 'Your saved profile could not be read.',
        })
      })
    return () => {
      live = false
    }
  }, [me])

  const experience = useMemo(
    () => deriveExperience(viewerContext, subjectLifecycle),
    [subjectLifecycle, viewerContext],
  )

  useEffect(() => {
    if (experience.lifecycle !== 'new' || route.view === 'threshold') return
    // Replace, not push: the Threshold is the new viewer's landing, not a
    // detour the back button should return to.
    history.replaceState(null, '', '#/threshold')
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }, [experience.lifecycle, route.view])

  const completeThreshold = useCallback(() => {
    setSubjectLifecycle({
      status: 'ready',
      subjects: [{ id: me ? `self:${me.id}` : 'self:current', role: 'self' }],
      error: null,
    })
  }, [me])

  if (route.view === 'threshold') {
    return <ThresholdPage onComplete={completeThreshold} />
  }

  // Do not paint an interactive returning-user map before the authenticated
  // identity and subject lifecycle have resolved. This is a short semantic
  // gate, not a second onboarding flow; new readers move directly from it to
  // Threshold once the empty self-profile state is known.
  const profilePending =
    meLoading
    || (Boolean(me) && subjectLifecycle.status === 'loading')
    || experience.lifecycle === 'new'

  return (
    <AppShell
      data-app-shell
      navigation={
        <TopNav
          route={route}
          me={me}
          operator={experience.operator}
        />
      }
      degradedNotice={
        experience.status === 'degraded' ? experience.notice : null
      }
    >
      {profilePending ? (
        <main
          id="main-content"
          data-experience-gate
          className="grid h-full min-h-[30rem] place-items-center px-6 text-center"
        >
          <div role="status" className="border-y border-gold/20 px-8 py-6">
            <p className="font-display text-[9px] uppercase tracking-[0.28em] text-gold">
              Opening the field
            </p>
            <p className="mt-3 font-serif text-lg text-parchment">
              Recalling your place in the map.
            </p>
          </div>
        </main>
      ) : (
        <>
          {route.view === 'home' && <HomePage experience={experience} />}
          {route.view === 'node' && (
            <NodePage
              key={`${route.nodeId}:${route.childId ?? ''}`}
              nodeId={route.nodeId}
              initialChildId={route.childId}
              me={me}
            />
          )}
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
      )}
    </AppShell>
  )
}
