import type { InsuranceKind, InsurancePolicy } from './types'
import { formatAmount, formatDate } from '../../shared/format'
import { expiryStatus, type ExpiryStatus } from '../../shared/expiry'
import { operationsText } from '../../i18n/operations'

export const insuranceTypes: Array<{ code: InsuranceKind }> = [
  { code: 'trc_rc' },
  { code: 'individual_accident' },
  { code: 'group_health' },
  { code: 'equipment' },
]

export function insuranceTypeLabel(type: InsuranceKind) {
  return operationsText().insurance.types[type] ?? type
}

export function formatInsuranceAmount(amount: string | number | null) {
  return formatAmount(amount ?? 0)
}

export function formatInsuranceMoney(amount: string | null) {
  return amount === null ? operationsText().insurance.toComplete : `${formatInsuranceAmount(amount)} FCFA`
}

export function formatInsuranceDate(date: string | null) {
  return formatDate(date, { fallback: operationsText().insurance.toComplete })
}

export function insurancePolicyStatus(policy: InsurancePolicy): ExpiryStatus {
  return expiryStatus(policy.ends_on)
}

export function insuranceStatusLabel(status: ReturnType<typeof insurancePolicyStatus>) {
  return operationsText().insurance.statuses[status]
}

export function coveredInsuranceLabel(policy: InsurancePolicy) {
  const text = operationsText().insurance
  if (policy.insurance_type === 'equipment') { const count = policy.covered_count ?? policy.equipment?.length ?? 0; return count ? text.assetsCovered(count) : text.equipmentToComplete }
  if (policy.insurance_type === 'individual_accident' || policy.insurance_type === 'group_health') { const count = policy.covered_count ?? policy.employees?.length ?? 0; return count ? text.employeesCovered(count) : text.employeesToComplete }
  return policy.project?.name || policy.insured_situation || text.projectToComplete
}
