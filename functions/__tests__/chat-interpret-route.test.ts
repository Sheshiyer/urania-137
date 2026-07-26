import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import type { Env } from '../lib/env'
import type { InterpretationResponse } from '../lib/agents/types'
import { onRequest } from '../api/[[path]]'
import { createReading, upsertUser } from '../lib/db'
import { makeFakeD1 } from './fake-d1'

const LOCAL = 'http://localhost:8788'
const ROUTE = `${LOCAL}/api/chat/interpret`
const A = 'dev:a@example.com'
const B = 'dev:b@example.com'

function makeCtx(
  request: Request,
  db: unknown,
  devEmail: string | undefined,
  override: Partial<Env> = {},
) {
  const env = {
    DB: db,
    CF_ACCESS_AUD: 'aud-tag',
    CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
    SELEMENE_API_KEY: '',
    SELEMENE_API_URL: 'https://proxy.example',
    DEV_IDENTITY_EMAIL: devEmail,
    ...override,
  } as Env
  return { request, env } as unknown as Parameters<typeof onRequest>[0]
}

function post(body: unknown): Request {
  return new Request(ROUTE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/chat/interpret', () => {
  let fake: ReturnType<typeof makeFakeD1>
  let db: D1Database
  let ownedReadingId: string

  beforeEach(async () => {
    fake = makeFakeD1()
    db = fake.db as unknown as D1Database
    await upsertUser(db, { id: A, email: 'a@example.com' })
    await upsertUser(db, { id: B, email: 'b@example.com' })
    const reading = await createReading(db, A, {
      nodeId: 'birth-witness',
      nodeLabel: 'Birth Witness',
      mode: 'numerology',
      title: 'Number codes',
      content: 'Life path: 7.\n\nExpression: 3.',
    })
    ownedReadingId = reading.id
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('authenticates before parsing the interpretation body', async () => {
    const response = await onRequest(makeCtx(post({}), fake.db, undefined))
    expect(response.status).toBe(401)
  })

  it('requires an explicit known route and bounded question', async () => {
    const response = await onRequest(
      makeCtx(
        post({ readingId: ownedReadingId, route: 'general', question: 'What now?' }),
        fake.db,
        'a@example.com',
      ),
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'BAD_REQUEST',
      message: expect.stringContaining('pattern, embodied, synthesis, navigate'),
    })
  })

  it('makes cross-owner and unknown reading ids indistinguishable', async () => {
    const body = (readingId: string) => ({
      readingId,
      route: 'pattern',
      question: 'What stands out?',
    })
    const crossOwner = await onRequest(
      makeCtx(post(body(ownedReadingId)), fake.db, 'b@example.com'),
    )
    const unknown = await onRequest(
      makeCtx(post(body('unknown-reading')), fake.db, 'b@example.com'),
    )
    expect(crossOwner.status).toBe(404)
    expect(unknown.status).toBe(404)
    expect(await crossOwner.json()).toEqual(await unknown.json())
  })

  it('loads owned evidence server-side and returns the validated contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const upstream = JSON.parse(String(init?.body)) as {
          messages: Array<{ role: string; content: string }>
        }
        expect(upstream.messages[0].content).toContain('untrusted quoted data')
        expect(upstream.messages[1].content).toContain('Life path: 7.')
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    answer: 'You are asking what stands out; the reading places 7 beside 3.',
                    claims: [
                      {
                        text: 'The reading records a life path value of 7.',
                        status: 'source-grounded',
                        evidenceIds: [
                          `reading:${encodeURIComponent(ownedReadingId)}:excerpt:1`,
                        ],
                      },
                    ],
                    question: 'Which value feels closer to your present concern?',
                    targets: [
                      {
                        kind: 'evidence',
                        nodeId: 'birth-witness',
                        label: 'Life path excerpt',
                        evidenceId: `reading:${encodeURIComponent(ownedReadingId)}:excerpt:1`,
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }),
    )

    const response = await onRequest(
      makeCtx(
        post({
          readingId: ownedReadingId,
          route: 'pattern',
          question: 'What stands out?',
          history: [{ role: 'user', content: 'I keep returning to the contrast.' }],
        }),
        fake.db,
        'a@example.com',
      ),
    )
    expect(response.status).toBe(200)
    const result = (await response.json()) as InterpretationResponse
    expect(result).toMatchObject({
      route: 'pattern',
      agentId: 'aletheios',
      degraded: false,
      provenance: {
        readingId: ownedReadingId,
        nodeId: 'birth-witness',
        model: 'selemene-llm-proxy',
      },
    })
    expect(result.claims).toHaveLength(1)
    expect(result.targets[0].kind).toBe('evidence')
  })

  it('returns an explicit zero-claim degraded contract when the model fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('upstream down', { status: 503 })))
    const response = await onRequest(
      makeCtx(
        post({
          readingId: ownedReadingId,
          route: 'embodied',
          question: 'What can I notice?',
        }),
        fake.db,
        'a@example.com',
      ),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      route: 'embodied',
      agentId: 'pichet',
      degraded: true,
      failure: 'model-unavailable',
      claims: [],
      provenance: { model: 'none' },
    })
  })
})
