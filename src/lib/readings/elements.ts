import type {
  ReadingArtifactElement,
  ReadingArtifactItem,
  ReadingArtifactStep,
  ReadingCollectionsElement,
  ReadingConfidence,
  ReadingCaptureElement,
  ReadingCaptureObservation,
  ReadingCycle,
  ReadingElement,
  ReadingElementBase,
  ReadingFact,
  ReadingFactGridElement,
  ReadingMediaElement,
  ReadingMediaItem,
  ReadingNumberCode,
  ReadingPosition,
  ReadingRelation,
  ReadingSequenceStep,
  ReadingSpreadPosition,
} from './types'

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asString = (value: unknown): string | null => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return null
}

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(asString).filter((item): item is string => item !== null) : []

const titleCase = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const base = (
  sourceSystem: string,
  id: string,
  title: string,
  sourcePath: string,
  confidence: ReadingConfidence = 'derived',
): ReadingElementBase => ({
  id: `${sourceSystem}:${id}`,
  title,
  sourceSystem,
  sourcePath,
  evidenceKind: 'deterministic',
  confidence,
})

const notice = (
  sourceSystem: string,
  id: string,
  title: string,
  body: string,
  sourcePath: string,
  tone: 'source' | 'warning' | 'unresolved' = 'warning',
): ReadingElement => ({
  ...base(sourceSystem, id, title, sourcePath, 'observed'),
  kind: 'notice',
  tone,
  body,
})

const raw = (sourceSystem: string, value: unknown, sourcePath: string): ReadingElement => ({
  ...base(sourceSystem, 'raw-source', `${titleCase(sourceSystem)} source`, sourcePath, 'observed'),
  kind: 'raw',
  value,
})

const fact = (id: string, label: string, value: unknown, detail?: string): ReadingFact | null => {
  const text = asString(value)
  return text === null ? null : { id, label, value: text, ...(detail ? { detail } : {}) }
}

const compactFacts = (facts: Array<ReadingFact | null>): ReadingFact[] =>
  facts.filter((item): item is ReadingFact => item !== null)

const sourceAt = (sourcePath: string, key: string): string =>
  sourcePath ? `${sourcePath}.${key}` : key

type EngineExtractionContext = {
  envelope: RecordValue
  envelopePath: string
}

type SelectedEnvelopeValue = {
  value: unknown
  sourcePath: string
}

function selectEnvelopeValue(
  result: RecordValue,
  resultPath: string,
  key: 'generated_audio' | 'generated_image',
  context?: EngineExtractionContext,
): SelectedEnvelopeValue {
  if (context && Object.prototype.hasOwnProperty.call(context.envelope, key)) {
    return { value: context.envelope[key], sourcePath: sourceAt(context.envelopePath, key) }
  }
  return { value: result[key], sourcePath: sourceAt(resultPath, key) }
}

function safeMediaUrl(value: unknown, mediaType: ReadingMediaItem['mediaType']): string | null {
  if (typeof value !== 'string') return null
  const candidate = value.trim()
  if (!candidate || candidate.length > 8_000_000) return null

  if (candidate.startsWith('/') && !candidate.startsWith('//') && !/[\u0000-\u001f\u007f]/.test(candidate)) {
    return candidate
  }

  try {
    const url = new URL(candidate)
    if (url.protocol === 'http:' || url.protocol === 'https:') return candidate
  } catch {
    // A non-URL may still be an allowlisted data URL below.
  }

  const mimePattern = mediaType === 'image'
    ? 'image\\/(?:png|jpeg|gif|webp|avif)'
    : 'audio\\/(?:mpeg|mp3|wav|x-wav|ogg|webm|mp4|aac|flac)'
  return new RegExp(`^data:${mimePattern};base64,[A-Za-z0-9+/\\r\\n]+={0,2}$`, 'i').test(candidate)
    ? candidate
    : null
}

function safeBase64Image(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const payload = value.trim()
  if (payload.length < 4 || payload.length > 8_000_000 || !/^[A-Za-z0-9+/\r\n]+={0,2}$/.test(payload)) return null
  return `data:image/png;base64,${payload}`
}

function generatedMediaItem(
  mediaType: ReadingMediaItem['mediaType'],
  selected: SelectedEnvelopeValue,
  label: string,
): ReadingMediaItem {
  const record = isRecord(selected.value) ? selected.value : null
  const error = record ? asString(record.error) : null
  const sourceStatus = (record ? asString(record.status) : null)?.toLowerCase()
  const rawUrl = typeof selected.value === 'string'
    ? selected.value
    : mediaType === 'audio'
      ? record?.clip_url ?? record?.url
      : record?.url
  const safeUrl = safeMediaUrl(rawUrl, mediaType)
    ?? (mediaType === 'image' ? safeBase64Image(record?.b64_json) : null)

  if (error || (sourceStatus && ['failed', 'error', 'rejected'].includes(sourceStatus))) {
    return {
      id: `${mediaType}-generated`,
      label,
      mediaType,
      sourcePath: selected.sourcePath,
      status: 'failed',
      textEquivalent: `${label} is not available for playback or display.`,
      detail: error ?? `The source reports a ${sourceStatus} media state.`,
    }
  }
  if (safeUrl) {
    return {
      id: `${mediaType}-generated`,
      label,
      mediaType,
      sourcePath: selected.sourcePath,
      status: 'available',
      url: safeUrl,
      ...(asString(record?.mime_type) ? { mimeType: asString(record?.mime_type)! } : {}),
      textEquivalent: `${label} supplied by the ${selected.sourcePath} source field.`,
    }
  }
  if (rawUrl !== undefined && rawUrl !== null) {
    return {
      id: `${mediaType}-generated`,
      label,
      mediaType,
      sourcePath: selected.sourcePath,
      status: 'failed',
      textEquivalent: `${label} is not available for playback or display.`,
      detail: error ?? 'The source supplied a media reference that cannot be opened safely.',
    }
  }
  return {
    id: `${mediaType}-generated`,
    label,
    mediaType,
    sourcePath: selected.sourcePath,
    status: 'missing',
    textEquivalent: `${label} was not supplied by this engine response.`,
    detail: record
      ? `The ${selected.sourcePath} record contains no playable ${mediaType} reference.`
      : `The ${selected.sourcePath} field is absent or null.`,
  }
}

