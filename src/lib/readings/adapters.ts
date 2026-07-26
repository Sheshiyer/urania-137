import type { ReadingDTO, SaveReadingRequest } from '../api/contract'
import type { ThreadResult } from '../chat/resultMessages'
import { extractReadingElements, parseDeterministicPayload } from './elements'
import {
  ownerFromContext,
  subjectFromContext,
  type ReadingAdapterContext,
  type ReadingDocument,
  type ReadingEvidenceKind,
  type ReadingParticipantRef,
  type ReadingRelation,
} from './types'
import type { RelationshipStatus } from '../relationshipsApi'
import type { GrantedSynastryReading } from './relationshipReadings'

export interface ThreadReadingContext extends ReadingAdapterContext {
  title: string
  mode: string
  nodeId: string
  nodeLabel: string
  createdAt?: number
}

export interface GrantedSynastryContext extends ReadingAdapterContext {
  relationshipStatus: RelationshipStatus
  participants: readonly [ReadingParticipantRef, ReadingParticipantRef]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function synastryRelations(result: unknown): ReadingRelation[] {
  if (!isRecord(result) || !Array.isArray(result.relations)) return []
  return result.relations.flatMap((value, index): ReadingRelation[] => {
    if (!isRecord(value)) return []
    const from = text(value.from)
    const to = text(value.to)
    const relation = text(value.relation)
    if (!from || !to || !relation) return []
    return [{
      id: `synastry-relation-${index}`,
      from,
      to,
      relation,
      ...(text(value.measure) ? { measure: text(value.measure)! } : {}),
      ...(text(value.detail) ? { detail: text(value.detail)! } : {}),
      ...(text(value.status) ? { status: text(value.status)! } : {}),
    }]
  })
}

/**
 * Adapt the existing participant-grant response into the canonical reading
 * model. Access derives only from the returned grant row; relationship status
 * changes presentation from current to historical, never authorization.
 */
export function grantedSynastryToReadingDocument(
  reading: GrantedSynastryReading,
  context: GrantedSynastryContext,
): ReadingDocument {
  const result = isRecord(reading.result) ? reading.result : null
  const body = text(result?.assembled) ?? text(result?.narrative)
  const extracted = extractReadingElements(reading.result)
    .filter((element) => element.kind !== 'raw')
  const relations = synastryRelations(reading.result)
  if (relations.length) {
    extracted.push({
      id: 'synastry:named-relations',
      title: 'Named relations',
      kind: 'relations',
      sourceSystem: 'synastry',
      sourcePath: 'result.relations',
      evidenceKind: 'deterministic',
      confidence: 'derived',
      relations,
    })
  }
  const systems = Array.isArray(result?.engines_used)
    ? result.engines_used.filter((value): value is string => typeof value === 'string')
    : ['synastry']
  const [left, right] = context.participants
  return {
    id: reading.generationId,
    title: `${left.label} ↔ ${right.label}`,
    origin: 'relationship-grant',
    createdAt: Number.isFinite(Date.parse(reading.createdAt)) ? Date.parse(reading.createdAt) : null,
    mode: reading.mode,
    nodeId: 'compat',
    nodeLabel: 'Union Mirror',
    owner: ownerFromContext(context),
    subject: {
      id: reading.relationshipId,
      kind: 'dyad',
      label: `${left.label} ↔ ${right.label}`,
      relationshipLabel: 'Consented relationship',
      participants: context.participants,
    },
    access: {
      reason: 'participant-grant',
      state: context.relationshipStatus === 'active' ? 'current' : 'historical',
      visibility: reading.visibility,
      relationshipId: reading.relationshipId,
      grantedAt: reading.grantedAt,
      checksum: reading.responseSha256,
    },
    structureSource: 'flat',
    sections: [],
    body: body ?? 'The shared reading contains source-shaped evidence without a narrative field.',
    systems,
    evidence: [{
      id: 'participant-grant',
      label: context.relationshipStatus === 'active'
        ? 'Current participant grant'
        : 'Historical participant grant',
      detail: context.relationshipStatus === 'active'
        ? `Granted ${reading.grantedAt}`
        : `Granted ${reading.grantedAt} before relationship revocation`,
      kind: context.relationshipStatus === 'active' ? 'system' : 'historical',
      confidence: 'observed',
    }],
    patterns: [],
    moments: [],
    elements: extracted,
    sourcePayload: reading.result,
    bridgeQuestion: null,
    archive: { entryId: reading.generationId, favorite: false },
  }
}

function evidenceKindFor(result: ThreadResult): Exclude<ReadingEvidenceKind, 'retrieval' | 'historical'> {
  return result.kind === 'witness' ? 'witness' : 'deterministic'
}

/**
 * Adapt a completed conversational result without inventing structure.
 * Composing and failed results are presentation states, not documents.
 */
export function threadResultToReadingDocument(
  result: ThreadResult,
  context: ThreadReadingContext,
): ReadingDocument | null {
  if (result.status !== 'complete') return null

  const evidenceKind = evidenceKindFor(result)
  const native = result.structureSource === 'native'
  const flatBody = native ? null : result.chapters.map((chapter) => chapter.body).join('\n\n')
  const sourcePayload = result.sourcePayload

  return {
    id: `thread:${context.nodeId}:${context.mode}:${context.createdAt ?? 'current'}`,
    title: context.title,
    origin: 'live-chat',
    createdAt: context.createdAt ?? null,
    mode: context.mode,
    nodeId: context.nodeId,
    nodeLabel: context.nodeLabel,
    owner: ownerFromContext(context),
    subject: subjectFromContext(context),
    structureSource: result.structureSource,
    sections: native
      ? result.chapters.map((chapter) => ({
          ...chapter,
          evidenceKind,
        }))
      : [],
    body: flatBody,
    systems: result.systems,
    evidence: [
      {
        id: 'source',
        label: result.kind === 'witness' ? 'Witness synthesis' : result.kind === 'daily' ? 'Daily computation' : 'Engine computation',
        detail: result.footer ?? `${result.kind} result`,
        kind: evidenceKind,
        confidence: result.kind === 'witness' ? 'interpretive' : 'derived',
      },
      ...(result.warning
        ? [
            {
              id: 'engine-warning',
              label: 'Execution note',
              detail: result.warning,
              kind: 'system' as const,
              confidence: 'observed' as const,
            },
          ]
        : []),
    ],
    patterns: [],
    moments: [],
    elements: extractReadingElements(sourcePayload),
    sourcePayload,
    bridgeQuestion: null,
    archive: { entryId: null, favorite: false },
  }
}

/**
 * Adapt the frozen D1 contract honestly. ReadingDTO stores one flat body, so
 * this adapter emits no chapters and labels the structure source `flat`.
 */
export function folioEntryToReadingDocument(
  entry: ReadingDTO,
  context?: ReadingAdapterContext,
): ReadingDocument {
  const sourcePayload = parseDeterministicPayload(entry.content)
  return {
    id: `folio:${entry.id}`,
    title: entry.title,
    origin: 'folio',
    createdAt: entry.createdAt,
    mode: entry.mode,
    nodeId: entry.nodeId,
    nodeLabel: entry.nodeLabel,
    owner: ownerFromContext(context),
    subject: subjectFromContext(context),
    structureSource: 'flat',
    sections: [],
    body: entry.content,
    systems: [],
    evidence: [
      {
        id: 'archive-record',
        label: 'Folio record',
        detail: `${entry.nodeLabel} · ${entry.mode}`,
        kind: 'system',
        confidence: 'observed',
      },
    ],
    patterns: [],
    moments: [],
    elements: extractReadingElements(sourcePayload),
    sourcePayload,
    bridgeQuestion: null,
    archive: { entryId: entry.id, favorite: entry.favorite },
  }
}

/** Lossless return to the frozen ReadingDTO for Folio-origin documents. */
export function readingDocumentToFolioEntry(document: ReadingDocument): ReadingDTO {
  if (document.origin !== 'folio' || !document.archive.entryId || document.createdAt === null) {
    throw new Error('Only complete Folio-origin documents can return to ReadingDTO.')
  }
  return {
    id: document.archive.entryId,
    nodeId: document.nodeId,
    nodeLabel: document.nodeLabel,
    mode: document.mode,
    title: document.title,
    content:
      document.structureSource === 'flat'
        ? (document.body ?? '')
        : document.sections.map((section) => `## ${section.title}\n\n${section.body}`).join('\n\n'),
    createdAt: document.createdAt,
    favorite: document.archive.favorite,
  }
}

/** Canonical document → existing save contract, without changing the API. */
export function readingDocumentToSaveRequest(document: ReadingDocument): SaveReadingRequest {
  const entry =
    document.structureSource === 'flat'
      ? document.body ?? ''
      : document.sections.map((section) => `## ${section.title}\n\n${section.body}`).join('\n\n')
  return {
    nodeId: document.nodeId,
    nodeLabel: document.nodeLabel,
    mode: document.mode,
    title: document.title,
    content: entry,
  }
}
