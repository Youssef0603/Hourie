import type { EquipmentFilterOptions } from './types'

type LocationOption = EquipmentFilterOptions['locations'][number]

export function locationOptionLabel(location: LocationOption): string {
  const locationName = location.name.trim()
  const projectName = location.project?.name.trim()

  if (!projectName || locationName.localeCompare(projectName, undefined, { sensitivity: 'base' }) === 0) {
    return locationName
  }

  return `${locationName} — ${projectName}`
}
