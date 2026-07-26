import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ReadingSourcePayload } from './ReadingSourcePayload'

describe('ReadingSourcePayload', () => {
  it('recursively redacts persisted inputs, image bodies, binary data, and credentials', () => {
    const html = renderToStaticMarkup(createElement(ReadingSourcePayload, {
      payload: {
        engine_id: 'biofield-capture',
        input: {
          subject: 'must-not-leak',
          nested: { image_data: 'private-image-body' },
        },
        result: {
          metrics: { coherence: 0.72 },
          future_unreviewed_field: 'must-not-leak',
          captures: [{
            capture_input: { pixels: 'must-not-leak' },
            image: `data:image/png;base64,${'A'.repeat(128)}`,
          }],
          binary_data: [1, 2, 3],
          credentials: { api_key: 'must-not-leak' },
          access_token: 'must-not-leak',
          token: 'must-not-leak',
          secret: 'must-not-leak',
        },
        unreviewed_envelope_field: 'must-not-leak',
      },
    }))

    expect(html).toContain('&quot;engine_id&quot;: &quot;biofield-capture&quot;')
    expect(html).toContain('&quot;coherence&quot;: 0.72')
    expect(html).toContain('[REDACTED]')
    expect(html).not.toContain('must-not-leak')
    expect(html).not.toContain('data:image/png;base64')
    expect(html).not.toContain('&quot;pixels&quot;')
    expect(html).not.toContain('&quot;api_key&quot;')
    expect(html).toContain('&quot;future_unreviewed_field&quot;: &quot;[REDACTED]&quot;')
    expect(html).toContain('&quot;unreviewed_envelope_field&quot;: &quot;[REDACTED]&quot;')
  })

  it('keeps ordinary nested engine output visible and JSON-escapes markup', () => {
    const html = renderToStaticMarkup(createElement(ReadingSourcePayload, {
      payload: {
        engine_id: 'i-ching',
        result: {
          primary_hexagram: {
            number: 1,
            name: 'The Creative',
            image: 'The movement of heaven is full of power.',
          },
          text: '<script>alert("source")</script>',
        },
      },
    }))

    expect(html).toContain('&quot;primary_hexagram&quot;')
    expect(html).toContain('&quot;name&quot;: &quot;The Creative&quot;')
    expect(html).toContain('The movement of heaven is full of power.')
    expect(html).toContain('&lt;script&gt;alert(\\&quot;source\\&quot;)&lt;/script&gt;')
    expect(html).not.toContain('<script>')
    expect(html).toContain('<details')
    expect(html).not.toContain('<details open')
    expect(html).toContain('privacy-filtered')
  })

  it('redacts credentials embedded in otherwise ordinary URL fields', () => {
    const html = renderToStaticMarkup(createElement(ReadingSourcePayload, {
      payload: {
        generated_audio: {
          clip_url: 'https://media.example/clip.wav?access_token=secret',
        },
        image_url: 'https://media.example/image.png?token=secret',
        callback: 'https://service.example/callback?api_key=secret',
        public_url: 'https://media.example/public.png?size=large',
      },
    }))

    expect(html.match(/\[REDACTED\]/g)).toHaveLength(3)
    expect(html).toContain('https://media.example/public.png?size=large')
    expect(html).not.toContain('access_token=secret')
    expect(html).not.toContain('token=secret')
    expect(html).not.toContain('api_key=secret')
  })
})
