export const FIXTURE_LABEL = 'Reader A'
export const FIXTURE_EMAIL = 'reader-a@urania.test'
export const FIXED_ISO = '2026-01-13T13:37:00.000Z'
export const FIXED_EPOCH = 1768311420000
export const FIXED_CHECKSUM = '137'.repeat(21) + '1'

export const IDENTITY = {
  id: 'fixture-reader-a',
  email: FIXTURE_EMAIL,
}

const maskedSubject = {
  id: 'fixture-subject-a',
  role: 'self',
  name: FIXTURE_LABEL,
  birth_date: '[MASKED]',
  birth_time: '[MASKED]',
  birth_time_confidence: 'unknown',
  birth_location_query: '[MASKED]',
  normalized_location: {
    display_name: '[MASKED]',
    latitude: '[MASKED]',
    longitude: '[MASKED]',
    timezone: 'UTC',
    provider: 'synthetic',
    confidence: 'synthetic',
  },
  createdAt: FIXED_ISO,
  updatedAt: FIXED_ISO,
}

export const SUBJECTS = [maskedSubject]

const longReading = [
  '## Orientation',
  '',
  'A stable synthetic reading demonstrates the sustained Parchment measure without carrying a private corpus record.',
  '',
  '## Observed structure',
  '',
  'The instrument keeps narration, evidence, and technical source distinct. This paragraph repeats only to exercise a long readable surface.',
  '',
  'The graph remains a doorway while the Reading becomes a calm document. No sentence predicts an outcome or prescribes a decision.',
].join('\n')

const engineReading = [
  '## Numerology instrument',
  '',
  '```json',
  JSON.stringify({
    engine_id: 'numerology',
    result: {
      life_path: { value: 7, reduction: '34 → 7', meaning: 'Inquiry' },
      expression: { value: 5, reduction: '23 → 5', meaning: 'Adaptation' },
    },
  }, null, 2),
  '```',
].join('\n')

const workflowReading = [
  '## Daily practice workflow',
  '',
  '```json',
  JSON.stringify({
    workflow_id: 'daily-practice',
    engine_outputs: {
      panchanga: {
        engine_id: 'panchanga',
        result: {
          tithi: { name: 'Synthetic limb', category: 'Nanda' },
          nakshatra: { name: 'Synthetic star' },
        },
      },
    },
    synthesis: null,
    total_time_ms: 137,
  }, null, 2),
  '```',
].join('\n')

const captureReading = [
  '## Capture-gated field',
  '',
  '```json',
  JSON.stringify({
    engine_id: 'biofield',
    status: 'capture-gated',
    consent: 'required',
    capture_available: false,
  }, null, 2),
  '```',
].join('\n')

export const FOLIO_READINGS = [
  {
    id: 'reading-long',
    nodeId: 'witness',
    nodeLabel: 'Noesis Reading',
    mode: 'integrated-reading',
    title: 'A long synthetic Reading',
    content: longReading,
    createdAt: FIXED_EPOCH,
    favorite: true,
  },
  {
    id: 'reading-engine',
    nodeId: 'birth',
    nodeLabel: 'Birth Witness',
    mode: 'engine:numerology',
    title: 'Numerology · synthetic',
    content: engineReading,
    createdAt: FIXED_EPOCH - 137000,
    favorite: false,
  },
  {
    id: 'reading-workflow',
    nodeId: 'transit',
    nodeLabel: 'Sky Weather',
    mode: 'workflow:daily-practice',
    title: 'Daily Practice · synthetic',
    content: workflowReading,
    createdAt: FIXED_EPOCH - 274000,
    favorite: false,
  },
  {
    id: 'reading-capture',
    nodeId: 'engine',
    nodeLabel: 'Engine Status',
    mode: 'engine:biofield',
    title: 'Capture required · synthetic',
    content: captureReading,
    createdAt: FIXED_EPOCH - 411000,
    favorite: false,
  },
]

