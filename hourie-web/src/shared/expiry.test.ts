import { describe, expect, it } from 'vitest'
import { expiryStatus } from './expiry'
import { normalizeSearch } from './text'

describe('expiryStatus', () => {
  const now = new Date('2026-11-19T10:00:00')

  it('classifies end dates', () => {
    expect(expiryStatus(null, 30, now)).toBe('active')
    expect(expiryStatus('2026-11-18', 30, now)).toBe('expired')
    expect(expiryStatus('2026-11-19', 30, now)).toBe('soon')
    expect(expiryStatus('2026-12-10', 30, now)).toBe('soon')
    expect(expiryStatus('2027-01-30', 30, now)).toBe('active')
  })
})

describe('normalizeSearch', () => {
  it('ignores accents, case and surrounding spaces', () => {
    expect(normalizeSearch('  Électrogène ')).toBe('electrogene')
  })
})
