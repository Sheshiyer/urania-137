import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useHashRoute } from './hooks/useHashRoute'
import { useMe } from './hooks/useMe'
import { HomePage } from './pages/HomePage'
import { NodePage } from './pages/NodePage'
import { ThresholdPage } from './pages/ThresholdPage'
import { ReadingLibraryPage } from './pages/ReadingLibraryPage'
import { SettingsPage } from './pages/SettingsPage'
import { RelationshipReadingPage } from './pages/RelationshipReadingPage'
import { ConversationPage } from './pages/ConversationPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { TopNav } from './components/chrome/TopNav'
import { AppShell } from './components/layout/AppShell'
import { ArrivalGate } from './components/layout/ArrivalGate'
import { ReauthInterstitial } from './components/layout/ReauthInterstitial'
import { AppErrorBoundary } from './components/layout/AppErrorBoundary'
import { importLegacyFolioOnce } from './lib/folioImport'
import { listSubjects } from './lib/subjectsApi'
import { useViewerContext } from './hooks/useViewerContext'
import {
  deriveExperience,
  INITIAL_SUBJECT_LIFECYCLE,
  type SubjectLifecycleState,
} from './lib/experience'

// The operator data browser is a rare surface; it loads as its own chunk.
const AdminDataBrowserPage = lazy(() =>
  import('./pages/AdminDataBrowserPage').then((module) => ({ default: module.AdminDataBrowserPage })),
)

/** Where a new reader was headed before the Threshold took over. */
const THRESHOLD_RETURN_KEY = 'urania137.threshold.return.v1'

function rememberThresholdReturn(hash: string) {
  try {
    if (hash && hash !== '#/' && hash !== '#/threshold') sessionStorage.setItem(THRESHOLD_RETURN_KEY, hash)
  } catch {
    /* storage unavailable — the map is the fallback */
  }
}

function takeThresholdReturn(): string | null {
  try {
    const value = sessionStorage.getItem(THRESHOLD_RETURN_KEY)
    sessionStorage.removeItem(THRESHOLD_RETURN_KEY)
    return value
  } catch {
    return null
  }
}

/**
 * Urania 137 is a multi-page stellar console. A hash router renders the galactic
 * home (`#/`), a parent-node page (`#/node/:id`), the conversation route
 * (`#/chat`), the Folio, Settings, or the pre-graph Threshold (`#/threshold`);
 * the graph is the primary way in, with the masthead as an additive
 * convenience layer. See ISA + README.
 *
 * First-run splice (W2-B): once `useMe` resolves, a caller with NO subject
 * profiles has not crossed the Threshold and is replaced to `#/threshold`
 * before the graph can paint as their landing view. The address they were
 * headed for is remembered and restored after the Crossing. Returning users
 * (a stored `self` row) never see the redirect. Fail-open: a subjects-endpoint
 * error leaves the user on the graph rather than trapping them.
 */