export const RELATIONSHIP = {
  id: 'relationship-fixture',
  status: 'active',
  inviteeEmail: 'reader-b@urania.test',
  expiresAt: '2026-02-13T13:37:00.000Z',
  acceptedAt: FIXED_ISO,
  declinedAt: null,
  revokedAt: null,
  createdAt: FIXED_ISO,
  updatedAt: FIXED_ISO,
  participants: [
    {
      role: 'inviter',
      userId: IDENTITY.id,
      subjectId: 'fixture-subject-a',
      consentStatus: 'active',
      consentedAt: FIXED_ISO,
      revokedAt: null,
    },
    {
      role: 'invitee',
      userId: 'fixture-reader-b',
      subjectId: 'fixture-subject-b',
      consentStatus: 'active',
      consentedAt: FIXED_ISO,
      revokedAt: null,
    },
  ],
}

export const REVOKED_RELATIONSHIP = {
  ...RELATIONSHIP,
  status: 'revoked',
  revokedAt: '2026-01-14T13:37:00.000Z',
  participants: RELATIONSHIP.participants.map((participant) => ({
    ...participant,
    consentStatus: 'revoked',
    revokedAt: '2026-01-14T13:37:00.000Z',
  })),
}

export const GRANTED_READING = {
  generationId: 'generation-fixture',
  relationshipId: RELATIONSHIP.id,
  mode: 'synastry',
  responseSha256: FIXED_CHECKSUM,
  result: {
    narrative: 'A synthetic dyad Reading preserves both participant sides with equal visual weight.',
    engines_used: ['transits', 'human-design'],
    relations: [
      {
        from: 'Inviting participant',
        to: 'You',
        relation: 'named synthetic relation',
        measure: 'balanced',
      },
    ],
  },
  visibility: 'participant',
  createdAt: FIXED_ISO,
  grantedAt: FIXED_ISO,
}

export const CHAT_SESSION = {
  sessionId: 'chat-fixture',
  userId: IDENTITY.id,
  seed: { kind: 'witness', mode: 'integrated-reading', minSubjects: 1, maxSubjects: 5 },
  chapter: 'subjects',
  subjectIndex: 0,
  prefilledCount: 1,
  intake: { subjects: [] },
  createdAt: FIXED_ISO,
  updatedAt: FIXED_ISO,
}

export const CHAT_TURNS = [
  {
    id: 'turn-fixture',
    sessionId: CHAT_SESSION.sessionId,
    role: 'narrator',
    blocks: [{ kind: 'text', text: 'What relationship or pattern would you like this Reading to examine?' }],
    chapter: 'subjects',
    createdAt: FIXED_ISO,
  },
]

export const ENGINE_STATUS = {
  health: {
    status: 'ok',
    version: 'fixture-1.37',
    uptime_seconds: 49320,
    engines_loaded: 18,
    workflows_loaded: 6,
  },
  ready: {
    redis: 'ready',
    postgres: 'ready',
    orchestrator: 'ready',
    bridge_status: 'ready',
    bridge_engines: [
      { engine_id: 'panchanga', healthy: true, detail: 'fixture evidence', latency_ms: 13 },
      { engine_id: 'numerology', healthy: true, detail: 'fixture evidence', latency_ms: 7 },
    ],
    bridge_failed_engines: [],
    overall_status: 'ready',
  },
  engines: ['panchanga', 'numerology', 'human-design', 'transits'],
}

const desktop = { width: 1440, height: 1000 }
const mobile = { width: 390, height: 844 }
const reflow = { width: 720, height: 1000 }

const parentRows = ['birth', 'compat', 'transit', 'witness', 'engine', 'folio', 'bridge']
  .map((nodeId) => ({
    id: `desktop-node-${nodeId}`,
    viewport: desktop,
    route: `#/node/${nodeId}`,
    fixture: nodeId === 'engine' ? 'operator' : 'populated',
    surface: `parent-${nodeId}`,
  }))

