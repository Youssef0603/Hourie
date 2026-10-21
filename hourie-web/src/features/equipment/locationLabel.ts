import type { EquipmentFilterOptions } from './types'

type LocationOption = EquipmentFilterOptions['locations'][number]

export function filterableLocationOptions(
  locations: EquipmentFilterOptions['locations'],
  projectId: string,
): EquipmentFilterOptions['locations'] {
  return locations
    .filter((location) => (
      projectId === ''
        ? location.parent_id !== null || location.location_type === 'company_location'
        : location.parent_id !== null && String(location.project_id) === projectId
    ))
    .sort((first, second) => {
      const firstIsCompanyLocation = first.location_type === 'company_location'
      const secondIsCompanyLocation = second.location_type === 'company_location'

      if (firstIsCompanyLocation !== secondIsCompanyLocation) {
        return firstIsCompanyLocation ? -1 : 1
      }

      return locationOptionLabel(first).localeCompare(locationOptionLabel(second), 'fr', {
        sensitivity: 'base',
      })
    })
}

export function locationOptionLabel(location: LocationOption): string {
  const locationName = location.name.trim()
  const projectName = location.project?.name.trim()

  if (!projectName || locationName.localeCompare(projectName, undefined, { sensitivity: 'base' }) === 0) {
    return locationName
  }

  return `${locationName} — ${projectName}`
}