function generatedMediaElement(
  sourceSystem: string,
  id: string,
  title: string,
  sourcePath: string,
  item: ReadingMediaItem,
): ReadingMediaElement {
  return {
    ...base(sourceSystem, id, title, sourcePath, 'observed'),
    kind: 'media',
    items: [item],
  }
}

function indexDetail(value: unknown): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? `Source index ${value}` : undefined
}

function extractPanchanga(result: RecordValue, sourcePath: string): ReadingElement[] {
  const limbFacts = compactFacts([
    fact('vara', 'Vara', result.vara_name, indexDetail(result.vara_index)),
    fact('tithi', 'Tithi', result.tithi_name, indexDetail(result.tithi_index)),
    fact('nakshatra', 'Nakshatra', result.nakshatra_name, indexDetail(result.nakshatra_index)),
    fact('yoga', 'Yoga', result.yoga_name, indexDetail(result.yoga_index)),
    fact('karana', 'Karana', result.karana_name, indexDetail(result.karana_index)),
  ])
  const element: ReadingFactGridElement = {
    ...base('panchanga', 'five-limbs', 'The five limbs', sourcePath),
    kind: 'fact-grid',
    layout: 'limbs',
    facts: limbFacts,
  }
  const astronomicalFacts = compactFacts([
    fact('solar-longitude', 'Solar longitude', result.solar_longitude, 'Degrees'),
    fact('lunar-longitude', 'Lunar longitude', result.lunar_longitude, 'Degrees'),
    fact('julian-day', 'Julian day', result.julian_day),
  ])
  return [
    element,
    ...(astronomicalFacts.length
      ? [{
          ...base('panchanga', 'astronomical-facts', 'Astronomical source facts', sourcePath),
          kind: 'fact-grid' as const,
          layout: 'grid' as const,
          facts: astronomicalFacts,
        }]
      : []),
    ...(limbFacts.length === 5
      ? []
      : [
          notice(
            'panchanga',
            'incomplete-limbs',
            'Incomplete panchanga source',
            `${5 - limbFacts.length} of the five named limbs were absent from this engine response.`,
            sourcePath,
          ),
        ]),
  ]
}

const NUMEROLOGY_FIELDS = ['life_path', 'expression', 'soul_urge', 'personality', 'birthday', 'chaldean_name'] as const

function extractNumerology(result: RecordValue, sourcePath: string): ReadingElement[] {
  const codes = NUMEROLOGY_FIELDS.flatMap((key): ReadingNumberCode[] => {
    const value = result[key]
    if (isRecord(value)) {
      const codeValue = asString(value.value)
      if (codeValue === null) return []
      return [
        {
          id: key,
          label: titleCase(key),
          value: codeValue,
          reduction: stringArray(value.reduction_chain),
          ...(asString(value.meaning) ? { detail: asString(value.meaning)! } : {}),
          ...(typeof value.is_master === 'boolean' ? { isMaster: value.is_master } : {}),
        },
      ]
    }
    const codeValue = asString(value)
    return codeValue === null ? [] : [{ id: key, label: titleCase(key), value: codeValue, reduction: [] }]
  })
  return codes.length
    ? [
        {
          ...base('numerology', 'codes', 'Number codes', sourcePath),
          kind: 'number-codes',
          codes,
        },
      ]
    : []
}

function mapPositions(value: unknown): ReadingPosition[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item, index): ReadingPosition[] => {
    if (!isRecord(item)) return []
    const label = asString(item.planet) ?? asString(item.name)
    if (!label) return []
    return [
      {
        id: `${label.toLowerCase().replace(/\s+/g, '-')}-${index}`,
        label,
        ...(asString(item.sign) ? { sign: asString(item.sign)! } : {}),
        ...(asNumber(item.degree_in_sign) !== undefined ? { degree: asNumber(item.degree_in_sign) } : {}),
        ...(asNumber(item.longitude) !== undefined ? { longitude: asNumber(item.longitude) } : {}),
        ...(typeof item.is_retrograde === 'boolean' ? { isRetrograde: item.is_retrograde } : {}),
      },
    ]
  })
}

function extractTransits(result: RecordValue, sourcePath: string): ReadingElement[] {
  const elements: ReadingElement[] = []
  const quality = fact('period-quality', 'Period quality', result.period_quality)
  if (quality) {
    elements.push({
      ...base('transits', 'period-quality', 'Transit context', sourcePath),
      kind: 'fact-grid',
      layout: 'profile',
      facts: [quality],
    })
  }

  const natal = mapPositions(result.natal_positions)
  if (natal.length) {
    elements.push({
      ...base('transits', 'natal-positions', 'Natal positions', `${sourcePath}.natal_positions`),
      kind: 'positions',
      frame: 'natal',
      positions: natal,
    })
  }
  const transit = mapPositions(result.transit_positions)
  if (transit.length) {
    elements.push({
      ...base('transits', 'transit-positions', 'Transit positions', `${sourcePath}.transit_positions`),
      kind: 'positions',
      frame: 'transit',
      positions: transit,
    })
  }

  const relations: ReadingRelation[] = Array.isArray(result.aspects)
    ? result.aspects.flatMap((item, index): ReadingRelation[] => {
        if (!isRecord(item)) return []
        const from = asString(item.transiting_planet)
        const to = asString(item.natal_planet)
        const relation = asString(item.aspect_type)
        if (!from || !to || !relation) return []
        const orb = asNumber(item.orb)
        return [
          {
            id: `aspect-${index}`,
            from,
            to,
            relation,
            ...(orb !== undefined ? { measure: `${orb.toFixed(2)}° orb` } : {}),
            ...(asString(item.nature) ? { detail: asString(item.nature)! } : {}),
            ...(typeof item.is_applying === 'boolean' ? { status: item.is_applying ? 'Applying' : 'Separating' } : {}),
          },
        ]
      })
    : []
  if (relations.length) {
    elements.push({
      ...base('transits', 'aspects', 'Transit-to-natal aspects', `${sourcePath}.aspects`),
      kind: 'relations',
      relations,
    })
  }
  return elements
}

