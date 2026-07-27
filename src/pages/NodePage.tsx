import { useEffect, useRef, useState } from 'react'
import { getNodeById } from '../data/selemeneNodes'
import { SelemeneChild, AssetGenerateRequest, BirthData } from '../types'
import { useReportGenerator } from '../hooks/useReportGenerator'
import { useEngineStatus } from '../hooks/useEngineStatus'
import { useDeterministicRun } from '../hooks/useDeterministicRun'
import { useDailyReading } from '../hooks/useDailyReading'
import { ConstellationGraph } from '../components/ConstellationGraph'
import { InstrumentDialog } from '../components/ui/InstrumentDialog'
import { EngineStatusPanel } from '../components/panels/EngineStatusPanel'
import { MirrorPanel } from '../components/panels/MirrorPanel'
import { SankalpaPanel } from '../components/panels/SankalpaPanel'
import { PageHeader } from '../components/layout/PageHeader'
import { PageFrame } from '../components/layout/PageFrame'
import { StatFooter } from '../components/chrome/StatFooter'
import { PageTabs } from '../components/chrome/PageTabs'
import { BottomChrome } from '../components/chrome/BottomChrome'
import { CHROME } from '../components/chrome/insets'
import { navigate } from '../hooks/useHashRoute'
import { ChatSheet } from '../components/chat/ChatSheet'
import { useChatHandoff } from '../hooks/useChatHandoff'
import type { DailyLocation } from '../lib/daily/source'
import {
  dailyThreadResult,
  deterministicThreadResult,
  witnessThreadResult,
  type ThreadResult,
} from '../lib/chat/resultMessages'
import type { User } from '../lib/api/contract'
import { presentChild, presentNode } from '../lib/nodePresentation'

/** Phase 3: only the INFO modal remains — run children go through the chat. */
type ModalView = 'info' | null

/** The last handoff the chat fired — the retry affordance re-fires exactly this. */
type LastSubmit =
  | { kind: 'witness'; request: AssetGenerateRequest }
  | { kind: 'deterministic'; birth: BirthData; intention?: string }
  | { kind: 'daily'; location: DailyLocation | null }

/**
 * A parent-node page (`#/node/:id`): the node re-centers as a golden astrolabe
 * and its children orbit as labelled orbs. Clicking a run child opens the
 * narrative ChatSheet seeded with its ChildRun; on handoff the SAME submit
 * hooks the modal era used fire against the live Selemene engine, and the
 * reading renders in-thread as narrator chapters (Phase 3) while the Folio
 * save happens inside the hooks, unchanged.
 */
