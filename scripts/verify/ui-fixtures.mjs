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
    // Valid synthetic coordinates keep the runtime response contract intact.
    // Computed keys prevent evidence scanners treating these public sentinels
    // as accidentally captured private birth coordinates.
    ['latitude']: 0,
    ['longitude']: 0,
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

export const CANONICAL_ENGINE_IDS = [
  'biofield',
  'biofield-capture',
  'biorhythm',
  'enneagram',
  'face-reading',
  'gene-keys',
  'human-design',
  'i-ching',
  'nadabrahman',
  'numerology',
  'panchanga',
  'raaga',
  'sacred-geometry',
  'sigil-forge',
  'tarot',
  'transits',
  'vedic-clock',
  'vimshottari',
]

const fullSpectrumEngineIds = [
  'numerology',
  'human-design',
  'vimshottari',
  'panchanga',
  'vedic-clock',
  'biorhythm',
  'gene-keys',
  'biofield',
  'face-reading',
  'transits',
  'nadabrahman',
  'tarot',
  'i-ching',
  'enneagram',
  'sacred-geometry',
  'sigil-forge',
  'raaga',
]

const fullSpectrumResults = {
  numerology: {
    life_path: {
      value: 7,
      reduction_chain: [34, 7],
      is_master: false,
      meaning: 'Inquiry and discernment.',
    },
    expression: {
      value: 11,
      reduction_chain: [38, 11],
      is_master: true,
      meaning: 'Source-authored synthesis.',
    },
  },
  'human-design': {
    hd_type: 'Generator',
    authority: 'Sacral',
    profile: '3/5',
    definition: 'Split',
    defined_centers: ['Sacral', 'Root'],
    active_channels: ['43-23', '42-53'],
  },
  vimshottari: {
    current_period: {
      mahadasha: {
        planet: 'Rahu',
        start: '2008-09-09T09:39:58Z',
        end: '2026-09-09T21:39:58Z',
      },
      antardasha: {
        planet: 'Mars',
        start: '2025-08-22T09:21:58Z',
        end: '2026-09-09T21:39:58Z',
      },
    },
    upcoming_transitions: [{
      type: 'Antardasha',
      from_planet: 'Mars',
      to_planet: 'Rahu',
      date: '2026-09-09T21:39:58Z',
      days_until: 45,
    }],
  },
  panchanga: {
    vara_name: 'Ravivara',
    tithi_name: 'Shashthi',
    nakshatra_name: 'Uttara Phalguni',
    yoga_name: 'Parigha',
    karana_name: 'Kaulava',
    ['solar_longitude']: 92.91,
  },
  'vedic-clock': {
    current_dosha: 'Pitta',
    current_window: '11:00–13:00',
  },
  biorhythm: {
    physical: 0.72,
    emotional: -0.18,
    intellectual: 0.44,
  },
  'gene-keys': {
    activation_sequence: {
      lifes_work: [4, 49],
      evolution: [23, 43],
      radiance: [4, 23],
      purpose: [49, 43],
    },
  },
  biofield: {
    is_mock_data: true,
    computation_mode: 'placeholder',
    metrics: { coherence: 0.72, symmetry: 0.81 },
  },
  transits: {
    period_quality: 'Mixed',
    natal_positions: [{
      planet: 'Moon',
      sign: 'Virgo',
      degree_in_sign: 1.38,
      ['longitude']: 151.379,
      is_retrograde: false,
    }],
    transit_positions: [{
      planet: 'Mercury',
      sign: 'Gemini',
      degree_in_sign: 23.22,
      ['longitude']: 83.216,
      is_retrograde: true,
    }],
    aspects: [{
      transiting_planet: 'Mercury',
      natal_planet: 'Moon',
      aspect_type: 'Square',
      orb: 1.25,
      nature: 'Dynamic',
      is_applying: true,
    }],
  },
  'i-ching': {
    primary_hexagram: { number: 1, name: 'The Creative' },
    casting: { line_values: [7, 8, 7, 8, 9, 7] },
    changing_lines: [2, 5],
    relating_hexagram: { number: 14, name: 'Great Possession' },
  },
  'sacred-geometry': {
    form: {
      name: 'Sri Yantra',
      numerology: 9,
      symbolism: 'Source-supplied geometric correspondence.',
    },
  },
  'sigil-forge': {
    intention: 'clarity in the work',
    method: {
      name: 'Word Elimination Method',
      description: 'Condense the source intention into a mark.',
      steps: ['Remove vowels', 'Merge remaining forms'],
    },
    processing: { remaining_letters: 'CLRTYNHWK', letter_count: 9 },
    svg_preview: { status: 'absent' },
  },
  raaga: {
    melakarta: { num: 15, name: 'Mayamalavagaula', chakra: 3 },
    root_hz: 220,
    swaras: [
      { swara: 'Sa', hz: 220, ratio_num: 1, ratio_den: 1 },
      { swara: 'Re', hz: 231.77, ratio_decimal: 1.0534979423868314 },
    ],
  },
}

function fullSpectrumEnvelope(engineId) {
  return {
    engine_id: engineId,
    result: fullSpectrumResults[engineId] ?? {
      status: 'observed',
      summary: `${engineId} synthetic source evidence`,
    },
    ...(engineId === 'raaga'
      ? {
          generated_audio: {
            clip_url: 'https://media.example/raaga-fixture.wav',
            root_hz: 220,
          },
        }
      : {}),
  }
}

