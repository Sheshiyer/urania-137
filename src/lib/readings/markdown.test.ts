import { describe, expect, it } from 'vitest'
import { parseReadingBody } from './markdown'

describe('stored reading Markdown parser', () => {
  it('renders archived headings and paragraphs as blocks', () => {
    expect(parseReadingBody('# Reading\n\nA first paragraph.\n\n## Source boundary\n\nA second paragraph.')).toEqual([
      { kind: 'heading', level: 1, text: 'Reading' },
      { kind: 'paragraph', text: 'A first paragraph.' },
      { kind: 'heading', level: 2, text: 'Source boundary' },
      { kind: 'paragraph', text: 'A second paragraph.' },
    ])
  })

  it('keeps fenced deterministic JSON intact and records its language', () => {
    expect(parseReadingBody('```json\n{\n  "lagna": "Leo"\n}\n```')).toEqual([
      { kind: 'code', language: 'json', text: '{\n  "lagna": "Leo"\n}' },
    ])
  })

  it('groups adjacent ordered and unordered list items', () => {
    expect(parseReadingBody('- one\n- two\n\n1. first\n2. second')).toEqual([
      { kind: 'list', ordered: false, items: ['one', 'two'] },
      { kind: 'list', ordered: true, items: ['first', 'second'] },
    ])
  })
})