function periodSteps(currentPeriod: unknown): ReadingSequenceStep[] {
  if (!isRecord(currentPeriod)) return []
  const periods = [
    ['mahadasha', 'Mahadasha'],
    ['antardasha', 'Antardasha'],
    ['pratyantardasha', 'Pratyantardasha'],
  ] as const
  return periods.flatMap(([key, label]): ReadingSequenceStep[] => {
    const period = currentPeriod[key]
    if (!isRecord(period)) return []
    const planet = asString(period.planet)
    if (!planet) return []
    return [
      {
        id: key,
        label,
        value: planet,
        ...(asString(period.start) ? { start: asString(period.start)! } : {}),
        ...(asString(period.end) ? { end: asString(period.end)! } : {}),
        status: 'Current source period',
      },
    ]
  })
}

function extractVimshottari(result: RecordValue, sourcePath: string): ReadingElement[] {
  const elements: ReadingElement[] = []
  const current = periodSteps(result.current_period)
  if (current.length) {
    elements.push({
      ...base('vimshottari', 'current-periods', 'Current nested periods', `${sourcePath}.current_period`),
      kind: 'sequence',
      sequenceType: 'temporal',
      steps: current,
    })
  }
  const transitions: ReadingSequenceStep[] = Array.isArray(result.upcoming_transitions)
    ? result.upcoming_transitions.flatMap((item, index): ReadingSequenceStep[] => {
        if (!isRecord(item)) return []
        const type = asString(item.type)
        const from = asString(item.from_planet)
        const to = asString(item.to_planet)
        if (!type || !from || !to) return []
        return [
          {
            id: `transition-${index}`,
            label: type,
            value: `${from} → ${to}`,
            ...(asString(item.date) ? { at: asString(item.date)! } : {}),
            ...(asNumber(item.days_until) !== undefined ? { detail: `${asNumber(item.days_until)} source days away` } : {}),
          },
        ]
      })
    : []
  if (transitions.length) {
    elements.push({
      ...base('vimshottari', 'upcoming-transitions', 'Explicit period transitions', `${sourcePath}.upcoming_transitions`),
      kind: 'sequence',
      sequenceType: 'temporal',
      steps: transitions,
    })
  }
  return elements
}

function extractHumanDesign(result: RecordValue, sourcePath: string): ReadingElement[] {
  const elements: ReadingElement[] = []
  const facts = compactFacts([
    fact('type', 'Type', result.hd_type),
    fact('authority', 'Authority', result.authority),
    fact('profile', 'Profile', result.profile),
    fact('definition', 'Definition', result.definition),
  ])
  if (facts.length) {
    elements.push({
      ...base('human-design', 'profile', 'Human Design profile', sourcePath),
      kind: 'fact-grid',
      layout: 'profile',
      facts,
    })
  }

  const centers = stringArray(result.defined_centers)
  if (centers.length) {
    const collections: ReadingCollectionsElement = {
      ...base('human-design', 'defined-centers', 'Defined centers', `${sourcePath}.defined_centers`),
      kind: 'collections',
      groups: [{ id: 'defined-centers', label: 'Defined centers', items: centers }],
    }
    elements.push(collections)
  }

  const relations = stringArray(result.active_channels).map((channel, index): ReadingRelation => {
    const [from, to] = channel.split('-', 2)
    return {
      id: `channel-${index}`,
      from: from ? `Gate ${from}` : 'Channel',
      to: to ? `Gate ${to}` : channel,
      relation: 'Active channel',
      detail: channel,
    }
  })
  if (relations.length) {
    elements.push({
      ...base('human-design', 'active-channels', 'Active channels', `${sourcePath}.active_channels`),
      kind: 'relations',
      relations,
    })
  }
  return elements
}

function extractGeneKeys(result: RecordValue, sourcePath: string): ReadingElement[] {
  if (!isRecord(result.activation_sequence)) return []
  const sequence = result.activation_sequence
  const order = [
    ['lifes_work', "Life's work"],
    ['evolution', 'Evolution'],
    ['radiance', 'Radiance'],
    ['purpose', 'Purpose'],
  ] as const
  const steps = order.flatMap(([key, label]): ReadingSequenceStep[] => {
    const values = stringArray(sequence[key])
    return values.length ? [{ id: key, label, value: values.join(' · ') }] : []
  })
  return steps.length
    ? [
        {
          ...base('gene-keys', 'activation-sequence', 'Activation sequence', `${sourcePath}.activation_sequence`),
          kind: 'sequence',
          sequenceType: 'activation',
          steps,
        },
      ]
    : []
}

const BIORHYTHM_CYCLES = ['physical', 'emotional', 'intellectual', 'intuitive', 'aesthetic', 'spiritual'] as const

function extractBiorhythm(result: RecordValue, sourcePath: string): ReadingElement[] {
  const cycles = BIORHYTHM_CYCLES.flatMap((key): ReadingCycle[] => {
    const cycle = result[key]
    if (!isRecord(cycle)) return []
    const percentage = asNumber(cycle.percentage)
    if (percentage === undefined) return []
    return [
      {
        id: key,
        label: titleCase(key),
        value: percentage,
        unit: '%',
        min: 0,
        max: 100,
        ...(asString(cycle.phase) ? { status: asString(cycle.phase)! } : {}),
        ...(asNumber(cycle.cycle_day) !== undefined ? { detail: `Source cycle day ${asNumber(cycle.cycle_day)}` } : {}),
      },
    ]
  })
  return cycles.length
    ? [
        {
          ...base('biorhythm', 'cycles', 'Recorded cycles', sourcePath),
          kind: 'cycles',
          ...(asString(result.target_date) ? { targetLabel: asString(result.target_date)! } : {}),
          cycles,
        },
      ]
    : []
}

