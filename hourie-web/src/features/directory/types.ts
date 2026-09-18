import type { EquipmentSummary } from '../equipment/types'

export type Site = {
  id: number
  code: string | null
  name: string
  is_active: boolean
  active_equipment_count: number
  locations: Array<{
    id: number
    parent_id: number | null
    name: string
    location_type: string | null
  }>
}

export type SiteDetails = Site & {
  equipment: EquipmentSummary[]
}

export type Employee = {
  id: number
  phone_number: string | null
  name: string
  is_active: boolean
  equipment_in_custody_count: number
  user: { id: number; email: string; role: 'manager' | 'generator_manager' | 'viewer' } | null
}

export type EmployeeDetails = Employee & {
  equipment_in_custody: EquipmentSummary[]
}

export type CreateEmployeePayload = {
  name: string
  phone_number: string | null
  email: string
  role: 'manager' | 'generator_manager' | 'viewer'
  password: string
  password_confirmation: string
}
