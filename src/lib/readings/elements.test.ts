import { describe, expect, it } from 'vitest'
import { extractEngineElements, extractReadingElements, parseDeterministicPayload } from './elements'

describe('extractEngineElements', () => {
  it('maps panchanga to exactly five source-supplied limbs', () => {
    const elements = extractEngineElements('panchanga', {
      vara_index: 0,
      vara_name: 'Ravivara (Sunday)',
      tithi_index: 5,
      tithi_name: 'Shashthi (Shukla)',
      nakshatra_index: 11,
      nakshatra_name: 'Uttara Phalguni',
      yoga_index: 18,
      yoga_name: 'Parigha',
      karana_index: 2,
      karana_name: 'Kaulava',
      solar_longitude: 92.91,
    })

    expect(elements).toHaveLength(2)
    expect(elements[0]).toMatchObject({
      kind: 'fact-grid',
      title: 'The five limbs',
      sourceSystem: 'panchanga',
      layout: 'limbs',
    })
    if (elements[0].kind !== 'fact-grid') throw new Error('Expected a fact grid')
    expect(elements[0].facts.map((fact) => fact.label)).toEqual(['Vara', 'Tithi', 'Nakshatra', 'Yoga', 'Karana'])
    expect(elements[0].facts).not.toContainEqual(expect.objectContaining({ label: 'Transition' }))
    expect(elements[1]).toMatchObject({
      kind: 'fact-grid',
      title: 'Astronomical source facts',
      facts: [{ label: 'Solar longitude', value: '92.91', detail: 'Degrees' }],
    })
  })

  it('maps numerology codes without dropping reductions or meanings', () => {
    const elements = extractEngineElements('numerology', {
      life_path: { value: 7, reduction_chain: [34, 7], is_master: false, meaning: 'Inquiry and discernment.' },
      expression: { value: 11, reduction_chain: [38, 11], is_master: true, meaning: 'A source-authored meaning.' },
    })

    expect(elements).toHaveLength(1)
    expect(elements[0].kind).toBe('number-codes')
    if (elements[0].kind !== 'number-codes') throw new Error('Expected number codes')
    expect(elements[0].codes[0]).toMatchObject({
      label: 'Life Path',
      value: '7',
      reduction: ['34', '7'],
      detail: 'Inquiry and discernment.',
    })
    expect(elements[0].codes[1].isMaster).toBe(true)
  })

  it('separates transit positions from transit-to-natal relationships', () => {
    const elements = extractEngineElements('transits', {
      period_quality: 'Mixed',
      natal_positions: [
        { planet: 'Moon', sign: 'Virgo', degree_in_sign: 1.38, longitude: 151.379, is_retrograde: false },
      ],
      transit_positions: [
        { planet: 'Mercury', sign: 'Gemini', degree_in_sign: 23.22, longitude: 83.216, is_retrograde: true },
      ],
      aspects: [
        {
          transiting_planet: 'Mercury',
          natal_planet: 'Moon',
          aspect_type: 'Square',
          orb: 1.25,
          nature: 'Dynamic',
          is_applying: true,
        },
      ],
    })

    expect(elements.map((element) => element.kind)).toEqual(['fact-grid', 'positions', 'positions', 'relations'])
    const relations = elements.find((element) => element.kind === 'relations')
    if (!relations || relations.kind !== 'relations') throw new Error('Expected relations')
    expect(relations.relations[0]).toMatchObject({
      from: 'Mercury',
      to: 'Moon',
      relation: 'Square',
      measure: '1.25° orb',
      status: 'Applying',
    })
  })

  it('maps Vimshottari periods and explicit transitions as temporal sequences', () => {
    const elements = extractEngineElements('vimshottari', {
      current_period: {
        mahadasha: { planet: 'Rahu', start: '2008-09-09T09:39:58Z', end: '2026-09-09T21:39:58Z' },
        antardasha: { planet: 'Mars', start: '2025-08-22T09:21:58Z', end: '2026-09-09T21:39:58Z' },
      },
      upcoming_transitions: [
        { type: 'Antardasha', from_planet: 'Mars', to_planet: 'Rahu', date: '2026-09-09T21:39:58Z', days_until: 45 },
      ],
    })

    expect(elements).toHaveLength(2)
    expect(elements.every((element) => element.kind === 'sequence')).toBe(true)
    if (elements[1].kind !== 'sequence') throw new Error('Expected sequence')
    expect(elements[1].steps[0]).toMatchObject({
      label: 'Antardasha',
      value: 'Mars → Rahu',
      at: '2026-09-09T21:39:58Z',
    })
  })

  it('keeps Human Design centers and channels in separate structures', () => {
    const elements = extractEngineElements('human-design', {
      hd_type: 'Generator',
      authority: 'Sacral',
      profile: '3/5',
      definition: 'Split',
      defined_centers: ['Sacral', 'Root'],
      active_channels: ['43-23', '42-53'],
    })

    expect(elements.map((element) => element.kind)).toEqual(['fact-grid', 'collections', 'relations'])
    const collections = elements.find((element) => element.kind === 'collections')
    if (!collections || collections.kind !== 'collections') throw new Error('Expected collections')
    expect(collections.groups).toEqual([{ id: 'defined-centers', label: 'Defined centers', items: ['Sacral', 'Root'] }])
  })

  it('maps the Gene Keys activation sequence in its named source order', () => {
    const elements = extractEngineElements('gene-keys', {
      activation_sequence: {
        lifes_work: [4, 49],
        evolution: [23, 43],
        radiance: [4, 23],
        purpose: [49, 43],
      },
    })

    expect(elements[0].kind).toBe('sequence')
    if (elements[0].kind !== 'sequence') throw new Error('Expected sequence')
    expect(elements[0].steps.map((step) => step.label)).toEqual(["Life's work", 'Evolution', 'Radiance', 'Purpose'])
    expect(elements[0].sequenceType).toBe('activation')
  })

  it('preserves source-ordered I Ching changing lines between supplied hexagrams', () => {
    const elements = extractEngineElements('i-ching', {
      primary_hexagram: { number: 1, name: 'The Creative' },
      casting: { line_values: [7, 8, 7, 8, 9, 7] },
      changing_lines: [2, 5],
      relating_hexagram: { number: 14, name: 'Great Possession' },
    })

    expect(elements[0].kind).toBe('spread')
    if (elements[0].kind !== 'spread') throw new Error('Expected I Ching spread')
    expect(elements[0].positions.map(({ label }) => label)).toEqual([
      'Primary hexagram',
      'Changing line 2',
      'Changing line 5',
      'Relating hexagram',
    ])
    expect(elements[0].positions.slice(1, 3).map(({ value }) => value)).toEqual([
      'Line value 8',
      'Line value 9',
    ])
  })

  it('renders mock capture-derived output as unresolved source evidence', () => {
    const elements = extractEngineElements('biofield', {
      is_mock_data: true,
      computation_mode: 'placeholder',
      metrics: { coherence: 0.72 },
    })

    expect(elements[0]).toMatchObject({ kind: 'notice', tone: 'unresolved', sourceSystem: 'biofield' })
    expect(elements[1]).toMatchObject({
      kind: 'capture',
      captureState: 'analyzed',
      sourceSystem: 'biofield',
      confidence: 'unverified',
    })
    if (elements[1].kind !== 'capture') throw new Error('Expected capture summary')
    expect(elements[1].observations).toContainEqual(expect.objectContaining({
      label: 'Coherence',
      value: '0.72',
      status: 'unverified',
    }))
  })

  it('maps raaga theory and playable media from the current envelope contract', () => {
    const elements = extractReadingElements({
      engine_id: 'raaga',
      result: {
        melakarta: { num: 15, name: 'Mayamalavagaula', chakra: 3 },
        root_hz: 220,
        swaras: [
          { swara: 'Sa', hz: 220, ratio_num: 1, ratio_den: 1 },
          { swara: 'Re', hz: 231.77, ratio_decimal: 1.0534979423868314 },
        ],
      },
      generated_audio: {
        clip_url: 'https://media.example/raaga.wav',
        root_hz: 220,
      },
    })

    expect(elements.map((element) => element.kind)).toEqual(['fact-grid', 'collections', 'media'])
    const media = elements[2]
    if (media.kind !== 'media') throw new Error('Expected media')
    expect(media.items[0]).toMatchObject({
      mediaType: 'audio',
      status: 'available',
      url: 'https://media.example/raaga.wav',
      sourcePath: 'generated_audio',
    })
  })

  it('maps the sigil artifact method without executing preview markup', () => {
    const elements = extractEngineElements('sigil-forge', {
      intention: 'clarity in the work',
      method: {
        name: 'Word Elimination Method',
        description: 'Condense the source intention into a mark.',
        steps: ['Remove vowels', 'Merge the remaining forms'],
      },
      processing: { remaining_letters: 'CLRTYNHWK', letter_count: 9 },
      svg_preview: { status: 'absent', svg: '<svg onload="alert(1)"></svg>' },
    })

    expect(elements.map((element) => element.kind)).toEqual(['artifact', 'media'])
    const artifact = elements[0]
    if (artifact.kind !== 'artifact') throw new Error('Expected artifact')
    expect(artifact.items).toContainEqual(expect.objectContaining({
      label: 'Method',
      value: 'Word Elimination Method',
      sourcePath: 'sigil-forge.result.method',
    }))
    expect(artifact.steps.map((step) => step.label)).toEqual(['Remove vowels', 'Merge the remaining forms'])
    const media = elements[1]
    if (media.kind !== 'media') throw new Error('Expected media')
    expect(media.items[0]).toMatchObject({ status: 'missing' })
    expect(media.items[0].detail).toContain('no SVG preview')
  })

  it('summarizes observed biofield-capture metrics and quality without invented units', () => {
    const elements = extractEngineElements('biofield-capture', {
      reading_id: 'bio-reading-1',
      session_id: 'bio-session-1',
      analysis_version: 'pip-2',
      metrics: {
        light_quanta_density: 412.4,
        body_symmetry: 0.81,
        pattern_regularity: 0.76,
      },
      quality_assessment: { sufficient_quality: true, sharpness: 0.84 },
    })

    expect(elements).toHaveLength(1)
    expect(elements[0]).toMatchObject({ kind: 'capture', captureState: 'recorded' })
    if (elements[0].kind !== 'capture') throw new Error('Expected capture')
    expect(elements[0].observations).toContainEqual(expect.objectContaining({
      label: 'Body symmetry',
      value: '0.81',
      sourcePath: 'biofield-capture.result.metrics.body_symmetry',
      status: 'recorded',
    }))
    expect(elements[0].observations).toContainEqual(expect.objectContaining({
      label: 'Sufficient quality',
      value: 'Yes',
    }))
  })

  it('keeps capture analysis unverified until a persisted reading or session identity exists', () => {
    const elements = extractEngineElements('biofield-capture', {
      metrics: { body_symmetry: 0.81 },
      quality_assessment: { sufficient_quality: true },
    })

    expect(elements[0]).toMatchObject({
      kind: 'capture',
      captureState: 'analyzed',
    })
    if (elements[0].kind !== 'capture') throw new Error('Expected capture')
    expect(elements[0].observations).not.toHaveLength(0)
    expect(elements[0].observations.every(({ status }) => status === 'unverified')).toBe(true)
  })

  it('makes absent or unsafe generated media explicit', () => {
    const raaga = extractEngineElements('raaga', {
      melakarta: { num: 15, name: 'Mayamalavagaula' },
    })
    const sigil = extractEngineElements('sigil-forge', {
      intention: 'clarity',
      generated_image: { url: 'data:image/svg+xml,<svg onload="alert(1)"></svg>' },
    })
    const raagaMedia = raaga.find((element) => element.kind === 'media')
    const sigilMedia = sigil.find((element) => element.kind === 'media')
    if (!raagaMedia || raagaMedia.kind !== 'media' || !sigilMedia || sigilMedia.kind !== 'media') {
      throw new Error('Expected media states')
    }
    expect(raagaMedia.items[0].status).toBe('missing')
    expect(sigilMedia.items[0].status).toBe('failed')
    expect(sigilMedia.items[0]).not.toHaveProperty('url')
  })

  it.each([
    ['biorhythm', { target_date: '2026-07-26', physical: { percentage: 52, phase: 'Rising', cycle_day: 4 } }, ['cycles']],
    [
      'vedic-clock',
      {
        calculated_for: '2026-07-26T12:00:00+05:30',
        current_dosha: { dosha: 'Pitta' },
        current_organ: { organ: 'Heart', time_window: '11:00–13:00' },
        upcoming_transitions: [{ time: '13:00', new_organ: 'Small Intestine', new_dosha: 'Pitta' }],
      },
      ['fact-grid', 'sequence'],
    ],
    [
      'tarot',
      {
        positions: [{
          card: {
            name: 'Seven of Swords',
            interpretation: { meaning: 'Card interpretation must not be promoted.' },
          },
          meaning: 'What has led to this moment.',
          name: 'Past',
          position: 0,
        }],
      },
      ['spread'],
    ],
    ['i-ching', { primary_hexagram: { number: 1, name: 'The Creative', meaning: 'Source meaning.' } }, ['spread']],
    ['enneagram', { questions: ['What do you notice?'] }, ['questions']],
    [
      'nadabrahman',
      {
        time_recommendation: { prahar_name: 'Madhyahna', time_range: '12:00–15:00', primary_raga: 'Bhimpalasi' },
        recommendations: [{ raga_name: 'Bhimpalasi' }],
      },
      ['fact-grid', 'collections'],
    ],
    ['sacred-geometry', { form: { name: 'Sri Yantra', numerology: 9, symbolism: 'Source symbolism.' } }, ['fact-grid']],
  ] as const)('maps observed %s output into semantic primitives', (engineId, result, expectedKinds) => {
    expect(extractEngineElements(engineId, result).map((element) => element.kind)).toEqual(expectedKinds)
  })

  it('maps the live nested Tarot shape without promoting card interpretation', () => {
    const elements = extractEngineElements('tarot', {
      positions: [{
        card: {
          id: 'swords-7',
          name: 'Seven of Swords',
          isReversed: true,
          interpretation: { meaning: 'Betrayal, deception, and strategy.' },
        },
        meaning: 'What has led to this moment; influences from the past.',
        name: 'Past',
        position: 0,
      }],
    })

    expect(elements).toHaveLength(1)
    if (elements[0].kind !== 'spread') throw new Error('Expected a spread')
    expect(elements[0].positions).toEqual([{
      id: 'position-0',
      label: 'Past',
      value: 'Seven of Swords',
      detail: 'What has led to this moment; influences from the past.',
      status: 'Reversed',
    }])
    expect(JSON.stringify(elements)).not.toContain('Betrayal, deception, and strategy.')
  })

  it('keeps the legitimate flat legacy Tarot shape compatible', () => {
    const elements = extractEngineElements('tarot', {
      positions: [{ position: 'Center', name: 'The Star', meaning: 'Source meaning.' }],
    })

    if (elements[0].kind !== 'spread') throw new Error('Expected a spread')
    expect(elements[0].positions).toEqual([{
      id: 'position-Center',
      label: 'Center',
      value: 'The Star',
      detail: 'Source meaning.',
    }])
  })

  it('keeps null known-engine output visible as unavailable source', () => {
    const elements = extractEngineElements('panchanga', null)
    expect(elements.map((element) => element.kind)).toEqual(['notice', 'raw'])
    expect(elements[0]).toMatchObject({ tone: 'unresolved' })
  })

  it('falls back losslessly when the engine is unknown', () => {
    const result = { nested: { source: true }, values: [1, 2, 3] }
    const elements = extractEngineElements('future-engine', result)

    expect(elements).toHaveLength(1)
    expect(elements[0]).toMatchObject({ kind: 'raw', sourceSystem: 'future-engine', value: result })
  })
})