function extractVedicClock(result: RecordValue, sourcePath: string): ReadingElement[] {
  const dosha = isRecord(result.current_dosha) ? result.current_dosha : {}
  const organ = isRecord(result.current_organ) ? result.current_organ : {}
  const facts = compactFacts([
    fact('calculated-for', 'Calculated for', result.calculated_for),
    fact('dosha', 'Current dosha', dosha.dosha),
    fact('organ', 'Current organ', organ.organ),
    fact('time-window', 'Time window', organ.time_window),
    fact('element', 'Element', organ.element),
  ])
  const elements: ReadingElement[] = facts.length
    ? [
        {
          ...base('vedic-clock', 'current-window', 'Current Vedic clock window', sourcePath),
          kind: 'fact-grid',
          layout: 'profile',
          facts,
        },
      ]
    : []
  const steps: ReadingSequenceStep[] = Array.isArray(result.upcoming_transitions)
    ? result.upcoming_transitions.flatMap((item, index): ReadingSequenceStep[] => {
        if (!isRecord(item)) return []
        const time = asString(item.time)
        const newOrgan = asString(item.new_organ)
        const newDosha = asString(item.new_dosha)
        if (!time || (!newOrgan && !newDosha)) return []
        return [
          {
            id: `transition-${index}`,
            label: time,
            value: [newOrgan, newDosha].filter(Boolean).join(' · '),
            ...(asString(item.description) ? { detail: asString(item.description)! } : {}),
          },
        ]
      })
    : []
  if (steps.length) {
    elements.push({
      ...base('vedic-clock', 'transitions', 'Upcoming source transitions', `${sourcePath}.upcoming_transitions`),
      kind: 'sequence',
      sequenceType: 'temporal',
      steps,
    })
  }
  return elements
}

function extractTarot(result: RecordValue, sourcePath: string): ReadingElement[] {
  const positions: ReadingSpreadPosition[] = Array.isArray(result.positions)
    ? result.positions.flatMap((item, index): ReadingSpreadPosition[] => {
        if (!isRecord(item)) return []
        const card = isRecord(item.card) ? item.card : null
        const sourcePosition = asString(item.position)
        const position = card
          ? asString(item.name) ?? sourcePosition ?? `Position ${index + 1}`
          : sourcePosition ?? `Position ${index + 1}`
        const value = card
          ? asString(card.name)
          : asString(item.name) ?? asString(item.card)
        const reversed = card?.isReversed ?? card?.is_reversed ?? item.isReversed ?? item.is_reversed
        const orientation = typeof reversed === 'boolean'
          ? reversed ? 'Reversed' : 'Upright'
          : asString(card?.orientation) ?? asString(item.orientation)
        if (!value) return []
        return [
          {
            id: `position-${sourcePosition ?? index}`,
            label: position,
            value,
            ...(asString(item.meaning) ? { detail: asString(item.meaning)! } : {}),
            ...(orientation ? { status: orientation } : {}),
          },
        ]
      })
    : []
  return positions.length
    ? [
        {
          ...base('tarot', 'spread', 'Source-supplied spread', `${sourcePath}.positions`, 'observed'),
          kind: 'spread',
          tradition: 'tarot',
          positions,
        },
      ]
    : []
}

function extractIChing(result: RecordValue, sourcePath: string): ReadingElement[] {
  const positions: ReadingSpreadPosition[] = [
    ['primary_hexagram', 'Primary hexagram'],
    ['relating_hexagram', 'Relating hexagram'],
  ].flatMap(([key, label], index): ReadingSpreadPosition[] => {
    const hexagram = result[key]
    if (!isRecord(hexagram)) return []
    const number = asString(hexagram.number)
    const name = asString(hexagram.name)
    if (!number && !name) return []
    return [
      {
        id: `hexagram-${index}`,
        label,
        value: [number ? `#${number}` : null, name].filter(Boolean).join(' · '),
        ...(asString(hexagram.meaning) ? { detail: asString(hexagram.meaning)! } : {}),
      },
    ]
  })
  return positions.length
    ? [
        {
          ...base('i-ching', 'hexagrams', 'Source-supplied hexagrams', sourcePath, 'observed'),
          kind: 'spread',
          tradition: 'i-ching',
          positions,
        },
      ]
    : []
}

function extractEnneagram(result: RecordValue, sourcePath: string): ReadingElement[] {
  const questions = stringArray(result.questions)
  return questions.length
    ? [
        {
          ...base('enneagram', 'questions', 'Reflection questions', `${sourcePath}.questions`, 'observed'),
          kind: 'questions',
          questions,
        },
      ]
    : []
}

function extractNadabrahman(result: RecordValue, sourcePath: string): ReadingElement[] {
  const time = isRecord(result.time_recommendation) ? result.time_recommendation : {}
  const facts = compactFacts([
    fact('prahar', 'Prahar', time.prahar_name),
    fact('time-range', 'Time range', time.time_range),
    fact('energy-quality', 'Energy quality', time.energy_quality),
    fact('primary-raga', 'Primary raga', time.primary_raga),
  ])
  const elements: ReadingElement[] = facts.length
    ? [
        {
          ...base('nadabrahman', 'time-field', 'Recorded sound-time field', `${sourcePath}.time_recommendation`),
          kind: 'fact-grid',
          layout: 'profile',
          facts,
        },
      ]
    : []
  const ragas = Array.isArray(result.recommendations)
    ? result.recommendations.flatMap((item): string[] => (isRecord(item) && asString(item.raga_name) ? [asString(item.raga_name)!] : []))
    : []
  if (ragas.length) {
    elements.push({
      ...base('nadabrahman', 'ragas', 'Source-listed ragas', `${sourcePath}.recommendations`, 'observed'),
      kind: 'collections',
      groups: [{ id: 'ragas', label: 'Ragas', items: ragas }],
    })
  }
  return elements
}

