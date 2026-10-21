import { describe, expect, it } from 'vitest'
import type { EquipmentFilterOptions } from './types'
import { filterableLocationOptions } from './locationLabel'

type LocationOption = EquipmentFilterOptions['locations'][number]

function location(overrides: Partial<LocationOption>): LocationOption {
  return {
    id: 1,
    name: 'Base',
    project_id: 1,
    parent_id: 10,
    location_type: 'project_area',
    project: { id: 1, name: 'Bassam' },
    ...overrides,
  }
}

describe('filterableLocationOptions', () => {
  it('places company locations first when filtering across all sites', () => {
    const options = filterableLocationOptions([
      location({ id: 3, name: 'Centrale' }),
      location({ id: 17, name: 'GARAGE', project_id: null, parent_id: null, location_type: 'company_location', project: null }),
      location({ id: 16, name: 'BUREAU', project_id: null, parent_id: null, location_type: 'company_location', project: null }),
      location({ id: 2, name: 'Bassam', parent_id: null, location_type: 'project_site' }),
    ], '')

    expect(options.map((option) => option.name)).toEqual(['BUREAU', 'GARAGE', 'Centrale'])
  })

  it('shows only the selected site areas after choosing a site', () => {
    const options = filterableLocationOptions([
      location({ id: 16, name: 'BUREAU', project_id: null, parent_id: null, location_type: 'company_location', project: null }),
      location({ id: 2, name: 'Base', project_id: 1 }),
      location({ id: 3, name: 'Centrale', project_id: 2, project: { id: 2, name: 'Vridi' } }),
    ], '2')

    expect(options.map((option) => option.name)).toEqual(['Centrale'])
  })
})
