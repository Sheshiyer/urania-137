/**
 * P3 QA shared helpers (T-049..T-054) — dependency-free HTTP + assertion
 * utilities for the /api/folio e2e verification scripts. Each script targets a
 * RUNNING `wrangler pages dev` instance (P3_QA owns port 8789 exclusively).
 */

export class GateError extends Error {}

export function expect(cond, msg) {
  if (!cond) throw new GateError(`EXPECT FAILED: ${msg}`)
}

export function eq(actual, expected, msg) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) throw new GateError(`EXPECT FAILED: ${msg}\n  expected: ${e}\n  actual:   ${a}`)
}

export async function req(base, method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json, text }
}

/** Exact key-set assertion (order-insensitive). */
export function expectKeys(obj, keys, msg) {
  expect(typeof obj === 'object' && obj !== null && !Array.isArray(obj), `${msg}: not a plain object`)
  eq([...Object.keys(obj)].sort(), [...keys].sort(), `${msg}: key set drift`)
}

/** The frozen ReadingDTO runtime shape (src/lib/api/contract.ts). */
export function expectReadingDTO(r, msg) {
  expectKeys(r, ['id', 'nodeId', 'nodeLabel', 'mode', 'title', 'content', 'createdAt', 'favorite'], msg)
  expect(typeof r.id === 'string' && r.id.length > 0, `${msg}: id must be a non-empty string`)
  expect(typeof r.nodeId === 'string', `${msg}: nodeId must be a string`)
  expect(typeof r.nodeLabel === 'string', `${msg}: nodeLabel must be a string`)
  expect(typeof r.mode === 'string', `${msg}: mode must be a string`)
  expect(typeof r.title === 'string', `${msg}: title must be a string`)
  expect(typeof r.content === 'string', `${msg}: content must be a string`)
  expect(typeof r.createdAt === 'number' && Number.isFinite(r.createdAt), `${msg}: createdAt must be a finite number`)
  expect(typeof r.favorite === 'boolean', `${msg}: favorite must be a boolean`)
}

export function log(line) {
  console.log(line)
}

export async function main(run) {
  try {
    await run()
  } catch (err) {
    console.error(err instanceof GateError ? err.message : err)
    process.exit(1)
  }
}