function extractRaaga(
  result: RecordValue,
  sourcePath: string,
  context?: EngineExtractionContext,
): ReadingElement[] {
  const melakarta = isRecord(result.melakarta) ? result.melakarta : {}
  const prahar = isRecord(result.prahar) ? result.prahar : {}
  const facts = compactFacts([
    fact('melakarta', 'Melakarta', melakarta.name),
    fact('melakarta-number', 'Melakarta number', melakarta.num),
    fact('chakra', 'Chakra', melakarta.chakra),
    fact('ma-type', 'Ma type', melakarta.ma_type),
    fact(
      'root-frequency',
      'Root frequency',
      asNumber(result.root_hz) !== undefined ? `${asNumber(result.root_hz)} Hz` : result.root_hz,
    ),
    fact('prahar', 'Prahar', prahar.label),
    fact('recommended-time', 'Recommended time match', prahar.is_recommended_time),
    fact('total-melakartas', 'Total melakartas', result.total_melakartas),
  ])
  const elements: ReadingElement[] = facts.length
    ? [
        {
          ...base('raaga', 'tonal-profile', 'Raaga tonal profile', sourcePath),
          kind: 'fact-grid',
          layout: 'profile',
          facts,
        },
      ]
    : []

  const swaras = Array.isArray(result.swaras)
    ? result.swaras.flatMap((item): string[] => {
        if (!isRecord(item)) return []
        const name = asString(item.swara)
        if (!name) return []
        const frequency = asString(item.hz)
        const numerator = asString(item.ratio_num)
        const denominator = asString(item.ratio_den)
        const decimal = asString(item.ratio_decimal)
        const ratio = numerator && denominator ? `${numerator}/${denominator}` : decimal
        return [[name, frequency ? `${frequency} Hz` : null, ratio ? `ratio ${ratio}` : null].filter(Boolean).join(' · ')]
      })
    : []
  const affinities = isRecord(result.dosha_affinities)
    ? Object.entries(result.dosha_affinities).flatMap(([key, value]): string[] =>
        value === true ? [titleCase(key)] : [])
    : []
  if (swaras.length || affinities.length) {
    elements.push({
      ...base('raaga', 'source-sets', 'Raaga source sets', sourcePath, 'observed'),
      kind: 'collections',
      groups: [
        ...(swaras.length ? [{ id: 'swaras', label: 'Swaras', items: swaras }] : []),
        ...(affinities.length ? [{ id: 'dosha-affinities', label: 'Affinities marked true by source', items: affinities }] : []),
      ],
    })
  }

  const generatedAudio = selectEnvelopeValue(result, sourcePath, 'generated_audio', context)
  elements.push(
    generatedMediaElement(
      'raaga',
      'generated-audio',
      'Generated raaga audio',
      generatedAudio.sourcePath,
      generatedMediaItem('audio', generatedAudio, 'Raaga audio clip'),
    ),
  )
  return elements
}

function artifactItem(
  id: string,
  label: string,
  value: unknown,
  sourcePath: string,
  detail?: string,
): ReadingArtifactItem | null {
  const text = asString(value)
  return text === null
    ? null
    : {
        id,
        label,
        value: text,
        ...(detail ? { detail } : {}),
        sourcePath,
        status: 'available',
      }
}

function extractSigilForge(
  result: RecordValue,
  sourcePath: string,
  context?: EngineExtractionContext,
): ReadingElement[] {
  const method = isRecord(result.method) ? result.method : {}
  const processing = isRecord(result.processing) ? result.processing : {}
  const guidance = isRecord(result.guidance) ? result.guidance : {}
  const items = [
    artifactItem('intention', 'Intention', result.intention, sourceAt(sourcePath, 'intention')),
    artifactItem(
      'method',
      'Method',
      method.name,
      sourceAt(sourcePath, 'method'),
      asString(method.description) ?? undefined,
    ),
    artifactItem(
      'remaining-letters',
      'Remaining letters',
      processing.remaining_letters,
      sourceAt(sourcePath, 'processing.remaining_letters'),
    ),
    artifactItem(
      'letter-count',
      'Source letter count',
      processing.letter_count,
      sourceAt(sourcePath, 'processing.letter_count'),
    ),
    artifactItem('guidance', 'Guidance', guidance.note, sourceAt(sourcePath, 'guidance.note')),
  ].filter((item): item is ReadingArtifactItem => item !== null)

  const methodSteps = stringArray(method.steps)
  const guidanceSteps = stringArray(guidance.next_steps)
  const steps: ReadingArtifactStep[] = [
    ...methodSteps.map((label, index) => ({
      id: `method-step-${index + 1}`,
      label,
      sourcePath: `${sourceAt(sourcePath, 'method.steps')}[${index}]`,
      status: 'available' as const,
    })),
    ...guidanceSteps.map((label, index) => ({
      id: `guidance-step-${index + 1}`,
      label,
      sourcePath: `${sourceAt(sourcePath, 'guidance.next_steps')}[${index}]`,
      status: 'available' as const,
    })),
  ]
  const artifactStatus = items.length || steps.length ? 'available' : 'missing'
  const artifact: ReadingArtifactElement = {
    ...base('sigil-forge', 'method', 'Sigil method and guidance', sourcePath, 'observed'),
    kind: 'artifact',
    artifactType: 'sigil',
    status: artifactStatus,
    items: artifactStatus === 'available'
      ? items
      : [{
          id: 'method-missing',
          label: 'Method',
          value: 'Not supplied',
          sourcePath: sourceAt(sourcePath, 'method'),
          status: 'missing',
        }],
    steps,
  }

  const generatedImage = selectEnvelopeValue(result, sourcePath, 'generated_image', context)
  const mediaItem = generatedMediaItem('image', generatedImage, 'Generated sigil image')
  if (
    mediaItem.status === 'missing'
    && (result.image_gen_available === false || (isRecord(result.svg_preview) && result.svg_preview.status === 'absent'))
  ) {
    mediaItem.detail = result.image_gen_available === false
      ? 'The source explicitly reports that image generation was unavailable.'
      : 'The source explicitly reports that no SVG preview was supplied. Raw SVG is never executed.'
  }

  return [
    artifact,
    generatedMediaElement('sigil-forge', 'generated-image', 'Generated sigil image', generatedImage.sourcePath, mediaItem),
  ]
}