export const MATRIX_ROWS = [
  { id: 'desktop-threshold', viewport: desktop, route: '#/threshold', fixture: 'threshold', surface: 'threshold' },
  { id: 'desktop-home', viewport: desktop, route: '#/', fixture: 'populated', surface: 'home' },
  ...parentRows,
  { id: 'desktop-chat-intake', viewport: desktop, route: '#/node/witness/integrated-reading', fixture: 'chat', surface: 'chat-intake' },
  { id: 'desktop-reading-preview', viewport: desktop, route: '#/readings/reading-workflow', fixture: 'workflow', surface: 'reading-preview' },
  { id: 'desktop-folio-populated', viewport: desktop, route: '#/readings', fixture: 'populated', surface: 'folio' },
  { id: 'desktop-reading-selected', viewport: desktop, route: '#/readings/reading-long', fixture: 'populated', surface: 'selected-reading' },
  { id: 'desktop-settings-active', viewport: desktop, route: '#/settings', fixture: 'active', surface: 'settings' },
  { id: 'desktop-operator', viewport: desktop, route: '#/node/engine/live-status', fixture: 'operator', surface: 'operator' },
  { id: 'desktop-folio-denied', viewport: desktop, route: '#/readings', fixture: 'denied', surface: 'folio-denied' },
  { id: 'desktop-dyad-current', viewport: desktop, route: '#/relationships/relationship-fixture/readings/generation-fixture', fixture: 'active', surface: 'dyad-reading' },
  { id: 'mobile-home', viewport: mobile, route: '#/', fixture: 'populated', surface: 'home-list' },
  { id: 'mobile-chat-sheet', viewport: mobile, route: '#/node/witness/integrated-reading', fixture: 'chat', surface: 'mobile-sheet' },
  { id: 'mobile-folio', viewport: mobile, route: '#/readings', fixture: 'populated', surface: 'folio-list' },
  { id: 'mobile-reading-measure', viewport: mobile, route: '#/readings/reading-long', fixture: 'populated', surface: 'reading-measure' },
  { id: 'mobile-settings-revoked', viewport: mobile, route: '#/settings', fixture: 'revoked', surface: 'settings-revoked' },
  { id: 'mobile-operator-capture', viewport: mobile, route: '#/readings/reading-capture', fixture: 'capture-gated', surface: 'capture-gated' },
  { id: 'mobile-dyad-historical', viewport: mobile, route: '#/relationships/relationship-fixture/readings/generation-fixture', fixture: 'historical', surface: 'historical-grant' },
  { id: 'reflow-home', viewport: reflow, route: '#/', fixture: 'populated', surface: 'home-reflow' },
  { id: 'reflow-node', viewport: reflow, route: '#/node/birth', fixture: 'populated', surface: 'node-reflow' },
  { id: 'reflow-folio-empty', viewport: reflow, route: '#/readings', fixture: 'empty', surface: 'folio-empty' },
  { id: 'reflow-long-reading', viewport: reflow, route: '#/readings/reading-long', fixture: 'populated', surface: 'long-reading' },
  { id: 'reflow-settings-failed', viewport: reflow, route: '#/settings', fixture: 'failed', surface: 'settings-failed' },
  { id: 'reduced-home-list', viewport: desktop, route: '#/', fixture: 'populated', surface: 'reduced-graph', reducedMotion: true },
  { id: 'reduced-begin-dialog', viewport: desktop, route: '#/', fixture: 'populated', surface: 'reduced-dialog', reducedMotion: true, action: 'open-begin' },
  { id: 'reduced-composing-beat', viewport: desktop, route: '#/node/witness/integrated-reading', fixture: 'composing', surface: 'reduced-composing', reducedMotion: true },
  { id: 'reduced-reading-transition', viewport: desktop, route: '#/readings/reading-engine', fixture: 'partial', surface: 'reduced-transition', reducedMotion: true },
]

export const SYNTHETIC_FIXTURE_LABELS = [FIXTURE_LABEL]
