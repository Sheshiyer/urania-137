import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PROTECTED_APP_ORIGIN,
  protectedAppHref,
  validateProtectedAppOrigin,
} from './landing'

describe('protected landing CTA origin', () => {
  it('accepts and normalizes only the approved production origin', () => {
    expect(validateProtectedAppOrigin(DEFAULT_PROTECTED_APP_ORIGIN)).toBe(
      'https://app.urania.tryambakam.space',
    )
    expect(protectedAppHref()).toBe('https://app.urania.tryambakam.space/')
  })

  it.each([
    'http://app.urania.tryambakam.space',
    'https://app.urania.tryambakam.space:8443',
    'https://app.urania.tryambakam.space/console',
    'https://app.urania.tryambakam.space/?next=/settings',
    'https://app.urania.tryambakam.space/#/console',
    'https://user:secret@app.urania.tryambakam.space',
    'https://urania.tryambakam.space',
    ' https://app.urania.tryambakam.space',
  ])('rejects unsafe or unexpected destination %s', (value) => {
    expect(() => validateProtectedAppOrigin(value)).toThrow()
  })

  it('permits HTTP only for explicit loopback development', () => {
    expect(
      protectedAppHref('http://127.0.0.1:8788', { development: true }),
    ).toBe('http://127.0.0.1:8788/')
    expect(() =>
      validateProtectedAppOrigin('http://landing.example:8788', { development: true }),
    ).toThrow(/HTTPS/)
  })
})
