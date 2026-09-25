import { type ChangeEvent } from 'react'
import { fr, type Language } from '../../../i18n/fr'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'
import { catalogLabel, catalogOptions } from '../catalogs'
import { assetFieldLabel, type AssetField } from '../assetCategories'
import { locationOptionLabel } from '../locationLabel'
import type { EquipmentFilterOptions, EquipmentFilters } from '../types'

type AssetFilterDrawerProps = {
  fields: AssetField[]
  filters: EquipmentFilters
  language: Language
  options: EquipmentFilterOptions | null
  onChange: (name: keyof EquipmentFilters, value: string) => void
  onClose: () => void
}

export function AssetFilterDrawer({ fields, filters, language, options, onChange, onClose }: AssetFilterDrawerProps) {
  const physicalLocations = (options?.locations ?? []).filter((location) => (
    filters.project_id === ''
      ? location.parent_id !== null || location.location_type === 'company_location'
      : location.parent_id !== null && String(location.project_id) === filters.project_id
  ))
  const field = (name: keyof EquipmentFilters) => ({
    value: String(filters[name]),
    onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(name, event.target.value),
  })

  return <div className="filter-drawer-backdrop" onMouseDown={onClose}>
    <aside className="filter-drawer" role="dialog" aria-modal="true" aria-label={fr.equipment.filters} onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="section-label">{fr.assets.title}</p><h2>{fr.equipment.filters}</h2></div><button type="button" onClick={onClose} aria-label={fr.common.close}><ActionIcon name="close" /></button></header>
      <div className="filter-drawer-content">
        <fieldset className="drawer-basic-filters"><legend>{fr.equipment.filters}</legend><div className="advanced-filter-grid">
          <label><span>{fr.equipment.condition}</span><SearchableSelect ariaLabel={fr.equipment.condition} value={filters.condition} onChange={(value) => onChange('condition', value)} placeholder={fr.common.all} options={catalogOptions(options?.catalogs, 'equipment_condition').map((option) => ({ value: option.code, label: catalogLabel(options?.catalogs, 'equipment_condition', option.code) }))} /></label>
          <label><span>{fr.equipment.situation}</span><SearchableSelect ariaLabel={fr.equipment.situation} value={filters.operational_situation} onChange={(value) => onChange('operational_situation', value)} placeholder={fr.common.all} options={catalogOptions(options?.catalogs, 'operational_situation').map((option) => ({ value: option.code, label: catalogLabel(options?.catalogs, 'operational_situation', option.code) }))} /></label>
          <label><span>{fr.equipment.project}</span><SearchableSelect ariaLabel={fr.equipment.project} value={filters.project_id} onChange={(value) => { onChange('project_id', value); onChange('location_id', '') }} placeholder={fr.common.all} options={(options?.projects ?? []).map((project) => ({ value: String(project.id), label: project.name }))} /></label>
          <label><span>{fr.equipment.location}</span><SearchableSelect ariaLabel={fr.equipment.location} value={filters.location_id} onChange={(value) => onChange('location_id', value)} placeholder={fr.common.all} options={physicalLocations.map((location) => ({ value: String(location.id), label: filters.project_id === '' ? locationOptionLabel(location) : location.name }))} /></label>
          <label><span>{fr.equipment.custodian}</span><SearchableSelect ariaLabel={fr.equipment.custodian} value={filters.custodian_employee_id} onChange={(value) => onChange('custodian_employee_id', value)} placeholder={fr.common.all} options={(options?.employees ?? []).map((employee) => ({ value: String(employee.id), label: employee.name }))} /></label>
          <label><span>{fr.equipment.sort}</span><SearchableSelect ariaLabel={fr.equipment.sort} value={filters.sort} onChange={(value) => onChange('sort', value)} placeholder={fr.equipment.manufacturedNewestFirst} includeEmpty={false} options={[{ value: 'manufacture_year_desc', label: fr.equipment.manufacturedNewestFirst }, { value: 'manufacture_year_asc', label: fr.equipment.manufacturedOldestFirst }]} /></label>
        </div></fieldset>
        <div className="advanced-filter-panel">
          <fieldset><legend>{fr.equipment.assignmentAndDateFilters}</legend><div className="advanced-filter-grid">
            <label><span>{fr.equipment.yearFrom}</span><input type="number" min="1900" max="2100" {...field('manufacture_year_from')} /></label>
            <label><span>{fr.equipment.yearTo}</span><input type="number" min="1900" max="2100" {...field('manufacture_year_to')} /></label>
          </div></fieldset>
          {fields.length > 0 && <fieldset><legend>{fr.assets.typeFilter}</legend><div className="advanced-filter-grid">
            <label><span>{fr.assets.typeFilter}</span><SearchableSelect ariaLabel={fr.assets.typeFilter} value={filters.asset_field} onChange={(value) => { onChange('asset_field', value); onChange('asset_value', '') }} placeholder={fr.common.all} options={fields.map((assetField) => ({ value: assetField.key, label: assetFieldLabel(assetField, language) }))} /></label>
            <label><span>{fr.assets.valueFilter}</span><input {...field('asset_value')} disabled={filters.asset_field === ''} /></label>
          </div></fieldset>}
        </div>
      </div>
    </aside>
  </div>
}
