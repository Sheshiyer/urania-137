/**
 * P1_AuthBackend focused tests for T-018 (extractIdentity — stable user_id
 * derivation: sub when present, else SHA-256 of lowercased/trimmed email).
 */
import { describe, it, expect } from 'vitest'
import { AccessVerifyError, extractIdentity, sha256Hex } from '../lib/cf-access'

describe('extractIdentity (T-018)', () => {
  it('sub present → id === sub, email normalized', async () => {
    const id = await extractIdentity({ sub: 'cf-sub-123', email: 'Alice@Example.com ' })
    expect(id).toEqual({ id: 'cf-sub-123', email: 'alice@example.com' })
  })

  it('sub absent → id is the deterministic sha-256 of the lowercased email', async () => {
    const a = await extractIdentity({ email: 'alice@example.com' })
    const expected = await sha256Hex('alice@example.com')
    expect(a.id).toBe(expected)
    expect(a.id).toMatch(/^[0-9a-f]{64}$/)
    expect(a.email).toBe('alice@example.com')
  })

  it('byte-identical across repeated calls and across casing/whitespace', async () => {
    const a = await extractIdentity({ email: 'Alice@Example.com ' })
    const b = await extractIdentity({ email: ' ALICE@example.com' })
    const c = await extractIdentity({ email: 'alice@example.com' })
    expect(a.id).toBe(b.id)
    expect(b.id).toBe(c.id)
    expect(a.email).toBe('alice@example.com')
  })

  it('null/blank sub falls back to the email hash', async () => {
    const a = await extractIdentity({ sub: null, email: 'bob@example.com' })
    const b = await extractIdentity({ sub: '   ', email: 'bob@example.com' })
    const expected = await sha256Hex('bob@example.com')
    expect(a.id).toBe(expected)
    expect(b.id).toBe(expected)
  })

  it('matches the frozen worked example (contracts.md §b)', async () => {
    // `Alice@Example.com ` → email `alice@example.com` → (no sub) → sha256 → user_id
    const id = await extractIdentity({ email: 'Alice@Example.com ' })
    expect(id.id).toBe(await sha256Hex('alice@example.com'))
  })

  it('missing email → AccessVerifyError(missing-claims)', async () => {
    await expect(extractIdentity({ sub: 'cf-sub-123' })).rejects.toMatchObject({
      name: 'AccessVerifyError',
      reason: 'missing-claims',
    })
    await expect(extractIdentity({})).rejects.toBeInstanceOf(AccessVerifyError)
  })
})
