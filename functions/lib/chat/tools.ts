/**
 * Structured-intake tool definitions for the narrator (Phase 1, W1-B — Narrator_Prompts).
 *
 * Pure-data module: no imports, no dependencies. Exports the OpenAI-compatible
 * function-calling definition for `record_intake(field, value)` — the ONLY
 * channel through which narrator turns land intake — plus the fallback note
 * appended to the system prompt when the turn runs without tool support.
 *
 * The field enum and value shapes mirror the canonical intake contract:
 * `AssetGenerateRequest` in `src/types/index.ts` (mirrored in
 * `functions/lib/chat/types.ts`). Every recorded slot is re-validated by the
 * story state machine (`src/lib/chat/stateMachine.ts`) before any
 * `intake_recorded` SSE event is emitted — the tool schema is the first gate,
 * never the last.
 */

// ---------------------------------------------------------------------------
// OpenAI-compatible tool definition shape (chat.completions `tools[]` item)
// ---------------------------------------------------------------------------

/** Minimal OpenAI-compatible function-calling tool definition. */
export interface ChatToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    /** JSON Schema (draft-07 subset) for the function arguments. */
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required: string[]
      additionalProperties: boolean
    }
  }
}

// ---------------------------------------------------------------------------
// The intake field vocabulary — exact slots of the intake contract
// ---------------------------------------------------------------------------

/**
 * Every intake slot the narrator may record, as dotted paths.
 *
 * `subjects.*` paths apply to the subject currently under the story machine's
 * cursor (`ChatSessionState.subjectIndex`); `relationship_context.*` and
 * top-level paths apply to the request as a whole. One tool call records
 * exactly one slot — the one-question-at-a-time discipline made structural.
 */
const INTAKE_FIELD_ENUM = [
  'mode',
  'report_level',
  'language',
  'consciousness_level',
  'subjects.role',
  'subjects.name',
  'subjects.birth_date',
  'subjects.birth_time',
  'subjects.birth_time_confidence',
  'subjects.birth_location_query',
  'subjects.normalized_location',
  'relationship_context.type',
  'relationship_context.mapping_goal',
  'relationship_context.sensitivity_level',
  'options',
] as const

const VALUE_DESCRIPTION = [
  'The slot value, shaped by field:',
  "- mode: string — only ever the seeded doorway mode (witness runs); recording it confirms the seed, never selects a new one.",
  "- report_level: one of 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'.",
  "- language: language code such as 'en' or 'hi' ('default' resolves to 'en').",
  '- consciousness_level: integer 0–5.',
  "- subjects.role: string such as 'primary' or 'partner'.",
  "- subjects.name: the subject's name exactly as given.",
  "- subjects.birth_date: strict 'YYYY-MM-DD', a real calendar date.",
  "- subjects.birth_time: strict 'HH:MM', 24-hour.",
  "- subjects.birth_time_confidence: 'exact' | 'approximate' | 'unknown'.",
  "- subjects.birth_location_query: free-text place, e.g. 'Madurai, India'.",
  '- subjects.normalized_location: { display_name: string, latitude: number, longitude: number, timezone: string, provider: string, confidence: string } — only when a geocoding result was explicitly selected.',
  "- relationship_context.type: 'family' | 'friends' | 'business-partners' | 'unmarried-partners' | 'married-partners' | 'custom' — never 'romantic'.",
  '- relationship_context.mapping_goal: what the map should illuminate between the patterns.',
  "- relationship_context.sensitivity_level: 'low' | 'medium' | 'high'.",
  "- options: object of run options, e.g. { intention: string } for intention-bearing workflows/engines, or { locationQuery: string | null } for the daily doorway.",
].join('\n')

// ---------------------------------------------------------------------------
// RECORD_INTAKE_TOOL — the only intake channel
// ---------------------------------------------------------------------------

/**
 * OpenAI-compatible tool definition for `record_intake(field, value)`.
 *
 * The narrator calls this once per answered question, only after the user's
 * answer matches the slot's required shape. Intake is NEVER parsed from prose:
 * if it didn't come through this tool and pass the state machine's validators,
 * it was never recorded.
 */
export const RECORD_INTAKE_TOOL: ChatToolDefinition = {
  type: 'function',
  function: {
    name: 'record_intake',
    description:
      'Record one schema-shaped intake slot of the onboarding request. This is the ONLY way intake is recorded — the narrator never asserts collected fields in prose. Call once per answered question, only after the user\u2019s answer matches the slot\u2019s required shape; the story state machine validates every call and rejects malformed values.',
    parameters: {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          enum: [...INTAKE_FIELD_ENUM],
          description:
            'Dotted intake slot path. `subjects.*` paths apply to the subject currently under the story machine\u2019s cursor; `relationship_context.*` and top-level paths apply to the request as a whole. One call records exactly one slot.',
        },
        value: {
          description: VALUE_DESCRIPTION,
        },
      },
      required: ['field', 'value'],
      additionalProperties: false,
    },
  },
}

// ---------------------------------------------------------------------------
// NARRATOR_FALLBACK_NOTE — appended when running without tool support
// ---------------------------------------------------------------------------

/**
 * Appended to the narrator system prompt when the turn runs without tool
 * support (provider without function calling, or tools stripped). Without
 * record_intake the narrator must NOT simulate recording: the turn handler
 * falls back to feeding the user's raw words to the state machine, so the
 * prose must never claim a slot landed.
 */
export const NARRATOR_FALLBACK_NOTE = [
  '## TOOL-LESS FALLBACK (in effect this turn)',
  'The record_intake tool is unavailable for this reply. Narrate conversationally only: ask the current chapter\u2019s single question and receive the user\u2019s answer with warmth, but NEVER state or imply that anything has been recorded, noted, saved, confirmed, or stored. The story machine records intake deterministically from the user\u2019s own words after your reply; your prose must never assert a field value as collected. When the tool returns, resume recording via record_intake immediately.',
].join('\n')
