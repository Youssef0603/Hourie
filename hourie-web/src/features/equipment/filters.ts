import type { EquipmentFilters } from './types'

export const initialFilters: EquipmentFilters = {
  q: '', category: '', condition: '', operational_situation: '', project_id: '', location_id: '',
  custodian_employee_id: '', brand: '', model: '', serial_number: '', manufacture_year_from: '',
  manufacture_year_to: '', created_from: '', created_to: '', apparent_power_kva_min: '',
  apparent_power_kva_max: '', active_power_kw_min: '', active_power_kw_max: '', frequency_hz_min: '',
  frequency_hz_max: '', engine_hours_min: '', engine_hours_max: '', tank_capacity_litres_min: '',
  tank_capacity_litres_max: '', phases: '', voltage_rating: '', current_rating: '', fuel_type: '',
  page: 1, per_page: 10, sort: 'created_at_desc',
}

export const advancedFilterKeys: Array<keyof EquipmentFilters> = [
  'custodian_employee_id', 'manufacture_year_from', 'manufacture_year_to', 'created_from', 'created_to',
  'apparent_power_kva_min', 'apparent_power_kva_max', 'active_power_kw_min',
  'active_power_kw_max', 'frequency_hz_min', 'frequency_hz_max',
  'engine_hours_min', 'engine_hours_max', 'tank_capacity_litres_min',
  'tank_capacity_litres_max', 'phases', 'voltage_rating', 'current_rating', 'fuel_type',
]
