export type NamedReference = {
  id: number
  name: string
}

export type EquipmentCondition = string
export type OperationalSituation = string

export type CatalogOption = {
  id: number
  group: 'equipment_condition' | 'operational_situation' | 'maintenance_type' | 'fuel_type' | 'project_status'
  code: string
  label_fr: string
  label_ar: string | null
  color: string | null
  sort_order: number
  is_active?: boolean
}

export type EquipmentSummary = {
  id: number
  display_id: string
  asset_code: string
  created_at: string
  category: NamedReference & { code: string }
  brand: string | null
  model: string | null
  serial_number: string | null
  manufacture_year: number | null
  condition: EquipmentCondition | null
  operational_situation: OperationalSituation | null
  current_location: (NamedReference & {
    parent: NamedReference | null
    project: NamedReference | null
  }) | null
  current_project_assignment: {
    id: number
    project: NamedReference & { responsible: NamedReference | null }
  } | null
  custodian: NamedReference | null
  responsible: NamedReference | null
  responsible_source: 'site' | 'generator' | null
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
  external_technician_phone: string | null
  next_maintenance_date: string | null
  cost: string | null
  cost_currency: string | null
  observations: string | null
  created_by: NamedReference
  created_at: string
}

export type MaintenanceType = string

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
  external_technician_phone: string | null
  next_maintenance_date: string | null
  cost: number | null
  cost_currency: string | null
  observations: string | null
}

export type Equipment = EquipmentSummary & {
  observations: string | null
  generator_details: GeneratorDetails | null
  maintenances: EquipmentMaintenance[]
  changes: EquipmentChange[]
  images: EquipmentImage[]
}

export type EquipmentImage = {
  id: number
  url: string
  original_name: string
  mime_type: string
  size_bytes: number
  created_at: string
}

export type EquipmentChange = {
  id: number
  type: 'initial_import' | 'identity_updated' | 'specifications_updated' | 'condition_changed' | 'operational_situation_changed' | 'location_changed' | 'custodian_changed' | 'project_assignment_changed' | 'maintenance_recorded' | 'maintenance_updated' | 'maintenance_deleted' | 'image_added' | 'image_deleted' | 'archived'
  source: 'import' | 'manual' | 'transfer' | 'maintenance'
  actor: NamedReference | null
  occurred_at: string
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
  manufacture_year_from: string
  manufacture_year_to: string
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
  sort: 'created_at_desc' | 'created_at_asc' | 'manufacture_year_desc' | 'manufacture_year_asc'
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

export type EquipmentImportResult = {
  id: number
  original_filename: string
  status: 'completed'
  imported_at: string
  summary: {
    imported_rows: number
    warning_rows: number
  }
}

export type EquipmentFilterOptions = {
  categories: Array<NamedReference & { code: string }>
  projects: Array<NamedReference & { code: string | null; responsible: NamedReference | null }>
  locations: Array<NamedReference & {
    project_id: number | null
    parent_id: number | null
    location_type: string | null
    project: NamedReference | null
  }>
  employees: NamedReference[]
  fuel_types: string[]
  catalogs: CatalogOption[]
}
