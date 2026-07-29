import { useMemo, useRef } from 'react'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { ChatSheet } from '../components/chat/ChatSheet'
import { WitnessRun } from '../components/chat/WitnessRun'
import type { WitnessInterpretRequestBody } from '../components/chat/WitnessRun'
import { PageFrame } from '../components/layout/PageFrame'
import { AsyncBoundary } from '../components/ui/AsyncBoundary'
import { BeginReadingDialog } from '../components/readings/BeginReadingDialog'
import { getNodeById } from '../data/selemeneNodes'
import {
  buildConversationPath,
  navigate,
  type ConversationReturnPath,
} from '../hooks/useHashRoute'
import { useFolioState } from '../hooks/useFolio'
import { useReportGenerator } from '../hooks/useReportGenerator'
import { deriveFolioView, folioBoundaryState } from '../lib/readings/folioView'
import { witnessThreadResult } from '../lib/chat/resultMessages'
import type { SubmitPayload } from '../lib/chat/stateMachine'
import type { WitnessInterpretResult } from '../lib/readings/witnessContract'
import type { User, ApiError } from '../lib/api/contract'
import type { AssetGenerateRequest } from '../types'

/**
 * The route-owned conversation surface. When a `readingId` is present it
 * loads the owner-scoped canonical Folio reading through the existing
 * `/api/folio` list contract (the same one ReadingLibraryPage uses — there is
 * no separate single-reading GET route) and renders a focused WitnessRun chat
 * bound to that reading's id. Without a readingId, the original doorway
 * chooser + narrative onboarding ChatSheet remains: there is nothing to
 * witness yet.
 */

async function postInterpretation(body: WitnessInterpretRequestBody): Promise<WitnessInterpretResult> {
  const response = await fetch('/api/chat/interpret', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const errorBody = (await response.json()) as ApiError
      message = errorBody.message || errorBody.error || message
    } catch {
      /* non-JSON error body — keep the status message */
    }
    throw new Error(message)
  }
  return (await response.json()) as WitnessInterpretResult
}

function WitnessSection({ readingId, returnTo }: { readingId: string; returnTo: ConversationReturnPath }) {
  const { entries, status, error, httpStatus } = useFolioState()
  const view = useMemo(
    () =>
      deriveFolioView({
        status,
        entries,
        error,
        readingId,
        filtered: false,
      }),
    [entries, error, httpStatus, readingId, status],
  )
  const boundary = folioBoundaryState(view, () => undefined)

  return (
    <div
      data-conversation-route
      data-origin-reading-id={readingId}
      className="relative min-h-full bg-void"
    >
      <PageFrame />
      <main
        id="main-content"
        className="relative z-10 mx-auto flex min-h-[30rem] w-full max-w-5xl flex-col justify-center px-5 py-12 sm:px-10"
      >
        <p className="console-eyebrow">Urania · narrative instrument</p>
        <h1 className="mt-3 font-display text-3xl font-light tracking-[0.12em] text-parchment sm:text-5xl">
          Witness this reading
        </h1>

        <a
          href={`#${returnTo}`}
          className="mt-4 inline-flex min-h-11 w-fit items-center gap-2 font-display text-xs uppercase tracking-[0.18em] text-secondary transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {returnTo.startsWith('/readings') ? 'Return to Folio' : 'Return to map'}
        </a>

        <div className="mt-7 console-card p-5" aria-label="Conversation">
          <AsyncBoundary state={boundary}>
            {view.status === 'ready' && view.selected && (
              <>
                <p className="console-eyebrow">Continuing from Folio</p>
                <h2 className="mt-1 font-serif text-lg text-parchment">{view.selected.title}</h2>
                <p className="mt-1 text-xs text-secondary">
                  {view.selected.nodeLabel} · {view.selected.mode}
                </p>
                <div className="mt-5">
                  <WitnessRun readingId={view.selected.id} onSubmit={postInterpretation} />
                </div>
              </>
            )}
          </AsyncBoundary>
        </div>
      </main>
    </div>
  )
}

export function ConversationPage({
  nodeId,
  childId,
  readingId,
  returnTo,
  me,
}: {
  nodeId: string | null
  childId: string | null
  readingId: string | null
  returnTo: ConversationReturnPath
  me: User | null
}) {
  if (readingId) {
    return <WitnessSection readingId={readingId} returnTo={returnTo} />
  }

  const node = nodeId ? getNodeById(nodeId) : null
  const child = node?.children?.find((candidate) => candidate.id === childId)
  const narrativeChild = child?.run?.kind === 'witness' ? child : null
  const lastSubmitRef = useRef<AssetGenerateRequest | null>(null)
  const { generateReport, activeReport, saveError } = useReportGenerator()

  const close = () => navigate(returnTo)
  const chooseDoorway = (nextNodeId: string, nextChildId: string) => {
    navigate(buildConversationPath({
      nodeId: nextNodeId,
      childId: nextChildId,
      readingId,
      returnTo,
    }))
  }
  const handoff = (payload: SubmitPayload) => {
    if (!node || !('mode' in payload)) return
    lastSubmitRef.current = payload
    void generateReport(node, payload)
  }
  const retry = () => {
    if (!node || !lastSubmitRef.current) return
    void generateReport(node, lastSubmitRef.current)
  }
  const result = lastSubmitRef.current
    ? witnessThreadResult(activeReport, saveError)
    : null

  return (
    <div className="relative min-h-full bg-void" data-conversation-route>
      <PageFrame />
      <main
        id="main-content"
        className="relative z-10 mx-auto flex min-h-[30rem] w-full max-w-5xl flex-col justify-center px-5 py-12 sm:px-10"
      >
        <p className="console-eyebrow">Urania · narrative instrument</p>
        <h1 className="mt-3 font-display text-3xl font-light tracking-[0.12em] text-parchment sm:text-5xl">
          {narrativeChild ? narrativeChild.label : 'Begin in conversation'}
        </h1>
        <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-secondary">
          {narrativeChild
            ? `${node?.label ?? 'Witness'} opens as a focused narrator thread.`
            : 'Choose a real narrative doorway. The graph remains the map; this route holds the conversation.'}
        </p>

        <a
          href={`#${returnTo}`}
          className="mt-8 inline-flex min-h-11 w-fit items-center gap-2 font-display text-xs uppercase tracking-[0.18em] text-secondary transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          data-conversation-doorway={!narrativeChild ? 'true' : undefined}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {returnTo.startsWith('/readings') ? 'Return to Folio' : 'Return to map'}
        </a>

        {!narrativeChild && (
          <div className="mt-6 flex items-center gap-2 text-xs text-silver">
            <MessageCircle className="h-4 w-4 text-gold" aria-hidden="true" />
            Witness doorway chooser opening…
          </div>
        )}
      </main>

      <BeginReadingDialog
        open={!narrativeChild}
        conversationOnly
        onSelect={chooseDoorway}
        onClose={close}
      />

      {node && narrativeChild?.run?.kind === 'witness' && (
        <ChatSheet
          key={`${node.id}:${narrativeChild.id}`}
          seed={narrativeChild.run}
          childLabel={narrativeChild.label}
          nodeId={node.id}
          nodeLabel={node.label}
          owner={me}
          onClose={close}
          onHandoff={handoff}
          result={result}
          onRetryResult={retry}
        />
      )}
    </div>
  )
}
