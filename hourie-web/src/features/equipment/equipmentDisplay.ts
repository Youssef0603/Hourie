import { fr } from '../../i18n/fr'
import type { EquipmentSummary } from './types'

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