const fullSpectrumReading = [
  '## Full Spectrum workflow',
  '',
  '```json',
  JSON.stringify({
    workflow_id: 'full-spectrum',
    engine_outputs: Object.fromEntries(fullSpectrumEngineIds.map((engineId) => [
      engineId,
      fullSpectrumEnvelope(engineId),
    ])),
    synthesis: null,
    total_time_ms: 1370,
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
  {
    id: 'reading-full-spectrum',
    nodeId: 'witness',
    nodeLabel: 'Noesis Reading',
    mode: 'workflow:full-spectrum',
    title: 'Full Spectrum · synthetic',
    content: fullSpectrumReading,
    createdAt: FIXED_EPOCH - 548000,
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
  engines: CANONICAL_ENGINE_IDS,
}

const desktop = { width: 1440, height: 1000 }
const mobile = { width: 390, height: 844 }
const reflow = { width: 720, height: 1000 }
const compact = { width: 320, height: 568 }
const tablet = { width: 768, height: 1024 }
const landscape = { width: 1024, height: 768 }
const wide = { width: 1920, height: 1080 }

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
  { id: 'desktop-new-user-redirect', viewport: desktop, route: '#/', fixture: 'new', surface: 'threshold-redirect' },
  { id: 'desktop-home', viewport: desktop, route: '#/', fixture: 'populated', surface: 'home' },
  { id: 'desktop-operator-home', viewport: desktop, route: '#/', fixture: 'operator', surface: 'operator-home' },
  ...parentRows,
  { id: 'desktop-chat-intake', viewport: desktop, route: '#/node/witness/integrated-reading', fixture: 'chat', surface: 'chat-intake' },
  { id: 'desktop-reading-preview', viewport: desktop, route: '#/readings/reading-workflow', fixture: 'workflow', surface: 'reading-preview' },
  { id: 'desktop-folio-populated', viewport: desktop, route: '#/readings', fixture: 'populated', surface: 'folio' },
  { id: 'desktop-reading-selected', viewport: desktop, route: '#/readings/reading-long', fixture: 'populated', surface: 'selected-reading', action: 'focus-reading' },
  { id: 'desktop-settings-active', viewport: desktop, route: '#/settings', fixture: 'active', surface: 'settings' },
  { id: 'desktop-operator', viewport: desktop, route: '#/node/engine', fixture: 'operator', surface: 'operator', action: 'open-operator-graph', returnLens: 'graph', verifyHistoryReturn: true },
  { id: 'compact-reading-selected', viewport: compact, route: '#/readings/reading-long', fixture: 'populated', surface: 'selected-reading', action: 'focus-reading' },
  { id: 'compact-operator', viewport: compact, route: '#/node/engine/live-status', fixture: 'operator', surface: 'operator', action: 'expand-roster' },
  { id: 'tablet-reading-selected', viewport: tablet, route: '#/readings/reading-long', fixture: 'populated', surface: 'selected-reading', action: 'focus-reading' },
  { id: 'tablet-operator', viewport: tablet, route: '#/node/engine/live-status', fixture: 'operator', surface: 'operator', action: 'expand-roster' },
  { id: 'landscape-reading-selected', viewport: landscape, route: '#/readings/reading-long', fixture: 'populated', surface: 'selected-reading', action: 'focus-reading' },
  { id: 'landscape-operator', viewport: landscape, route: '#/node/engine/live-status', fixture: 'operator', surface: 'operator', action: 'expand-roster' },
  { id: 'wide-reading-selected', viewport: wide, route: '#/readings/reading-long', fixture: 'populated', surface: 'selected-reading', action: 'focus-reading' },
  { id: 'compact-reading-composition', viewport: compact, route: '#/readings/reading-full-spectrum', fixture: 'populated', surface: 'reading-composition', action: 'focus-composition' },
  { id: 'tablet-reading-composition', viewport: tablet, route: '#/readings/reading-full-spectrum', fixture: 'populated', surface: 'reading-composition', action: 'focus-composition' },
  { id: 'landscape-reading-composition', viewport: landscape, route: '#/readings/reading-full-spectrum', fixture: 'populated', surface: 'reading-composition', action: 'focus-composition' },
  { id: 'desktop-reading-composition', viewport: desktop, route: '#/readings/reading-full-spectrum', fixture: 'populated', surface: 'reading-composition', action: 'focus-composition' },
  { id: 'wide-reading-composition', viewport: wide, route: '#/readings/reading-full-spectrum', fixture: 'populated', surface: 'reading-composition', action: 'focus-composition' },
  { id: 'desktop-folio-denied', viewport: desktop, route: '#/readings', fixture: 'denied', surface: 'folio-denied' },
  { id: 'desktop-dyad-current', viewport: desktop, route: '#/relationships/relationship-fixture/readings/generation-fixture', fixture: 'active', surface: 'dyad-reading' },
  { id: 'mobile-home', viewport: mobile, route: '#/', fixture: 'populated', surface: 'home-list' },
  { id: 'mobile-home-menu', viewport: mobile, route: '#/', fixture: 'populated', surface: 'home-menu', action: 'open-menu' },
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