function extractSacredGeometry(result: RecordValue, sourcePath: string): ReadingElement[] {
  const form = isRecord(result.form) ? result.form : {}
  const facts = compactFacts([
    fact('form', 'Form', form.name),
    fact('numerology', 'Numerology', form.numerology),
    fact('symbolism', 'Symbolism', form.symbolism),
  ])
  return facts.length
    ? [
        {
          ...base('sacred-geometry', 'form', 'Source-selected form', `${sourcePath}.form`, 'observed'),
          kind: 'fact-grid',
          layout: 'profile',
          facts,
        },
      ]
    : []
}

const BIOFIELD_METRICS = [
  ['light_quanta_density', 'Light quanta density'],
  ['normalized_area', 'Normalized area'],
  ['average_intensity', 'Average intensity'],
  ['inner_noise', 'Inner noise'],
  ['entropy_form_coefficient', 'Entropy form coefficient'],
  ['fractal_dimension', 'Fractal dimension'],
  ['correlation_dimension', 'Correlation dimension'],
  ['body_symmetry', 'Body symmetry'],
  ['contour_complexity', 'Contour complexity'],
  ['pattern_regularity', 'Pattern regularity'],
  ['coherence', 'Coherence'],
  ['entropy', 'Entropy'],
  ['symmetry', 'Symmetry'],
  ['vitality_index', 'Vitality index'],
  ['timestamp', 'Metric timestamp'],
] as const

const QUALITY_METRICS = [
  ['sharpness', 'Sharpness'],
  ['contrast', 'Contrast'],
  ['noise_level', 'Noise level'],
  ['exposure', 'Exposure'],
  ['sufficient_quality', 'Sufficient quality'],
] as const

function captureObservation(
  id: string,
  label: string,
  value: unknown,
  sourcePath: string,
  unverified: boolean,
  detail?: string,
): ReadingCaptureObservation | null {
  const text = asString(value)
  return text === null
    ? null
    : {
        id,
        label,
        value: text,
        ...(detail ? { detail } : {}),
        sourcePath,
        status: unverified ? 'unverified' : 'recorded',
      }
}

function collectMetricObservations(
  metrics: RecordValue,
  sourcePath: string,
  unverified: boolean,
): ReadingCaptureObservation[] {
  const observations = BIOFIELD_METRICS.flatMap(([key, label]): ReadingCaptureObservation[] => {
    const item = captureObservation(key, label, metrics[key], sourceAt(sourcePath, key), unverified)
    return item ? [item] : []
  })
  const energy = isRecord(metrics.energy_analysis) ? metrics.energy_analysis : null
  if (energy) {
    for (const key of ['low', 'medium', 'high', 'total'] as const) {
      const item = captureObservation(
        `energy-${key}`,
        `Energy ${key}`,
        energy[key],
        sourceAt(sourcePath, `energy_analysis.${key}`),
        unverified,
      )
      if (item) observations.push(item)
    }
  }
  return observations
}

function extractCaptureDerived(engineId: string, result: RecordValue, sourcePath: string): ReadingElement[] {
  const analysis = isRecord(result.analysis) ? result.analysis : {}
  const mock = result.is_mock_data === true || analysis.is_mock_data === true
  const sourceNotice = asString(result.notice) ?? asString(result.disclaimer)
  const observations: ReadingCaptureObservation[] = []

  for (const [key, label] of [
    ['reading_id', 'Reading'],
    ['session_id', 'Session'],
    ['analysis_version', 'Analysis version'],
    ['computation_mode', 'Computation mode'],
  ] as const) {
    const item = captureObservation(key, label, result[key], sourceAt(sourcePath, key), mock)
    if (item) observations.push(item)
  }

  const metrics = isRecord(result.metrics)
    ? result.metrics
    : isRecord(analysis.metrics)
      ? analysis.metrics
      : null
  if (metrics) {
    observations.push(...collectMetricObservations(
      metrics,
      isRecord(result.metrics) ? sourceAt(sourcePath, 'metrics') : sourceAt(sourcePath, 'analysis.metrics'),
      mock,
    ))
  }

  const quality = isRecord(result.quality_assessment)
    ? result.quality_assessment
    : isRecord(analysis.quality_assessment)
      ? analysis.quality_assessment
      : isRecord(result.quality)
        ? result.quality
        : null
  if (quality) {
    const qualityPath = isRecord(result.quality_assessment)
      ? sourceAt(sourcePath, 'quality_assessment')
      : isRecord(analysis.quality_assessment)
        ? sourceAt(sourcePath, 'analysis.quality_assessment')
        : sourceAt(sourcePath, 'quality')
    for (const [key, label] of QUALITY_METRICS) {
      const item = captureObservation(`quality-${key}`, label, quality[key], sourceAt(qualityPath, key), mock)
      if (item) observations.push(item)
    }
  }

  const constitution = isRecord(analysis.constitution) ? analysis.constitution : null
  if (constitution) {
    for (const [key, label] of [
      ['primary_dosha', 'Primary dosha'],
      ['secondary_dosha', 'Secondary dosha'],
      ['tcm_element', 'TCM element'],
      ['body_type', 'Body type'],
    ] as const) {
      const item = captureObservation(
        `constitution-${key}`,
        label,
        constitution[key],
        sourceAt(sourcePath, `analysis.constitution.${key}`),
        mock,
      )
      if (item) observations.push(item)
    }
  }
  const elementalBalance = isRecord(analysis.elemental_balance) ? analysis.elemental_balance : null
  if (elementalBalance) {
    const dominant = captureObservation(
      'dominant-element',
      'Dominant element',
      elementalBalance.dominant,
      sourceAt(sourcePath, 'analysis.elemental_balance.dominant'),
      mock,
    )
    if (dominant) observations.push(dominant)
  }

  if (Array.isArray(result.chakra_readings)) {
    result.chakra_readings.forEach((value, index) => {
      if (!isRecord(value)) return
      const chakra = asString(value.chakra_name) ?? asString(value.chakra)
      const activity = asString(value.activity_level)
      if (!chakra || !activity) return
      const details = [
        asString(value.balance) ? `Balance ${asString(value.balance)}` : null,
        asString(value.color_intensity),
        asString(value.element),
      ].filter((item): item is string => item !== null)
      observations.push({
        id: `chakra-${index}`,
        label: chakra,
        value: `Activity ${activity}`,
        ...(details.length ? { detail: details.join(' · ') } : {}),
        sourcePath: `${sourceAt(sourcePath, 'chakra_readings')}[${index}]`,
        status: mock ? 'unverified' : 'recorded',
      })
    })
  }

  const statusValue = (asString(result.capture_status) ?? asString(result.status) ?? asString(result.state) ?? '').toLowerCase()
  const error = asString(result.error)
  const failed = Boolean(error) || ['failed', 'error', 'rejected'].includes(statusValue)
  const hasCaptureIdentity = asString(result.reading_id) !== null || asString(result.session_id) !== null
  const captureState: ReadingCaptureElement['captureState'] = failed
    ? 'failed'
    : observations.length
      ? hasCaptureIdentity
        ? 'recorded'
        : 'analyzed'
      : 'capture-required'
  const body = failed
    ? error ?? 'The source reports that capture processing failed.'
    : captureState === 'capture-required'
      ? 'No capture or analysis fields were supplied. This engine requires consented acquisition in its capture-capable surface.'
      : mock
        ? 'The source marks these observations as mock data. Values are preserved as unverified source evidence.'
        : 'Only source-supplied observations are shown; no additional score or interpretation has been inferred.'

  const capture: ReadingCaptureElement = {
    ...base(
      engineId,
      'capture-summary',
      engineId === 'face-reading' ? 'Face-reading source summary' : 'Biofield capture summary',
      sourcePath,
      mock ? 'unverified' : observations.length ? 'derived' : 'observed',
    ),
    kind: 'capture',
    captureState,
    body,
    observations,
  }
  const elements: ReadingElement[] = []
  if (mock) {
    elements.push(
      notice(
        engineId,
        'mock-source',
        'Mock source data',
        sourceNotice ??
          'This engine response identifies itself as mock data. It is preserved as source evidence and is not presented as verified computation.',
        sourcePath,
        'unresolved',
      ),
    )
  } else if (sourceNotice) {
    elements.push(notice(engineId, 'source-notice', 'Source notice', sourceNotice, sourcePath, 'source'))
  }
  elements.push(capture)
  return elements
}

