import type { InsuranceKind, InsurancePolicy } from './types'

export const insuranceTypes: Array<{ code: InsuranceKind; label: string }> = [
  { code: 'trc_rc', label: 'TRC / RC' },
  { code: 'individual_accident', label: 'Accidents individuels' },
  { code: 'group_health', label: 'Santé groupe' },
  { code: 'equipment', label: 'Équipements' },
]

export function insuranceTypeLabel(type: InsuranceKind) {
  return insuranceTypes.find((item) => item.code === type)?.label ?? type
}

export function formatInsuranceAmount(amount: string | number | null) {
  return `${Number(amount ?? 0).toLocaleString('en-US')}`
}

export function formatInsuranceMoney(amount: string | null) {
  return amount === null ? 'À compléter' : `${formatInsuranceAmount(amount)} FCFA`
}

export function formatInsuranceDate(date: string | null) {
  return date ? new Intl.DateTimeFormat('fr-FR').format(new Date(`${date}T00:00:00`)) : 'À compléter'
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
  return status === 'active' ? 'Active' : status === 'soon' ? 'Expire bientôt' : 'Expirée'
}

export function coveredInsuranceLabel(policy: InsurancePolicy) {
  if (policy.insurance_type === 'equipment') return policy.equipment?.length ? `${policy.equipment.length} actif${policy.equipment.length > 1 ? 's' : ''}` : 'Équipements à compléter'
  if (policy.insurance_type === 'individual_accident' || policy.insurance_type === 'group_health') return policy.employees?.length ? `${policy.employees.length} employé${policy.employees.length > 1 ? 's' : ''}` : 'Employés à compléter'
  return policy.project?.name || policy.insured_situation || 'Site / projet à compléter'
}
