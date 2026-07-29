/**
 * Server-authoritative orchestration seam for conversational reading
 * interpretation.
 *
 * There is no guaranteed public network orchestration service available to
 * this repo: the sibling `../witness-agents/packages/orchestration` contextual
 * interpretation handler is package-local (not a dependency of urania-137,
 * and not wired for cross-repo network calls). Rather than fabricate a fetch
 * to an endpoint that does not exist, this module defines an injectable
 * `OrchestrationTransport` seam and ships one real implementation — a thin
 * wrapper over the existing native, tested `interpretReading` model-port
 * handler (`./interpret.ts`). That IS "the existing native contextual
 * handler" this repo actually has. Swapping in a real remote orchestration
 * transport later is a drop-in `OrchestrationTransport` implementation; no
 * caller of `delegateInterpretation` needs to change.
 *
 * `delegateInterpretation` is also where depth (L0-L5) is enforced
 * server-side via `assembleContextPacket`/`permissionsForDepth`: L0 renders
 * the owned reading verbatim with zero transport/model invocation; L1+
 * delegates to the injected transport. The caller (the API route) never
 * passes client-supplied facts into the packet — only the server-loaded
 * `ReadingEvidenceSource` and the validated depth/question.
 */
import { assembleContextPacket } from '../context/assemble'
import type { InterpretationDepth } from '../context/types'
import { interpretReading } from './interpret'
import { resolveInterpretationAgent } from './registry'
import type {
  InterpretationModelPort,
  InterpretationRequest,
  InterpretationResponse,
  InterpretationRoute,
  ReadingEvidenceSource,
} from './types'

export interface OrchestrationDelegateInput {
  readingId: string
  ownerRef: string
  route: InterpretationRoute
  question: string
  depth: InterpretationDepth
  reading: ReadingEvidenceSource
  /** The reading's own creation timestamp (unix ms) — never an invented epoch. */
  readingCreatedAt: number
}

export interface OrchestrationDelegateResult {
  response: InterpretationResponse
  contextPacketHash: string
  factLockHash: string
  sourceRefs: string[]
}

/** Injectable delegation seam. Tests provide a fake; production wraps the native handler. */
export interface OrchestrationTransport {
  readonly id: string
  interpret(input: {
    request: InterpretationRequest
    reading: ReadingEvidenceSource
  }): Promise<InterpretationResponse>
}

/** The one real transport this repo has: the existing model-port-backed handler. */
export function createNativeOrchestrationTransport(
  model: InterpretationModelPort,
): OrchestrationTransport {
  return {
    id: 'native-interpret-reading',
    interpret: (input) => interpretReading({ ...input, model }),
  }
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** L0: verbatim source rendering, zero model/transport invocation by construction. */
function deterministicL0Response(
  request: InterpretationRequest,
  reading: ReadingEvidenceSource,
): InterpretationResponse {
  const agent = resolveInterpretationAgent(request.route)
  if (!agent) throw new Error('unreachable: validated interpretation route has no agent')
  return {
    route: request.route,
    agentId: agent.id,
    answer: reading.content,
    claims: [],
    question: null,
    targets: [{ kind: 'reading', nodeId: reading.nodeId, label: `Return to ${reading.title}` }],
    provenance: {
      readingId: reading.id,
      nodeId: reading.nodeId,
      agentId: agent.id,
      evidenceIds: [],
      model: 'none',
    },
    degraded: false,
  }
}

/**
 * Assemble an owner-scoped ContextPacketV1 from the already server-loaded
 * reading (never from client input), enforce depth bounds, render L0
 * deterministically, and delegate L1+ to the injected transport. Returns the
 * hashes the caller persists — always server-computed, never accepted from
 * the client.
 */
export async function delegateInterpretation(
  input: OrchestrationDelegateInput,
  transport: OrchestrationTransport,
): Promise<OrchestrationDelegateResult> {
  const packetResult = assembleContextPacket({
    readingId: input.readingId,
    ownerRef: input.ownerRef,
    subjectRefs: [input.ownerRef],
    interpretationDepth: input.depth,
    consciousnessLevel: 1,
    question: input.question,
    current: {
      sourceId: `reading:${input.readingId}`,
      engineId: input.reading.mode,
      engineVersion: '1',
      inputHash: await sha256Hex(input.reading.id),
      resultHash: await sha256Hex(input.reading.content),
      calculatedAt: new Date(input.readingCreatedAt).toISOString(),
      payload: input.reading.content,
    },
  })
  if (!packetResult.ok) {
    throw new Error(`orchestration-client: ${packetResult.error}`)
  }
  const packet = packetResult.packet
  const contextPacketHash = await sha256Hex(JSON.stringify(packet))

  // Client-supplied history is deliberately never forwarded — the request
  // rebuilt here always carries an empty history regardless of what the
  // caller's raw body contained.
  const request: InterpretationRequest = {
    readingId: input.readingId,
    route: input.route,
    question: input.question,
    history: [],
  }

  const response =
    input.depth === 0
      ? deterministicL0Response(request, input.reading)
      : await transport.interpret({ request, reading: input.reading })

  const sourceRefs =
    response.provenance.evidenceIds.length > 0
      ? response.provenance.evidenceIds
      : [`reading:${input.readingId}`]
  const factLockHash = await sha256Hex(
    JSON.stringify({ readingId: input.readingId, sourceRefs: [...sourceRefs].sort() }),
  )

  return { response, contextPacketHash, factLockHash, sourceRefs }
}