function knownExtractor(
  engineId: string,
  result: RecordValue,
  sourcePath: string,
  context?: EngineExtractionContext,
): ReadingElement[] | null {
  switch (engineId) {
    case 'panchanga':
      return extractPanchanga(result, sourcePath)
    case 'numerology':
      return extractNumerology(result, sourcePath)
    case 'transits':
      return extractTransits(result, sourcePath)
    case 'vimshottari':
      return extractVimshottari(result, sourcePath)
    case 'human-design':
      return extractHumanDesign(result, sourcePath)
    case 'gene-keys':
      return extractGeneKeys(result, sourcePath)
    case 'biorhythm':
      return extractBiorhythm(result, sourcePath)
    case 'vedic-clock':
      return extractVedicClock(result, sourcePath)
    case 'tarot':
      return extractTarot(result, sourcePath)
    case 'i-ching':
      return extractIChing(result, sourcePath)
    case 'enneagram':
      return extractEnneagram(result, sourcePath)
    case 'nadabrahman':
      return extractNadabrahman(result, sourcePath)
    case 'raaga':
      return extractRaaga(result, sourcePath, context)
    case 'sigil-forge':
      return extractSigilForge(result, sourcePath, context)
    case 'sacred-geometry':
      return extractSacredGeometry(result, sourcePath)
    case 'biofield':
    case 'biofield-capture':
    case 'face-reading':
      return extractCaptureDerived(engineId, result, sourcePath)
    default:
      return null
  }
}

function extractEngineElementsInternal(
  engineId: string,
  result: unknown,
  sourcePath: string,
  context?: EngineExtractionContext,
): ReadingElement[] {
  if (!isRecord(result)) {
    return [
      notice(engineId, 'unavailable', 'Engine output unavailable', 'The engine returned no object payload for this reading.', sourcePath, 'unresolved'),
      raw(engineId, result, sourcePath),
    ]
  }
  const known = knownExtractor(engineId, result, sourcePath, context)
  if (known === null) return [raw(engineId, result, sourcePath)]
  if (known.length > 0) return known
  return [
    notice(engineId, 'incomplete', 'Structured output incomplete', 'Known fields were absent from this engine response. The source remains available below.', sourcePath),
    raw(engineId, result, sourcePath),
  ]
}

/** Extract one engine result through an explicit, engine-named allowlist. */
export function extractEngineElements(engineId: string, result: unknown, sourcePath = `${engineId}.result`): ReadingElement[] {
  return extractEngineElementsInternal(engineId, result, sourcePath)
}

type EnvelopeFailure = {
  body: string
  sourcePath: string
}

function serializedErrorText(value: unknown): string | null {
  if (value === null || value === undefined || value === false) return null
  const text = asString(value)
  if (text !== null) return text
  if (isRecord(value) && asString(value.message)) return asString(value.message)
  try {
    const serialized = JSON.stringify(value)
    return serialized === undefined ? null : serialized
  } catch {
    return null
  }
}

