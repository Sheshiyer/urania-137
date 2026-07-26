import { isInterpretationRoute } from './registry'
import type {
  InterpretationEvidence,
  InterpretationHistoryTurn,
  InterpretationRequest,
  ReadingEvidenceSource,
} from './types'

const MAX_READING_ID = 256
const MAX_QUESTION = 2_000
const MAX_HISTORY_TURNS = 8
const MAX_HISTORY_CONTENT = 2_000
const MAX_EVIDENCE_EXCERPTS = 12
const MAX_EXCERPT_LENGTH = 900
const MAX_EVIDENCE_TOTAL = 8_000

export type RequestValidation =
  | { ok: true; value: InterpretationRequest }
  | { ok: false; error: string }

function isHistoryTurn(value: unknown): value is InterpretationHistoryTurn {
  if (typeof value !== 'object' || value === null) return false
  const turn = value as Record<string, unknown>
  return (
    (turn.role === 'user' || turn.role === 'assistant') &&
    typeof turn.content === 'string' &&
    turn.content.trim().length > 0 &&
    turn.content.length <= MAX_HISTORY_CONTENT
  )
}

export function validateInterpretationRequest(value: unknown): RequestValidation {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, error: 'expects a JSON object body' }
  }
  const body = value as Record<string, unknown>
  if (
    typeof body.readingId !== 'string' ||
    body.readingId.trim().length === 0 ||
    body.readingId.length > MAX_READING_ID
  ) {
    return { ok: false, error: 'readingId must be a non-empty bounded string' }
  }
  if (!isInterpretationRoute(body.route)) {
    return {
      ok: false,
      error: 'route must be one of: pattern, embodied, synthesis, navigate',
    }
  }
  if (
    typeof body.question !== 'string' ||
    body.question.trim().length === 0 ||
    body.question.length > MAX_QUESTION
  ) {
    return { ok: false, error: 'question must be a non-empty string of at most 2000 characters' }
  }
  const history = body.history === undefined ? [] : body.history
  if (
    !Array.isArray(history) ||
    history.length > MAX_HISTORY_TURNS ||
    !history.every(isHistoryTurn)
  ) {
    return {
      ok: false,
      error: 'history must contain at most 8 bounded user or assistant turns',
    }
  }
  return {
    ok: true,
    value: {
      readingId: body.readingId.trim(),
      route: body.route,
      question: body.question.trim(),
      history: history.map((turn) => ({
        role: turn.role,
        content: turn.content.trim(),
      })),
    },
  }
}

function excerptId(readingId: string, index: number): string {
  return `reading:${encodeURIComponent(readingId)}:excerpt:${index}`
}

function contentBlocks(content: string): string[] {
  return content
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
}

/**
 * Project an owned reading into a bounded, stable evidence packet. Content is
 * kept as data; the prompt layer wraps these excerpts as untrusted evidence.
 */
export function projectReadingEvidence(source: ReadingEvidenceSource): InterpretationEvidence[] {
  const evidence: InterpretationEvidence[] = [
    {
      id: excerptId(source.id, 0),
      sourcePath: `readings.${source.id}.metadata`,
      label: source.title,
      text: `${source.nodeLabel} · ${source.mode}`,
      kind: 'reading-metadata',
    },
  ]
  let used = evidence[0].text.length
  const blocks = contentBlocks(source.content)

  for (let i = 0; i < blocks.length && evidence.length < MAX_EVIDENCE_EXCERPTS; i += 1) {
    const remaining = MAX_EVIDENCE_TOTAL - used
    if (remaining <= 0) break
    const text = blocks[i].slice(0, Math.min(MAX_EXCERPT_LENGTH, remaining))
    if (!text) continue
    const index = evidence.length
    evidence.push({
      id: excerptId(source.id, index),
      sourcePath: `readings.${source.id}.content.blocks[${i}]`,
      label: `Reading excerpt ${index}`,
      text,
      kind: 'reading-content',
    })
    used += text.length
  }
  return evidence
}
