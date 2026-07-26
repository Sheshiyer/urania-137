import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ReadingDocument } from '../lib/readings'
import { RelationshipReadingView } from './RelationshipReadingPage'

function document(state: 'current' | 'historical'): ReadingDocument {
  return {
    id: 'generation-one',
    title: 'Asha ↔ Bela',
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
      participants: [
        { id: 'subject-a', label: 'Asha', role: 'inviter' },
        { id: 'subject-b', label: 'Bela', role: 'invitee' },
      ],
    },
    access: {
      reason: 'participant-grant',
      state,
      visibility: 'participant',
      relationshipId: 'relationship-one',
      grantedAt: '2026-07-27T00:00:00.000Z',
      checksum: 'a'.repeat(64),
    },
    structureSource: 'flat',
    sections: [],
    body: 'Shared reading.',
    systems: ['synastry'],
    evidence: [],
    patterns: [],
    moments: [],
    elements: [],
    sourcePayload: null,
    bridgeQuestion: null,
    archive: { entryId: null, favorite: false },
  }
}

describe('RelationshipReadingView', () => {
  it('keeps loading, error, and denied states exclusive', () => {
    for (const state of [
      { status: 'loading' as const, message: 'Loading grant…' },
      { status: 'error' as const, message: 'Grant unavailable' },
      { status: 'denied' as const, message: 'No participant grant' },
    ]) {
      const html = renderToStaticMarkup(createElement(RelationshipReadingView, {
        state,
        document: null,
      }))
      expect(html.match(/data-async-state=/g)).toHaveLength(1)
      expect(html).not.toContain('data-reading-layer="reading"')
    }
  })

  it('renders a current grant and labels an historical grant honestly', () => {
    const current = renderToStaticMarkup(createElement(RelationshipReadingView, {
      state: { status: 'ready' },
      document: document('current'),
    }))
    const historical = renderToStaticMarkup(createElement(RelationshipReadingView, {
      state: { status: 'ready' },
      document: document('historical'),
    }))
    expect(current).toContain('Current participant grant')
    expect(historical).toContain('historical · granted before revocation')
    expect(historical.match(/data-reading-layer="reading"/g)).toHaveLength(1)
  })

  it('fails closed if ready state does not carry a participant-granted dyad', () => {
    const invalid = { ...document('current'), access: undefined }
    const html = renderToStaticMarkup(createElement(RelationshipReadingView, {
      state: { status: 'ready' },
      document: invalid,
    }))
    expect(html).toContain('data-async-state="denied"')
    expect(html).not.toContain('Shared reading.')
  })
})
