export type NamedReference = {
  id: number
  name: string
}

export type EquipmentCondition =
  | 'functional'
  | 'defective'
  | 'beyond_repair'

export type OperationalSituation =
  | 'in_use'
  | 'in_reserve'
  | 'under_maintenance'
  | 'out_of_service'

export type EquipmentSummary = {
  id: number
  display_id: string
  asset_code: string
  created_at: string
  category: NamedReference & { code: string }
  brand: string | null
  model: string | null
  serial_number: string | null
  purchase_year: number | null
  condition: EquipmentCondition | null
  operational_situation: OperationalSituation | null
  current_location: (NamedReference & {
    parent: NamedReference | null
    project: NamedReference | null
  }) | null
  current_project_assignment: {
    id: number
    project: NamedReference
  } | null
  custodian: NamedReference | null
  power: {
    apparent_kva: string | null
    active_kw: string | null
  } | null
  fuel_type: string | null
}

export type GeneratorDetails = {
  apparent_power_kva: string | null
  active_power_kw: string | null
  phases: number | null
  voltage_rating: string | null
  frequency_hz: string | null
  current_rating: string | null
  fuel_type: string | null
  tank_capacity_litres: string | null
  current_engine_hours: string | null
}

export type EquipmentMaintenance = {
  id: number
  maintenance_date: string
  engine_hours: string | null
  intervention_type: MaintenanceType
  oil_changed: boolean | null
  oil_quantity_litres: string | null
  oil_filter_changed: boolean | null
  fuel_filter_changed: boolean | null
  air_filter_changed: boolean | null
  battery_serviced: boolean | null
  coolant_serviced: boolean | null
  technician: NamedReference | null
  technician_name: string | null
  next_maintenance_date: string | null
  cost: string | null
  cost_currency: string | null
  observations: string | null
  created_by: NamedReference
  created_at: string
}

export type MaintenanceType = 'urgent' | 'electrical' | 'mechanical' | 'hydraulic'

export type MaintenancePayload = {
  maintenance_date: string
  engine_hours: number | null
  intervention_type: MaintenanceType
  oil_changed: boolean | null
  oil_quantity_litres: number | null
  oil_filter_changed: boolean | null
  fuel_filter_changed: boolean | null
  air_filter_changed: boolean | null
  battery_serviced: boolean | null
  coolant_serviced: boolean | null
  technician_employee_id: number | null
  technician_name: string | null
  next_maintenance_date: string | null
  cost: number | null
  cost_currency: string | null
  observations: string | null
}

export type Equipment = EquipmentSummary & {
  observations: string | null
  generator_details: GeneratorDetails | null
  maintenances: EquipmentMaintenance[]
}

export type EquipmentFilters = {
  q: string
  category: string
  condition: string
  operational_situation: string
  project_id: string
  location_id: string
  custodian_employee_id: string
  brand: string
  model: string
  serial_number: string
  purchase_year_from: string
  purchase_year_to: string
  created_from: string
  created_to: string
  apparent_power_kva_min: string
  apparent_power_kva_max: string
  active_power_kw_min: string
  active_power_kw_max: string
  frequency_hz_min: string
  frequency_hz_max: string
  engine_hours_min: string
  engine_hours_max: string
  tank_capacity_litres_min: string
  tank_capacity_litres_max: string
  phases: string
  voltage_rating: string
  current_rating: string
  fuel_type: string
  page: number
  per_page: number
  sort: 'created_at_desc' | 'created_at_asc'
}

export type EquipmentListResponse = {
  data: EquipmentSummary[]
  meta: {
    current_page: number
    from: number | null
    last_page: number
    per_page: number
    to: number | null
    total: number
  }
}

export type EquipmentFilterOptions = {
  categories: Array<NamedReference & { code: string }>
  projects: Array<NamedReference & { code: string | null }>
  locations: Array<NamedReference & {
    project_id: number | null
    parent_id: number | null
    location_type: string | null
    project: NamedReference | null
  }>
  employees: NamedReference[]
  fuel_types: string[]
}
