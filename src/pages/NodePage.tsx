import { useEffect, useRef, useState } from 'react'
import { getNodeById } from '../data/selemeneNodes'
import { SelemeneChild, AssetGenerateRequest } from '../types'
import { useReportGenerator } from '../hooks/useReportGenerator'
import { useEngineStatus } from '../hooks/useEngineStatus'
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
import { witnessThreadResult, type ThreadResult } from '../lib/chat/resultMessages'
import type { SubmitPayload } from '../lib/chat/stateMachine'
import type { User } from '../lib/api/contract'
import { presentChild, presentNode } from '../lib/nodePresentation'
import { resolveNodeEntry } from '../lib/nodeEntry'
import {
  NativeRunDialog,
  type NativeRun,
} from '../components/readings/NativeRunDialog'

/** Informational children retain the shared read-only instrument dialog. */
type ModalView = 'info' | null

/** The witness handoff remains retryable inside its narrative thread. */
type LastSubmit = { kind: 'witness'; request: AssetGenerateRequest }

function isNativeRunChild(
  child: SelemeneChild | null,
): child is SelemeneChild & { run: NativeRun } {
  return Boolean(
    child?.run
    && (
      child.run.kind === 'engine'
      || child.run.kind === 'workflow'
      || child.run.kind === 'daily'
    ),
  )
}

function findChildEntry(child: Pick<SelemeneChild, 'id' | 'label'>) {
  return [...document.querySelectorAll<HTMLElement | SVGElement>(
    '[data-graph-entry], [role="button"][aria-label]',
  )].find((element) => (
    element.getAttribute('data-graph-entry') === child.id
    || element.getAttribute('aria-label') === child.label
  )) ?? null
}

/**
 * A parent-node page (`#/node/:id`): the node re-centers as a golden astrolabe
 * and its children orbit as labelled orbs. Clicking a child opens the
 * interface declared by that capability. Witness readings retain narrator
 * chapters; deterministic and daily runs open a native instrument surface,
 * while every completion path retains its existing Folio persistence hook.
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
  const [nativeChild, setNativeChild] = useState<SelemeneChild | null>(null)
  /** Which child the in-flight/last result belongs to — guards against a stale
   *  result surfacing inside a different child's fresh story. */
  const [resultChildId, setResultChildId] = useState<string | null>(null)
  const lastSubmitRef = useRef<LastSubmit | null>(null)
  const { generateReport, activeReport, saveError } = useReportGenerator()
  const engineStatus = useEngineStatus(node.id === 'engine')
  const initialChildOpenedRef = useRef<string | null>(null)
  const childReturnFocusRef = useRef<HTMLElement | SVGElement | null>(null)

  const openChild = (childId: string) => {
    const child = node.children?.find((c) => c.id === childId)
    if (!child) return
    const entry = resolveNodeEntry(node.id, child)
    if (entry === 'folio') return navigate('/readings')
    if (entry === 'chat' && chatChild?.id === childId) return
    if (
      (entry === 'deterministic' || entry === 'daily')
      && nativeChild?.id === childId
    ) return

    childReturnFocusRef.current = findChildEntry(child)
    setSelectedChild(child)
    setChatChild(null)
    setNativeChild(null)
    setModalView(null)
    setResultChildId(null)
    lastSubmitRef.current = null

    if (entry === 'info') setModalView('info')
    else if (entry === 'chat') setChatChild(child)
    else setNativeChild(child)
  }

  useEffect(() => {
    if (!initialChildId) {
      initialChildOpenedRef.current = null
      setSelectedChild(null)
      setModalView(null)
      setChatChild(null)
      setNativeChild(null)
      setResultChildId(null)
      lastSubmitRef.current = null
      return
    }
    if (initialChildOpenedRef.current === initialChildId) return
    initialChildOpenedRef.current = initialChildId
    openChild(initialChildId)
  }, [initialChildId])

  const closeModal = () => {
    const deepLinkedChild = selectedChild && initialChildId === selectedChild.id
      ? { id: selectedChild.id, label: selectedChild.label }
      : null
    setModalView(null)
    setSelectedChild(null)
    if (deepLinkedChild) {
      navigate(`/node/${node.id}`)
    }
  }

  const closeChat = () => {
    setChatChild(null)
    setSelectedChild(null)
    setResultChildId(null)
    lastSubmitRef.current = null
  }

  const closeNative = () => {
    setNativeChild(null)
    setSelectedChild(null)
  }

  /** Only witness capabilities can mount ChatSheet, so only witness payloads
   * may cross this handoff. The discriminant check keeps a malformed resumed
   * session from invoking a deterministic path through narration. */
  const handleChatHandoff = (payload: SubmitPayload) => {
    if (!('mode' in payload)) return
    setResultChildId(chatChild?.id ?? null)
    lastSubmitRef.current = { kind: 'witness', request: payload }
    void generateReport(node, payload)
  }

  /** Re-fire the exact submit call that produced an in-thread error. */
  const retryResult = () => {
    const last = lastSubmitRef.current
    if (!last || !chatChild?.run) return
    void generateReport(node, last.request)
  }

  // Map the active hook's state to the in-thread result feed — but only while
  // the chat child that fired the run is the one on screen.
  const last = lastSubmitRef.current
  const result: ThreadResult | null =
    chatChild && resultChildId === chatChild.id && last
      ? witnessThreadResult(activeReport, saveError)
      : null

  const nodeStats = [
    { label: 'Doorways', value: String(presentation.childCount) },
    { label: 'Runnable', value: String(presentation.runnableCount) },
  ]

  return (
    <div className="relative h-full min-h-[30rem] overflow-hidden bg-void">
      <ConstellationGraph
        wrapperClassName="absolute inset-0"
        orbitals={presentation.orbitals}
        selectedId={selectedChild?.id ?? null}
        onSelect={openChild}
        centerLabel={node.label}
        onHomeRequest={() => navigate('/')}
        ariaLabel={`${node.label} sub-node constellation`}
        topInset={CHROME.nodeTitle}
        bottomInset={CHROME.tabsAndFooter}
      />
      <PageHeader title={node.label} epithet={node.epithet} subtitle={node.description} onBack={() => navigate('/')} />
      <PageFrame />
      <BottomChrome>
        <StatFooter stats={nodeStats} />
        <PageTabs nodeId={node.id} />
      </BottomChrome>

      {/* Witness narration is capability-specific, not the universal entry. */}
      {chatChild?.run?.kind === 'witness' && (
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

      {isNativeRunChild(nativeChild) && (
        <NativeRunDialog
          key={nativeChild.id}
          node={node}
          child={nativeChild}
          owner={me}
          onClose={closeNative}
        />
      )}

      {/* Read-only information panels. */}
      <InstrumentDialog
        open={modalView === 'info'}
        title={selectedChild?.label ?? node.label}
        description={selectedChild ? presentChild(selectedChild, node.label).purpose : node.description}
        onClose={closeModal}
        returnFocusRef={childReturnFocusRef}
        dataNodeId={selectedChild?.id}
        className={node.id === 'engine' ? 'sm:!max-w-3xl' : ''}
        bodyClassName={node.id === 'engine' ? 'flex-1 overflow-y-auto' : ''}
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
