import type { EquipmentFilters } from './types'

export const initialFilters: EquipmentFilters = {
  q: '', category: '', condition: '', operational_situation: '', project_id: '', location_id: '',
  custodian_employee_id: '', brand: '', model: '', serial_number: '', chassis_number: '', manufacture_year_from: '',
  manufacture_year_to: '', apparent_power_kva_min: '',
  apparent_power_kva_max: '', active_power_kw_min: '', active_power_kw_max: '', frequency_hz_min: '',
  frequency_hz_max: '', engine_hours_min: '', engine_hours_max: '', tank_capacity_litres_min: '',
  tank_capacity_litres_max: '', phases: '', voltage_rating: '', current_rating: '', fuel_type: '',
  equipment_type: '', sub_category: '', asset_fuel_type: '', inspection_status: '',
  odometer_km_min: '', odometer_km_max: '', unassigned: '', bungalow_type: '', bungalow_group: '',
  air_conditioning: '', with_toilet: '', with_shower: '', supplier: '', length_m_min: '',
  length_m_max: '', width_m_min: '', width_m_max: '', height_m_min: '', height_m_max: '',
  asset_field: '', asset_value: '',
  page: 1, per_page: 10, sort: 'manufacture_year_desc',
}

export const advancedFilterKeys: Array<keyof EquipmentFilters> = [
  'custodian_employee_id', 'chassis_number', 'manufacture_year_from', 'manufacture_year_to',
  'apparent_power_kva_min', 'apparent_power_kva_max', 'active_power_kw_min',
  'active_power_kw_max', 'frequency_hz_min', 'frequency_hz_max',
  'engine_hours_min', 'engine_hours_max', 'tank_capacity_litres_min',
  'tank_capacity_litres_max', 'phases', 'voltage_rating', 'current_rating', 'fuel_type',
]