describe('extractReadingElements', () => {
  it('walks workflow engine outputs in returned order', () => {
    const elements = extractReadingElements({
      workflow_id: 'birth-blueprint',
      engine_outputs: {
        panchanga: { engine_id: 'panchanga', result: { vara_name: 'Somavara', tithi_name: 'Saptami', nakshatra_name: 'Hasta', yoga_name: 'Siddhi', karana_name: 'Bava' } },
        numerology: { engine_id: 'numerology', result: { life_path: { value: 7 } } },
      },
      synthesis: null,
      total_time_ms: 12,
    })

    expect(elements.slice(1).map((element) => element.sourceSystem)).toEqual(['panchanga', 'numerology'])
    expect(elements[0]).toMatchObject({
      kind: 'collections',
      sourceSystem: 'birth-blueprint',
      title: 'Workflow system run ledger',
    })
  })

  it('preserves top-level generated media while extracting workflow envelopes', () => {
    const elements = extractReadingElements({
      workflow_id: 'creative-expression',
      engine_outputs: {
        raaga: {
          engine_id: 'raaga',
          result: {
            melakarta: { num: 15, name: 'Mayamalavagaula' },
            swaras: [{ swara: 'Sa', hz: 220 }],
          },
          generated_audio: { clip_url: 'https://media.example/creative-expression.wav' },
        },
        sigil: {
          engine_id: 'sigil-forge',
          result: {
            intention: 'clarity',
            method: { name: 'Word Elimination', steps: ['Remove vowels'] },
          },
          generated_image: { url: 'https://media.example/creative-expression.png' },
        },
      },
    })

    const media = elements.filter((element) => element.kind === 'media')
    expect(media).toHaveLength(2)
    if (media[0].kind !== 'media' || media[1].kind !== 'media') throw new Error('Expected workflow media')
    expect(media[0].items[0]).toMatchObject({
      status: 'available',
      url: 'https://media.example/creative-expression.wav',
      sourcePath: 'engine_outputs.raaga.generated_audio',
    })
    expect(media[1].items[0]).toMatchObject({
      status: 'available',
      url: 'https://media.example/creative-expression.png',
      sourcePath: 'engine_outputs.sigil.generated_image',
    })
  })

  it('preserves explicit envelope failure text instead of reporting generic null output', () => {
    const elements = extractReadingElements({
      engine_id: 'tarot',
      result: null,
      _error: '<upstream refused "question">',
      status: 'failed',
    })

    expect(elements).toEqual([
      expect.objectContaining({
        kind: 'notice',
        tone: 'warning',
        title: 'Tarot failed',
        body: '<upstream refused "question">',
        sourcePath: '_error',
      }),
    ])
    expect(elements).not.toContainEqual(expect.objectContaining({ id: 'tarot:unavailable' }))
  })

  it('does not treat a nullable envelope error field as a failure', () => {
    const elements = extractReadingElements({
      engine_id: 'tarot',
      result: { positions: [{ position: 'Center', name: 'The Star' }] },
      error: null,
    })

    expect(elements.map((element) => element.kind)).toEqual(['spread'])
  })

  it('distinguishes declared, returned, failed, missing, and capture-gated workflow contributors', () => {
    const elements = extractReadingElements({
      workflow_id: 'birth-blueprint',
      engine_outputs: {
        numerology: { engine_id: 'numerology', result: { life_path: { value: 7 } } },
        'human-design': {
          engine_id: 'human-design',
          result: null,
          error: 'Profile calculation failed.',
          status: 'failed',
        },
      },
    })

    const ledger = elements[0]
    if (ledger.kind !== 'collections') throw new Error('Expected workflow run ledger')
    expect(ledger.groups).toEqual([
      {
        id: 'declared',
        label: 'Declared systems',
        items: ['numerology', 'human-design', 'vimshottari', 'biofield', 'face-reading'],
      },
      { id: 'returned', label: 'Returned systems', items: ['numerology'] },
      { id: 'failed', label: 'Failed systems', items: ['human-design'] },
      { id: 'capture-gated', label: 'Capture-gated systems', items: ['biofield', 'face-reading'] },
      { id: 'missing', label: 'Missing systems', items: ['vimshottari'] },
    ])
    expect(elements).toContainEqual(expect.objectContaining({
      kind: 'notice',
      sourceSystem: 'human-design',
      body: 'Profile calculation failed.',
      sourcePath: 'engine_outputs.human-design.error',
    }))
  })

  it('does not invent declared membership for an unknown workflow', () => {
    const elements = extractReadingElements({
      workflow_id: 'future-workflow',
      engine_outputs: {
        tarot: { engine_id: 'tarot', result: { positions: [] } },
      },
    })

    if (elements[0].kind !== 'collections') throw new Error('Expected workflow run ledger')
    expect(elements[0].groups).toEqual([
      { id: 'returned', label: 'Returned systems', items: ['tarot'] },
    ])
  })

  it('accepts the daily source-payload array shape', () => {
    const elements = extractReadingElements([
      { engine_id: 'panchanga', result: { vara_name: 'Somavara', tithi_name: 'Saptami', nakshatra_name: 'Hasta', yoga_name: 'Siddhi', karana_name: 'Bava' } },
    ])
    expect(elements[0]).toMatchObject({ kind: 'fact-grid', sourceSystem: 'panchanga' })
  })
})

describe('parseDeterministicPayload', () => {
  it('parses the exact fenced JSON persisted by deterministicMarkdown', () => {
    const payload = { engine_id: 'numerology', result: { life_path: { value: 7 } } }
    const body = `## Number pattern\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`
    expect(parseDeterministicPayload(body)).toEqual(payload)
  })

  it('rejects prose, non-json fences, and invalid JSON', () => {
    expect(parseDeterministicPayload('## Witness\n\nA narrative.')).toBeNull()
    expect(parseDeterministicPayload('```txt\n{"engine_id":"x"}\n```')).toBeNull()
    expect(parseDeterministicPayload('```json\n{not valid}\n```')).toBeNull()
  })
})
