import type { EquipmentSummary } from '../equipment/types'

export type ProjectStatus = string

export type Site = {
  id: number
  name: string
  status: ProjectStatus
  address: string | null
  start_date: string | null
  expected_end_date: string | null
  notes: string | null
  responsible: { id: number; name: string } | null
  is_active: boolean
  active_equipment_count: number
  locations: Array<{
    id: number
    parent_id: number | null
    name: string
    location_type: string | null
  }>
  changes: SiteChange[]
}

export type SiteChange = {
  id: number
  action: 'created' | 'updated' | 'archived'
  actor: { id: number; name: string } | null
  occurred_at: string
}

export type CreateSitePayload = {
  name: string
  status: ProjectStatus
  address: string | null
  start_date: string | null
  expected_end_date: string | null
  notes: string | null
  responsible_employee_id: number
  locations: string[]
}

export type UpdateSitePayload = Omit<CreateSitePayload, 'locations'> & {
  locations: Array<{ id: number | null; name: string }>
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
  user: { id: number; username: string; email: string | null; role: 'manager' | 'cms_manager' | 'generator_manager' | 'viewer' } | null
}

export type EmployeeDetails = Employee & {
  equipment_in_custody: EquipmentSummary[]
}

export type CreateEmployeePayload = {
  name: string
  phone_number: string | null
  email: string | null
  role: 'manager' | 'cms_manager' | 'generator_manager' | 'viewer'
  password: string
  password_confirmation: string
}

export type UpdateEmployeePayload = {
  name: string
  phone_number: string | null
  username: string | null
  email: string | null
  role: 'manager' | 'cms_manager' | 'generator_manager' | 'viewer'
  password: string | null
  password_confirmation: string | null
}