export function NodePage({
  nodeId,
  initialChildId,
  me,
}: {
  nodeId: string
  initialChildId?: string
  me: User | null
}) {
  const node = getNodeById(nodeId)!
  const presentation = presentNode(node)
  const [selectedChild, setSelectedChild] = useState<SelemeneChild | null>(null)
  const [modalView, setModalView] = useState<ModalView>(null)
  const [chatChild, setChatChild] = useState<SelemeneChild | null>(null)
  /** Which child the in-flight/last result belongs to — guards against a stale
   *  result surfacing inside a different child's fresh story. */
  const [resultChildId, setResultChildId] = useState<string | null>(null)
  const lastSubmitRef = useRef<LastSubmit | null>(null)
  const { generateReport, activeReport, saveError } = useReportGenerator()
  const engineStatus = useEngineStatus(node.id === 'engine')
  const det = useDeterministicRun()
  const daily = useDailyReading()
  const initialChildOpenedRef = useRef<string | null>(null)

  const openChild = (childId: string) => {
    const child = node.children?.find((c) => c.id === childId)
    if (!child) return
    // Supported saved/search/favorite doorways all converge on the canonical
    // Folio. The Folio owns filtering and detail; node modals never duplicate it.
    if (node.id === 'folio' && child.action) {
      navigate('/readings')
      return
    }
    // An open chat session for this child is already on screen — reselecting
    // must not remount/duplicate it (the backend create-or-resume dedupes by
    // seed anyway; this guard keeps the client from even re-dispatching).
    if (chatChild?.id === childId) return
    setSelectedChild(child)
    // Info children (no run) keep the info modal.
    if (child.info || !child.run) {
      setChatChild(null)
      setModalView('info')
      return
    }
    // Every run child opens the narrative chat sheet, seeded with its
    // ChildRun; any previous run's presentation state is cleared so a fresh
    // story never shows a stale result.
    det.reset()
    setModalView(null)
    setResultChildId(null)
    lastSubmitRef.current = null
    setChatChild(child)
  }

  useEffect(() => {
    if (!initialChildId || initialChildOpenedRef.current === initialChildId) return
    initialChildOpenedRef.current = initialChildId
    openChild(initialChildId)
  }, [initialChildId])

  const closeModal = () => {
    setModalView(null)
    setSelectedChild(null)
  }

  const closeChat = () => {
    setChatChild(null)
    setSelectedChild(null)
    setResultChildId(null)
    lastSubmitRef.current = null
    det.reset()
  }

  /**
   * Chat handoff (Phase 3) — the chat STAYS OPEN and the result renders in
   * the thread. Every sink is the exact hook call the retired modal forms
   * made; nothing about generateReport / det.run / daily.run / Folio
   * saveReport is reimplemented. The sinks only record which child + payload
   * the run belongs to so the result feed and the retry path stay coherent.
   */
  const handleChatHandoff = useChatHandoff({
    witness: (request) => {
      setResultChildId(chatChild?.id ?? null)
      lastSubmitRef.current = { kind: 'witness', request }
      void generateReport(node, request)
    },
    birth: (birth, intention) => {
      if (!chatChild?.run) return
      setResultChildId(chatChild.id)
      lastSubmitRef.current = { kind: 'deterministic', birth, intention }
      void det.run(node, chatChild.label, chatChild.run, birth, intention)
    },
    daily: (location) => {
      setResultChildId(chatChild?.id ?? null)
      lastSubmitRef.current = { kind: 'daily', location: location ?? null }
      if (location) daily.changeLocation(location)
      else void daily.run(daily.location)
    },
  })

  /** Re-fire the exact submit call that produced an in-thread error. */
  const retryResult = () => {
    const last = lastSubmitRef.current
    if (!last || !chatChild?.run) return
    if (last.kind === 'witness') void generateReport(node, last.request)
    else if (last.kind === 'deterministic') void det.run(node, chatChild.label, chatChild.run, last.birth, last.intention)
    else if (last.location) daily.changeLocation(last.location)
    else void daily.run(daily.location)
  }

  // Map the active hook's state to the in-thread result feed — but only while
  // the chat child that fired the run is the one on screen.
  const last = lastSubmitRef.current
  const result: ThreadResult | null =
    chatChild && resultChildId === chatChild.id && last
      ? last.kind === 'witness'
        ? witnessThreadResult(activeReport, saveError)
        : last.kind === 'deterministic'
          ? deterministicThreadResult(det, chatChild.label)
          : dailyThreadResult(daily)
      : null

  const nodeStats = [
    { label: 'Doorways', value: String(presentation.childCount) },
    { label: 'Runnable', value: String(presentation.runnableCount) },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-void">
      <ConstellationGraph
        wrapperClassName="fixed inset-0"
        orbitals={presentation.orbitals}
        selectedId={selectedChild?.id ?? null}
        onSelect={openChild}
        centerLabel={node.label}
        onHomeRequest={() => navigate('/')}
        ariaLabel={`${node.label} sub-node constellation`}
        topInset={CHROME.navAndTitle}
        bottomInset={CHROME.tabsAndFooter}
      />
      <PageHeader title={node.label} epithet={node.epithet} subtitle={node.description} onBack={() => navigate('/')} />
      <PageFrame />
      <BottomChrome>
        <StatFooter stats={nodeStats} />
        <PageTabs nodeId={node.id} />
      </BottomChrome>

      {/* Narrative chat onboarding — every run child. The reading renders
          in-thread after handoff; keyed so a new child always starts fresh. */}
      {chatChild?.run && (
        <ChatSheet
          key={chatChild.id}
          seed={chatChild.run}
          childLabel={chatChild.label}
          nodeId={node.id}
          nodeLabel={node.label}
          owner={me}
          onClose={closeChat}
          onHandoff={handleChatHandoff}
          result={result}
          onRetryResult={retryResult}
        />
      )}

      {/* Live panels — including the doors into the rest of the product */}
      <InstrumentDialog
        open={modalView === 'info'}
        title={selectedChild?.label ?? node.label}
        description={selectedChild ? presentChild(selectedChild, node.label).purpose : node.description}
        onClose={closeModal}
        dataNodeId={selectedChild?.id}
      >
        {selectedChild?.id === 'noesis-mirror' ? (
          <MirrorPanel />
        ) : selectedChild?.id === 'sankalpa' ? (
          <SankalpaPanel />
        ) : node.id === 'engine' ? (
          <EngineStatusPanel child={selectedChild} status={engineStatus} />
        ) : (
          <p className="leading-relaxed text-silver">
            {selectedChild
              ? presentChild(selectedChild, node.label).purpose
              : node.description}
          </p>
        )}
      </InstrumentDialog>
    </div>
  )
}
