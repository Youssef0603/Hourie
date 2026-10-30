import { fr } from '../../i18n/fr'
import type { EquipmentSummary } from './types'

export const equipmentTypeFieldKeys = ['equipment_type', 'vehicle_type', 'crane_type', 'system_type'] as const

export function equipmentTypeLabel(equipment: Pick<EquipmentSummary, 'asset_details'>) {
  const details = equipment.asset_details

  if (!details) return null

  for (const key of equipmentTypeFieldKeys) {
    const value = details[key]
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
    if (typeof value === 'number') return String(value)
  }

  return null
}

export function equipmentBrandLabel(equipment: Pick<EquipmentSummary, 'brand' | 'asset_details'>) {
  return [equipmentTypeLabel(equipment), equipment.brand].filter(Boolean).join(' · ') || fr.common.notProvided
}

export function displayedValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === ''
    ? fr.common.notProvided
    : String(value)
}

export function locationName(equipment: EquipmentSummary) {
  if (!equipment.current_location) return fr.common.notProvided

  return equipment.current_location.parent
    ? `${equipment.current_location.parent.name} / ${equipment.current_location.name}`
    : equipment.current_location.name
}

export function measurement(value: string | null | undefined, unit: string) {
  return value ? `${value} ${unit}` : fr.common.toComplete
}
