import type {
  InterpretationAgentDefinition,
  InterpretationAgentId,
  InterpretationRoute,
} from './types'

/**
 * The interpretation routes form a closed vocabulary. There is deliberately
 * no "general" route and no implicit default agent.
 */
export const INTERPRETATION_ROUTES = [
  'pattern',
  'embodied',
  'synthesis',
  'navigate',
] as const satisfies readonly InterpretationRoute[]

export const INTERPRETATION_AGENTS: Readonly<
  Record<InterpretationRoute, InterpretationAgentDefinition>
> = {
  pattern: {
    id: 'aletheios',
    route: 'pattern',
    intent: 'Reflect source-visible patterns and tensions in an owned reading.',
    posture: 'Precise, provisional, non-prescriptive pattern reflection.',
    allowedEvidence: ['owned-reading'],
    allowedTools: [],
  },
  embodied: {
    id: 'pichet',
    route: 'embodied',
    intent: 'Connect source-visible patterns to the caller’s present felt inquiry.',
    posture: 'Invitational embodied noticing without instruction or diagnosis.',
    allowedEvidence: ['owned-reading'],
    allowedTools: [],
  },
  synthesis: {
    id: 'synthesis',
    route: 'synthesis',
    intent: 'Relate already-grounded observations without originating new facts.',
    posture: 'Transparent synthesis that labels interpretation as interpretation.',
    allowedEvidence: ['owned-reading'],
    allowedTools: [],
  },
  navigate: {
    id: 'navigator',
    route: 'navigate',
    intent: 'Return typed destinations into the current reading and its evidence.',
    posture: 'Concise orientation with no invented route or component.',
    allowedEvidence: ['owned-reading'],
    allowedTools: [],
  },
}

export interface ExistingChatCapability {
  id: 'narrator' | 'witness-dyad'
  responsibility: string
  selectableForReadingInterpretation: false
  limitation: string
}

/**
 * Existing chat-shaped capabilities are catalogued to prevent responsibility
 * collapse. Neither is selectable through the reading interpretation route.
 */
export const EXISTING_CHAT_CAPABILITIES: readonly ExistingChatCapability[] = [
  {
    id: 'narrator',
    responsibility: 'Voices deterministic onboarding state-machine questions.',
    selectableForReadingInterpretation: false,
    limitation: 'Collects validated intake; it does not interpret completed readings.',
  },
  {
    id: 'witness-dyad',
    responsibility: 'Runs Aletheios, Pichet, and synthesis over live witness context.',
    selectableForReadingInterpretation: false,
    limitation: 'The live endpoint requires a complete live biofield score envelope.',
  },
]

export function isInterpretationRoute(value: unknown): value is InterpretationRoute {
  return (
    typeof value === 'string' &&
    (INTERPRETATION_ROUTES as readonly string[]).includes(value)
  )
}

export function resolveInterpretationAgent(
  route: unknown,
): InterpretationAgentDefinition | null {
  return isInterpretationRoute(route) ? INTERPRETATION_AGENTS[route] : null
}

export function distinctAgentIds(): InterpretationAgentId[] {
  return [...new Set(INTERPRETATION_ROUTES.map((route) => INTERPRETATION_AGENTS[route].id))]
}
