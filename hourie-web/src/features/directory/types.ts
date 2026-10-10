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
  responsible_employee_id: number | null
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
  email: string | null
  passport_number: string | null
  employment_date: string | null
  birth_date: string | null
  name: string
  job_title: string
  is_active: boolean
  equipment_in_custody_count: number
  user: { id: number; username: string; email: string | null; role: 'manager' | 'cms_manager' | 'generator_manager' | 'viewer' } | null
}

export type EmployeeDetails = Employee & {
  equipment_in_custody: EquipmentSummary[]
  assigned_sites: Array<{ id: number; name: string }>
  project_assignments: Array<{
    id: number
    project: { id: number; name: string }
    project_role: string
    started_on: string | null
    ended_on: string | null
  }>
  health_insurance_policies: Array<{
    id: number
    policy_number: string
    source: string | null
    starts_on: string | null
    ends_on: string | null
  }>
}

export type CreateEmployeePayload = {
  name: string
  job_title: string
  phone_number: string | null
  passport_number: string | null
  employment_date: string | null
  birth_date: string | null
  project_id: number | null
  project_role: string | null
  assignment_started_on: string | null
  assignment_ended_on: string | null
  create_account: boolean
  email: string | null
  role: 'manager' | 'cms_manager' | 'generator_manager' | 'viewer' | null
  password: string | null
  password_confirmation: string | null
}

export type UpdateEmployeePayload = {
  name: string
  job_title: string
  phone_number: string | null
  passport_number: string | null
  employment_date: string | null
  birth_date: string | null
  project_id: number | null
  project_role: string | null
  assignment_started_on: string | null
  assignment_ended_on: string | null
  username: string | null
  email: string | null
  role: 'manager' | 'cms_manager' | 'generator_manager' | 'viewer'
  password: string | null
  password_confirmation: string | null
}