export default function App() {
  const route = useHashRoute()
  // Signed-in identity for the app chrome (T-024/T-025): CF Access owns the
  // session cookie, so useMe just reads GET /api/me once on mount.
  const { me, loading: meLoading, error: meError } = useMe()
  const viewerContext = useViewerContext(Boolean(me))
  const [subjectLifecycle, setSubjectLifecycle] =
    useState<SubjectLifecycleState>(INITIAL_SUBJECT_LIFECYCLE)
  // One-time legacy localStorage→D1 Folio import (T-048). CF Access guarantees
  // the user is authenticated before React mounts; the module guards so the
  // import POST fires at most once per browser.
  useEffect(() => {
    void importLegacyFolioOnce()
  }, [])

  const loadSubjects = useCallback((reset: boolean) => {
    let live = true
    if (reset) setSubjectLifecycle(INITIAL_SUBJECT_LIFECYCLE)
    void listSubjects()
      .then((subjects) => {
        if (live) setSubjectLifecycle({ status: 'ready', subjects, error: null })
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
  }, [])

  useEffect(() => {
    if (!me) {
      setSubjectLifecycle(INITIAL_SUBJECT_LIFECYCLE)
      return
    }
    return loadSubjects(true)
  }, [loadSubjects, me])

  const experience = useMemo(
    () => deriveExperience(viewerContext, subjectLifecycle),
    [subjectLifecycle, viewerContext],
  )

  useEffect(() => {
    if (experience.lifecycle !== 'new' || route.view === 'threshold') return
    // Replace, not push: the Threshold is the new viewer's landing, not a
    // detour the back button should return to. Remember where they were going.
    rememberThresholdReturn(window.location.hash)
    history.replaceState(null, '', '#/threshold')
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }, [experience.lifecycle, route.view])

  const completeThreshold = useCallback(() => {
    // Optimistic: the Crossing must unlock now. The authoritative row is then
    // re-read from the server rather than fabricated for the rest of the session.
    setSubjectLifecycle({
      status: 'ready',
      subjects: [{ id: me ? `self:${me.id}` : 'self:current', role: 'self' }],
      error: null,
    })
    loadSubjects(false)
    const returnTo = takeThresholdReturn()
    if (returnTo) {
      history.replaceState(null, '', returnTo)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
  }, [loadSubjects, me])

  if (route.view === 'threshold') {
    return (
      <AppShell
        navigation={
          <nav className="flex items-center justify-between px-5 py-2.5 font-display text-[10px] uppercase sm:px-8" aria-label="Threshold navigation">
            <span className="font-medium tracking-[0.28em] text-gold">Urania 137</span>
            <a href="/api/logout" className="tracking-[0.18em] text-silver transition-colors hover:text-parchment">Leave the field</a>
          </nav>
        }
        degradedNotice={experience.status === 'degraded' ? experience.notice : null}
        variant="threshold"
      >
        <ThresholdPage onComplete={completeThreshold} />
      </AppShell>
    )
  }

  // Do not paint an interactive returning-user map before the authenticated
  // identity and subject lifecycle have resolved. Only the map-shaped routes
  // wait: Folio, Settings and the operator pages carry their own boundaries.
  // New readers move directly from this beat to the Threshold once the empty
  // self-profile state is known.
  const mapShaped = route.view === 'home' || route.view === 'node' || route.view === 'chat'
  const profilePending =
    mapShaped
    && (
      meLoading
      || (Boolean(me) && subjectLifecycle.status === 'loading')
      || experience.lifecycle === 'new'
    )

  const routeKey =
    route.view === 'not-found' ? route.hash : typeof window !== 'undefined' ? window.location.hash : route.view

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
      <AppErrorBoundary resetKey={routeKey}>
        {meError && !me ? (
          <ReauthInterstitial message={meError} />
        ) : profilePending ? (
          <ArrivalGate />
        ) : (
          <>
            {route.view === 'home' && <HomePage experience={experience} />}
            {route.view === 'node' && (
              <NodePage
                key={route.nodeId}
                nodeId={route.nodeId}
                initialChildId={route.childId}
                surface={route.surface ?? null}
                me={me}
              />
            )}
            {route.view === 'chat' && (
              <ConversationPage
                key={`${route.nodeId ?? 'choose'}:${route.childId ?? 'doorway'}:${route.readingId ?? 'new'}`}
                nodeId={route.nodeId}
                childId={route.childId}
                readingId={route.readingId}
                returnTo={route.returnTo}
                me={me}
              />
            )}
            {route.view === 'readings' && (
              <ReadingLibraryPage me={me} readingId={route.readingId} query={route.query} />
            )}
            {route.view === 'settings' && <SettingsPage me={me} section={route.section} />}
            {route.view === 'admin-data' && (
              <Suspense fallback={<ArrivalGate line="Opening the operator record." />}>
                <AdminDataBrowserPage me={me} section={route.section} recordId={route.recordId} />
              </Suspense>
            )}
            {route.view === 'relationship-reading' && (
              <RelationshipReadingPage
                relationshipId={route.relationshipId}
                generationId={route.generationId}
                me={me}
              />
            )}
            {route.view === 'not-found' && <NotFoundPage hash={route.hash} />}
          </>
        )}
      </AppErrorBoundary>
    </AppShell>
  )
}
