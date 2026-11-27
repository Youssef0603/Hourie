import { shiftDate, todayIso } from '../../shared/renewal'
import type { Bond, BondStatus, BondType } from './types'
import { formatDate, formatMoney } from '../../shared/format'
import { expiryStatus } from '../../shared/expiry'
import { operationPhrase } from '../../i18n/operations'

export const bondTypeOptions: { value: BondType }[] = [
  { value: 'advance_payment' },
  { value: 'performance' },
  { value: 'retention' },
  { value: 'eshs' },
]

export function bondTypeLabel(type: BondType) {
  return operationPhrase({
    advance_payment: 'Avance de démarrage',
    performance: 'Bonne exécution',
    retention: 'Retenue de garantie',
    eshs: 'Performance ESHS',
  }[type] ?? type)
}

export function formatBondDate(value: string | null) {
  return formatDate(value, { fallback: operationPhrase('À compléter') })
}

export function formatBondAmount(value: string | number | null, currency = 'XOF') {
  return formatMoney(value ?? 0, currency)
}

export function getBondStatus(bond: Bond): BondStatus {
  return expiryStatus(bond.expires_on)
}

export function bondStatusLabel(status: BondStatus) {
  return operationPhrase(status === 'active' ? 'Active' : status === 'soon' ? 'Expire bientôt' : 'Expirée')
}

/** A bank extension (prorogation) keeps the issue date and pushes the expiry one year further by default. */
export function nextBondExpiry(expiresOn: string | null, today = todayIso()) {
  return shiftDate(expiresOn ?? today, 0, 1)
}
