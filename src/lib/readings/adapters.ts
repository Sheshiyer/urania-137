import type { ReadingDTO, SaveReadingRequest } from '../api/contract'
import type { ThreadResult } from '../chat/resultMessages'
import { extractReadingElements, parseDeterministicPayload } from './elements'
import {
  ownerFromContext,
  subjectFromContext,
  type ReadingAdapterContext,
  type ReadingDocument,
  type ReadingEvidenceKind,
} from './types'

export interface ThreadReadingContext extends ReadingAdapterContext {
  title: string
  mode: string
  nodeId: string
  nodeLabel: string
  createdAt?: number
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