function envelopeFailure(value: unknown, sourcePath: string): EnvelopeFailure | null {
  if (!isRecord(value)) return null

  const errorKey = Object.prototype.hasOwnProperty.call(value, 'error')
    ? 'error'
    : Object.prototype.hasOwnProperty.call(value, '_error')
      ? '_error'
      : null
  const errorText = errorKey ? serializedErrorText(value[errorKey]) : null
  const status = asString(value.status)
  const statusFailed = status !== null && ['failed', 'error', 'rejected'].includes(status.toLowerCase())
  const failedText = typeof value.failed === 'string' ? value.failed : null
  const explicitlyFailed = value.failed === true
    || (failedText !== null && !['false', 'no', '0', 'success', 'succeeded'].includes(failedText.toLowerCase()))

  if (!errorText && !statusFailed && !explicitlyFailed) return null
  if (errorText) return { body: errorText, sourcePath: sourceAt(sourcePath, errorKey!) }
  if (failedText) return { body: failedText, sourcePath: sourceAt(sourcePath, 'failed') }
  if (statusFailed) {
    return {
      body: `The engine envelope reported status "${status}".`,
      sourcePath: sourceAt(sourcePath, 'status'),
    }
  }
  return {
    body: 'The engine envelope reported a failed run.',
    sourcePath: sourceAt(sourcePath, 'failed'),
  }
}

function elementsFromEngineEnvelope(value: unknown, fallbackId: string, sourcePath: string): ReadingElement[] {
  if (!isRecord(value)) return extractEngineElements(fallbackId, value, sourcePath)
  const engineId = asString(value.engine_id) ?? fallbackId
  const failure = envelopeFailure(value, sourcePath)
  const failureElement = failure
    ? notice(engineId, 'engine-failed', `${titleCase(engineId)} failed`, failure.body, failure.sourcePath)
    : null
  if (failureElement && !isRecord(value.result)) return [failureElement]

  const extracted = extractEngineElementsInternal(
    engineId,
    value.result,
    sourceAt(sourcePath, 'result'),
    { envelope: value, envelopePath: sourcePath },
  )
  return failureElement ? [failureElement, ...extracted] : extracted
}

const WORKFLOW_MEMBERS: Record<string, readonly string[]> = {
  'birth-blueprint': ['numerology', 'human-design', 'vimshottari', 'biofield', 'face-reading'],
  'creative-expression': ['sigil-forge', 'sacred-geometry', 'nadabrahman', 'numerology', 'raaga'],
  'daily-practice': ['panchanga', 'vedic-clock', 'biorhythm', 'transits', 'nadabrahman'],
  'decision-support': ['tarot', 'i-ching', 'human-design', 'enneagram', 'gene-keys'],
  'full-spectrum': [
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
  ],
  'self-inquiry': ['gene-keys', 'enneagram', 'face-reading', 'biofield'],
}

const CAPTURE_GATED_ENGINES = new Set(['biofield', 'biofield-capture', 'face-reading'])

function workflowRunLedger(
  workflowId: string,
  outputs: RecordValue,
  sourcePath: string,
): ReadingCollectionsElement {
  const declared = WORKFLOW_MEMBERS[workflowId] ?? []
  const outputEntries = Object.entries(outputs)
  const failed = outputEntries
    .filter(([, value]) => envelopeFailure(value, sourcePath) !== null)
    .map(([key]) => key)
  const returned = outputEntries
    .filter(([key]) => !failed.includes(key))
    .map(([key]) => key)
  const absent = declared.filter((engineId) => !Object.prototype.hasOwnProperty.call(outputs, engineId))
  const captureGated = absent.filter((engineId) => CAPTURE_GATED_ENGINES.has(engineId))
  const missing = absent.filter((engineId) => !CAPTURE_GATED_ENGINES.has(engineId))
  const groups = [
    ...(declared.length ? [{ id: 'declared', label: 'Declared systems', items: [...declared] }] : []),
    ...(returned.length ? [{ id: 'returned', label: 'Returned systems', items: returned }] : []),
    ...(failed.length ? [{ id: 'failed', label: 'Failed systems', items: failed }] : []),
    ...(captureGated.length ? [{ id: 'capture-gated', label: 'Capture-gated systems', items: captureGated }] : []),
    ...(missing.length ? [{ id: 'missing', label: 'Missing systems', items: missing }] : []),
  ]
  return {
    ...base(workflowId, 'system-run-ledger', 'Workflow system run ledger', sourcePath, 'observed'),
    kind: 'collections',
    groups,
  }
}

/**
 * Walk a single engine response, workflow response, or daily engine-envelope
 * array. It never guesses engine semantics from arbitrary field names.
 */
export function extractReadingElements(payload: unknown): ReadingElement[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((value, index) => elementsFromEngineEnvelope(value, `source-${index + 1}`, `[${index}]`))
  }
  if (!isRecord(payload)) return payload === null || payload === undefined ? [] : [raw('source', payload, 'source')]

  const engineId = asString(payload.engine_id)
  if (engineId && Object.prototype.hasOwnProperty.call(payload, 'result')) {
    return elementsFromEngineEnvelope(payload, engineId, '')
  }

  const outputField = isRecord(payload.engine_outputs)
    ? 'engine_outputs'
    : isRecord(payload.engine_results)
      ? 'engine_results'
      : null
  const outputs = outputField ? payload[outputField] as RecordValue : null
  if (outputs && outputField) {
    const workflowId = asString(payload.workflow_id)
    const extracted = Object.entries(outputs).flatMap(([key, value]) =>
      elementsFromEngineEnvelope(value, key, `${outputField}.${key}`),
    )
    return workflowId
      ? [workflowRunLedger(workflowId, outputs, outputField), ...extracted]
      : extracted
  }

  return [raw(asString(payload.workflow_id) ?? 'source', payload, 'source')]
}

/**
 * Parse only the exact fenced JSON shape emitted by deterministicMarkdown.
 * Prose, non-JSON fences, multiple payload fences, and invalid JSON stay flat.
 */
export function parseDeterministicPayload(body: string): unknown | null {
  const matches = [...body.matchAll(/```json[ \t]*\r?\n([\s\S]*?)\r?\n```/gi)]
  if (matches.length !== 1) return null
  try {
    return JSON.parse(matches[0][1])
  } catch {
    return null
  }
}
