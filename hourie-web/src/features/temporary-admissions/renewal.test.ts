import { describe, expect, it } from 'vitest'
import { addMonthsNoOverflow, predictAdmissionExpiry } from './renewal'

describe('AT renewal preview', () => {
  it('keeps the last day of a shorter month, like the server', () => {
    expect(addMonthsNoOverflow('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonthsNoOverflow('2027-10-06', 12)).toBe('2028-10-06')
  })

  it('extends from the current expiry by the AT validity', () => {
    expect(predictAdmissionExpiry('2027-10-06', '2027-10-01', 12)).toBe('2028-10-06')
    expect(predictAdmissionExpiry('2027-10-06', '2027-09-15', 6)).toBe('2028-04-06')
  })

  it('jumps to the period closest to a late AT date, so missing old ATs do not shift the expiry', () => {
    expect(predictAdmissionExpiry('2025-10-06', '2027-10-01', 12)).toBe('2028-10-06')
  })
})
