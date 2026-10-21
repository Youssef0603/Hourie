export function formatAmount(value: unknown): string {
  let normalized = typeof value === 'string' ? value.replace(/\s/g, '') : value
  if (typeof normalized === 'string' && normalized.includes(',')) {
    // Accept French decimal commas as well as legacy English grouped amounts.
    normalized = /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(normalized)
      ? normalized.replace(/,/g, '')
      : normalized.replace(',', '.')
  }
  const amount = Number(normalized)
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(amount)
    : String(value)
}

export function formatMoney(value: unknown, currency: string = 'FCFA'): string {
  return `${formatAmount(value)} ${currency === 'XOF' ? 'FCFA' : currency}`
}
