import { describe, expect, it } from 'vitest'
import type { ReadingDTO } from '../api/contract'
import type { ThreadResult } from '../chat/resultMessages'
import {
  folioEntryToReadingDocument,
  grantedSynastryToReadingDocument,
  readingDocumentToFolioEntry,
  readingDocumentToSaveRequest,
  threadResultToReadingDocument,
} from './adapters'
import type { GrantedSynastryReading } from './relationshipReadings'

const owner = { id: 'owner-1', email: 'owner@example.test', label: 'Owner' }
const subject = { id: 'subject-7', kind: 'person' as const, label: 'Subject Seven' }

const folioEntry: ReadingDTO = {
  id: 'reading-1',
  nodeId: 'noesis',
  nodeLabel: 'Noesis Reading',
  mode: 'integrated-kundali-l0',
  title: 'Noesis Reading — L0',
  content: '# Stored body\n\nNo section contract was archived.',
  createdAt: 1_785_000_000_000,
  favorite: true,
}

describe('canonical reading adapters', () => {
  it('keeps owner and subject as distinct non-nullable references', () => {
    const document = folioEntryToReadingDocument(folioEntry, { owner, subject })
    expect(document.owner).toEqual(owner)
    expect(document.subject).toEqual(subject)
    expect(document.owner).not.toBe(document.subject)
  })

  it('keeps a flat Folio row flat and does not invent sections', () => {
    const document = folioEntryToReadingDocument(folioEntry, { owner, subject })
    expect(document.structureSource).toBe('flat')
    expect(document.sections).toEqual([])
    expect(document.body).toBe(folioEntry.content)
  })

  it('round-trips a Folio row without data loss', () => {
    const document = folioEntryToReadingDocument(folioEntry, { owner, subject })
    expect(readingDocumentToFolioEntry(document)).toEqual(folioEntry)
  })

  it('preserves native thread sections and exact system identifiers', () => {
    const result: ThreadResult = {
      kind: 'witness',
      status: 'complete',
      structureSource: 'native',
      chapters: [
        { id: 'opening', title: 'Opening', body: 'The chart begins here.' },
        { id: 'field', title: 'Structural Field', body: 'A second source-supplied pass.' },
      ],
      systems: ['jyotish', 'numerology'],
      error: null,
      saveError: null,
      footer: 'Engines: jyotish, numerology · register l0',
      sourcePayload: null,
    }
    const document = threadResultToReadingDocument(result, {
      title: 'Noesis Reading',
      mode: 'integrated-kundali-l0',
      nodeId: 'noesis',
      nodeLabel: 'Noesis Reading',
      owner,
      subject,
    })
    expect(document?.structureSource).toBe('native')
    expect(document?.sections.map((section) => section.id)).toEqual(['opening', 'field'])
    expect(document?.systems).toEqual(['jyotish', 'numerology'])
    expect(document?.body).toBeNull()
  })

  it('keeps deterministic thread output unstructured through the save adapter', () => {
    const result: ThreadResult = {
      kind: 'deterministic',
      status: 'complete',
      structureSource: 'flat',
      chapters: [{ id: 'jyotish', title: 'Birth Blueprint', body: '```json\n{"lagna":"Leo"}\n```' }],
      systems: ['jyotish'],
      error: null,
      saveError: null,
      sourcePayload: { engine_id: 'jyotish', result: { lagna: 'Leo' } },
    }
    const document = threadResultToReadingDocument(result, {
      title: 'Birth Blueprint',
      mode: 'birth-blueprint',
      nodeId: 'birth',
      nodeLabel: 'Birth Witness',
      owner,
      subject,
    })
    expect(document?.sections).toEqual([])
    expect(document?.body).toBe(result.chapters[0].body)
    expect(document?.elements).toHaveLength(1)
    expect(document?.elements[0]).toMatchObject({ kind: 'raw', sourceSystem: 'jyotish' })
    expect(document && readingDocumentToSaveRequest(document).content).toBe(result.chapters[0].body)
  })

  it('rehydrates explicit deterministic Folio JSON without manufacturing sections', () => {
    const payload = {
      engine_id: 'numerology',
      result: { life_path: { value: 7, reduction_chain: [34, 7], meaning: 'Source meaning.' } },
    }
    const entry = {
      ...folioEntry,
      mode: 'engine:numerology',
      content: `## Numerology\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`,
    }
    const document = folioEntryToReadingDocument(entry, { owner, subject })
    expect(document.structureSource).toBe('flat')
    expect(document.sections).toEqual([])
    expect(document.sourcePayload).toEqual(payload)
    expect(document.elements[0]).toMatchObject({ kind: 'number-codes', sourceSystem: 'numerology' })
    expect(readingDocumentToFolioEntry(document)).toEqual(entry)
  })

  it('does not create documents from composing or failed presentation states', () => {
    const result: ThreadResult = {
      kind: 'daily',
      status: 'composing',
      structureSource: 'flat',
      chapters: [],
      systems: [],
      error: null,
      saveError: null,
      sourcePayload: null,
    }
    expect(
      threadResultToReadingDocument(result, {
        title: 'Sky Weather',
        mode: 'daily-panchanga',
        nodeId: 'transit',
        nodeLabel: 'Sky Weather',
      }),
    ).toBeNull()
  })

  it('adapts only an explicit participant grant into a checksum-bound dyad', () => {
    const granted: GrantedSynastryReading = {
      generationId: 'generation-one',
      relationshipId: 'relationship-one',
      mode: 'synastry',
      responseSha256: 'c'.repeat(64),
      result: {
        assembled: 'A shared field.',
        engines_used: ['synastry', 'jyotish'],
        relations: [{ from: 'Asha', to: 'Bela', relation: 'trine' }],
        secret: 'kept behind privacy filtering',
      },
      visibility: 'participant',
      createdAt: '2026-07-27T00:00:00.000Z',
      grantedAt: '2026-07-27T00:00:01.000Z',
    }
    const document = grantedSynastryToReadingDocument(granted, {
      relationshipStatus: 'revoked',
      owner,
      participants: [
        { id: 'subject-a', label: 'Asha', role: 'inviter' },
        { id: 'subject-b', label: 'Bela', role: 'invitee' },
      ],
    })

    expect(document.subject.kind).toBe('dyad')
    expect(document.subject.participants).toHaveLength(2)
    expect(document.body).toBe('A shared field.')
    expect(document.access).toEqual({
      reason: 'participant-grant',
      state: 'historical',
      visibility: 'participant',
      relationshipId: 'relationship-one',
      grantedAt: granted.grantedAt,
      checksum: granted.responseSha256,
    })
    expect(document.elements.some((element) => element.kind === 'relations')).toBe(true)
  })
})
