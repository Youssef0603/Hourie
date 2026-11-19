import { describe, expect, it } from 'vitest'
import { formatAmount, formatDate, formatDateTime, formatFileSize, formatMoney } from './format'

const readable = (value: string) => value.replace(/\s/g, ' ')

describe('French monetary formatting', () => {
  it.each([1377509.7, '1377509.70', '1 377 509,70', '1\u202f377\u202f509,70', '1,377,509.70'])(
    'preserves the amount and decimals for %s',
    (value) => expect(readable(formatMoney(value))).toBe('1 377 509,70 FCFA'),
  )

  it('uses a decimal comma and supports currencies', () => {
    expect(formatMoney('12,50', 'EUR')).toBe('12,50 EUR')
    expect(readable(formatMoney('2100', 'XOF'))).toBe('2 100 FCFA')
    expect(formatAmount(0)).toBe('0')
  })
})

describe('date and size formatting', () => {
  it('reads date-only values as local dates', () => {
    expect(formatDate('2026-11-19', { locale: 'fr-FR' })).toBe('19/11/2026')
    expect(formatDate('2026-11-19', { locale: 'fr-FR', style: 'medium' })).toBe('19 nov. 2026')
    expect(formatDate('2026-11-19', { locale: 'fr-FR', style: 'long' })).toBe('19 novembre 2026')
  })

  it('returns the fallback for empty values', () => {
    expect(formatDate(null, { fallback: 'À compléter' })).toBe('À compléter')
    expect(formatDateTime(undefined, { fallback: '—' })).toBe('—')
  })

  it('formats file sizes in French units', () => {
    expect(formatFileSize(200)).toBe('1 Ko')
    expect(formatFileSize(50 * 1024)).toBe('50 Ko')
    expect(formatFileSize(3.5 * 1024 * 1024)).toBe('3.5 Mo')
  })
})
