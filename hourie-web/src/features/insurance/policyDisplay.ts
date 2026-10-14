import type { InsuranceKind, InsurancePolicy } from './types'
import { operationsLocale, operationsText } from '../../i18n/operations'

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
  return `${Number(amount ?? 0).toLocaleString('en-US')}`
}

export function formatInsuranceMoney(amount: string | null) {
  return amount === null ? operationsText().insurance.toComplete : `${formatInsuranceAmount(amount)} FCFA`
}

export function formatInsuranceDate(date: string | null) {
  return date ? new Intl.DateTimeFormat(operationsLocale()).format(new Date(`${date}T00:00:00`)) : operationsText().insurance.toComplete
}

export function insurancePolicyStatus(policy: InsurancePolicy): 'active' | 'soon' | 'expired' {
  if (!policy.ends_on) return 'active'
  const end = new Date(`${policy.ends_on}T23:59:59`)
  const now = new Date()
  if (end < now) return 'expired'
  const limit = new Date()
  limit.setDate(now.getDate() + 30)
  return end <= limit ? 'soon' : 'active'
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
