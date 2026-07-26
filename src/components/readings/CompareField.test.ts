import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ReadingDocument } from '../../lib/readings'
import { CompareField } from './CompareField'

const dyad: ReadingDocument = {
  id: 'dyad',
  title: 'Asha and Bela',
  origin: 'folio',
  createdAt: 1_800_000_000_000,
  mode: 'synastry',
  nodeId: 'compat',
  nodeLabel: 'Union Mirror',
  owner: { id: null, email: null, label: 'Participant' },
  subject: {
    id: 'relationship-one',
    kind: 'dyad',
    label: 'Asha ↔ Bela',
    relationshipLabel: 'Consented relationship',
    participants: [
      { id: 'subject-a', label: 'Asha', role: 'inviter' },
      { id: 'subject-b', label: 'Bela', role: 'invitee' },
    ],
  },
  access: {
    reason: 'participant-grant',
    state: 'current',
    visibility: 'participant',
    relationshipId: 'relationship-one',
    grantedAt: '2026-07-27T00:00:01.000Z',
    checksum: 'a'.repeat(64),
  },
  structureSource: 'flat',
  sections: [],
  body: 'Shared narrative.',
  systems: ['synastry'],
  evidence: [],
  patterns: [],
  moments: [],
  elements: [{
    id: 'relation',
    kind: 'relations',
    title: 'Named relations',
    sourceSystem: 'synastry',
    sourcePath: 'result.relations',
    evidenceKind: 'deterministic',
    confidence: 'derived',
    relations: [{ id: 'edge', from: 'Asha', to: 'Bela', relation: 'trine' }],
  }],
  sourcePayload: null,
  bridgeQuestion: null,
  archive: { entryId: null, favorite: false },
}

describe('CompareField', () => {
  it('renders two sides with identical component order and visual weight', () => {
    const html = renderToStaticMarkup(createElement(CompareField, { document: dyad }))
    expect(html.match(/data-compare-side=/g)).toHaveLength(2)
    expect(html.match(/data-compare-weight="equal"/g)).toHaveLength(2)
    expect(html.match(/data-compare-order="identity,subject,grant"/g)).toHaveLength(2)
    expect(html.indexOf('Asha')).toBeLessThan(html.indexOf('Named relations'))
    expect(html.indexOf('Named relations')).toBeLessThan(html.lastIndexOf('Bela'))
  })

  it('renders nothing without a canonical participant grant', () => {
    const person = { ...dyad, subject: { ...dyad.subject, kind: 'person' as const } }
    const ownerOnly: ReadingDocument = {
      ...dyad,
      access: { reason: 'owner', state: 'current', visibility: 'owner' },
    }
    expect(renderToStaticMarkup(createElement(CompareField, { document: person }))).toBe('')
    expect(renderToStaticMarkup(createElement(CompareField, { document: ownerOnly }))).toBe('')
  })
})
