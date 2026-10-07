import type { RecordHistoryEntry } from '../../shared/components/RecordHistory'

export type InsuranceKind = 'trc_rc' | 'individual_accident' | 'group_health' | 'equipment'

export type InsurancePolicyDocument = {
  id: number
  original_name: string
  mime_type: string
  size_bytes: number
  url: string
}

export type InsuranceEquipmentOption = {
  id: number
  asset_code: string
  name: string
  category_name: string | null
  chassis_number: string | null
}

export type InsurancePolicy = {
  id: number
  insurance_type: InsuranceKind
  policy_number: string
  starts_on: string | null
  ends_on: string | null
  net_premium: string | null
  accessories_amount: string | null
  tax_amount: string | null
  total_amount: string | null
  territory: string | null
  insured_situation: string | null
  source: string | null
  notes: string | null
  project?: { id: number; name: string } | null
  covered_count?: number
  documents?: InsurancePolicyDocument[]
  changes?: RecordHistoryEntry[]
  created_at?: string | null
  employees?: Array<{ id: number; name: string; birth_date: string | null }>
  equipment?: Array<{ id: number; asset_code: string; brand: string | null; model: string | null }>
}
