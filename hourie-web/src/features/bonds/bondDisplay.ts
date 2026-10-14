import type { Bond, BondStatus, BondType } from './types'
import { operationPhrase, operationsLocale } from '../../i18n/operations'

export const bondTypeOptions: { value: BondType }[] = [
  { value: 'advance_payment' },
  { value: 'performance' },
  { value: 'retention' },
]

export function bondTypeLabel(type: BondType) {
  return operationPhrase({
    advance_payment: 'Avance de démarrage',
    performance: 'Bonne exécution',
    retention: 'Retenue de garantie',
  }[type] ?? type)
}

export function formatBondDate(value: string | null) {
  return value ? new Intl.DateTimeFormat(operationsLocale()).format(new Date(`${value}T00:00:00`)) : operationPhrase('À compléter')
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
  return operationPhrase(status === 'active' ? 'Active' : status === 'soon' ? 'Expire bientôt' : 'Expirée')
}
