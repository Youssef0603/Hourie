import { describe, expect, it } from 'vitest'
import { formatAmount, formatMoney } from './formatMoney'

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
