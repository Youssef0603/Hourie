import type { Bond, BondStatus, BondType } from './types'

export const bondTypeOptions: { value: BondType; label: string }[] = [
  { value: 'advance_payment', label: 'Avance de démarrage' },
  { value: 'performance', label: 'Bonne exécution' },
  { value: 'retention', label: 'Retenue de garantie' },
]

export function bondTypeLabel(type: BondType) {
  return bondTypeOptions.find((option) => option.value === type)?.label ?? type
}

export function formatBondDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('fr-FR').format(new Date(`${value}T00:00:00`)) : 'À compléter'
}

export function formatBondAmount(value: string | number | null, currency = 'XOF') {
  return `${Number(value ?? 0).toLocaleString('en-US')} ${currency === 'XOF' ? 'FCFA' : currency}`
}

export function getBondStatus(bond: Bond): BondStatus {
  if (!bond.expires_on) return 'active'
  const end = new Date(`${bond.expires_on}T23:59:59`)
  const now = new Date()
  if (end < now) return 'expired'
  const limit = new Date()
  limit.setDate(now.getDate() + 30)
  return end <= limit ? 'soon' : 'active'
}

export function bondStatusLabel(status: BondStatus) {
  return status === 'active' ? 'Active' : status === 'soon' ? 'Expire bientôt' : 'Expirée'
}
