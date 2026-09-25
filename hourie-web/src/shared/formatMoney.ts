export function formatMoney(value: unknown, currency: string = 'FCFA'): string {
  const normalized = typeof value === 'string' ? value.replace(/[\s,]/g, '') : value
  const amount = Number(normalized)
  const formatted = Number.isFinite(amount)
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount)
    : String(value)

  return `${formatted} ${currency === 'XOF' ? 'FCFA' : currency}`
}
