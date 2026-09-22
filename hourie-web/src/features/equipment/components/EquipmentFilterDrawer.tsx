import type { ChangeEvent, InputHTMLAttributes } from 'react'
import { fr } from '../../../i18n/fr'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'
import { locationOptionLabel } from '../locationLabel'
import { catalogLabel, catalogOptions } from '../catalogs'
import type { EquipmentFilterOptions, EquipmentFilters } from '../types'

type EquipmentFilterDrawerProps = {
  filters: EquipmentFilters
  options: EquipmentFilterOptions | null
  isSiteView: boolean
  physicalLocationOptions: EquipmentFilterOptions['locations']
  onChange: (name: keyof EquipmentFilters, value: string) => void
  onProjectChange: (projectId: string) => void
  onClose: () => void
}

export function EquipmentFilterDrawer({ filters, options, isSiteView, physicalLocationOptions, onChange, onProjectChange, onClose }: EquipmentFilterDrawerProps) {
  return <div className="filter-drawer-backdrop" onMouseDown={onClose}>
    <aside className="filter-drawer" role="dialog" aria-modal="true" aria-label={fr.equipment.filters} onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="section-label">{fr.equipment.section}</p><h2>{fr.equipment.filters}</h2></div><button type="button" onClick={onClose} aria-label={fr.common.close}><ActionIcon name="close" /></button></header>
      <div className="filter-drawer-content">
        <fieldset className="drawer-basic-filters"><legend>{fr.equipment.filters}</legend><div className="advanced-filter-grid">
          <label><span>{fr.equipment.condition}</span><SearchableSelect ariaLabel={fr.equipment.condition} value={filters.condition} onChange={(value) => onChange('condition', value)} placeholder={fr.common.all} options={catalogOptions(options?.catalogs, 'equipment_condition').map((option) => ({ value: option.code, label: catalogLabel(options?.catalogs, 'equipment_condition', option.code) }))} /></label>
          <label><span>{fr.equipment.situation}</span><SearchableSelect ariaLabel={fr.equipment.situation} value={filters.operational_situation} onChange={(value) => onChange('operational_situation', value)} placeholder={fr.common.all} options={catalogOptions(options?.catalogs, 'operational_situation').map((option) => ({ value: option.code, label: catalogLabel(options?.catalogs, 'operational_situation', option.code) }))} /></label>
          {!isSiteView && <label><span>{fr.equipment.project}</span><SearchableSelect ariaLabel={fr.equipment.project} value={filters.project_id} onChange={onProjectChange} placeholder={fr.common.all} options={(options?.projects ?? []).map((project) => ({ value: String(project.id), label: project.name }))} /></label>}
          <label><span>{fr.equipment.location}</span><SearchableSelect ariaLabel={fr.equipment.location} value={filters.location_id} onChange={(value) => onChange('location_id', value)} placeholder={fr.common.all} options={physicalLocationOptions.map((location) => ({ value: String(location.id), label: filters.project_id === '' ? locationOptionLabel(location) : location.name }))} /></label>
          <label><span>{fr.equipment.sort}</span><SearchableSelect ariaLabel={fr.equipment.sort} value={filters.sort} onChange={(value) => onChange('sort', value)} placeholder={fr.equipment.addedNewestFirst} includeEmpty={false} options={[{ value: 'created_at_desc', label: fr.equipment.addedNewestFirst }, { value: 'created_at_asc', label: fr.equipment.addedOldestFirst }, { value: 'manufacture_year_desc', label: fr.equipment.manufacturedNewestFirst }, { value: 'manufacture_year_asc', label: fr.equipment.manufacturedOldestFirst }]} /></label>
        </div></fieldset>
        <AdvancedEquipmentFilters filters={filters} options={options} onChange={onChange} />
      </div>
    </aside>
  </div>
}

function AdvancedEquipmentFilters({ filters, options, onChange }: Pick<EquipmentFilterDrawerProps, 'filters' | 'options' | 'onChange'>) {
  const field = (name: keyof EquipmentFilters) => ({
    value: String(filters[name]),
    onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(name, event.target.value),
  })

  return <div className="advanced-filter-panel">
    <fieldset><legend>{fr.equipment.assignmentAndDateFilters}</legend><div className="advanced-filter-grid">
      <label><span>{fr.equipment.custodian}</span><SearchableSelect ariaLabel={fr.equipment.custodian} value={filters.custodian_employee_id} onChange={(value) => onChange('custodian_employee_id', value)} placeholder={fr.common.all} options={(options?.employees ?? []).map((employee) => ({ value: String(employee.id), label: employee.name }))} /></label>
      <label><span>{fr.equipment.yearFrom}</span><input type="number" min="1900" max="2100" {...field('manufacture_year_from')} /></label>
      <label><span>{fr.equipment.yearTo}</span><input type="number" min="1900" max="2100" {...field('manufacture_year_to')} /></label>
      <label><span>{fr.equipment.addedFrom}</span><input type="date" {...field('created_from')} /></label>
      <label><span>{fr.equipment.addedTo}</span><input type="date" {...field('created_to')} /></label>
    </div></fieldset>
    <fieldset><legend>{fr.equipment.powerFilters}</legend><div className="advanced-filter-grid">
      <RangeInputs label={fr.equipment.apparentPower} minimum={field('apparent_power_kva_min')} maximum={field('apparent_power_kva_max')} />
      <RangeInputs label={fr.equipment.activePower} minimum={field('active_power_kw_min')} maximum={field('active_power_kw_max')} />
      <RangeInputs label={fr.equipment.frequency} minimum={field('frequency_hz_min')} maximum={field('frequency_hz_max')} />
    </div></fieldset>
    <fieldset className="advanced-filter-wide"><legend>{fr.equipment.technicalFilters}</legend><div className="advanced-filter-grid">
      <label><span>{fr.equipment.phases}</span><input {...field('phases')} /></label>
      <label><span>{fr.equipment.voltage}</span><input {...field('voltage_rating')} /></label>
      <label><span>{fr.equipment.current}</span><input {...field('current_rating')} /></label>
      <label><span>{fr.equipment.fuel}</span><SearchableSelect ariaLabel={fr.equipment.fuel} value={filters.fuel_type} onChange={(value) => onChange('fuel_type', value)} placeholder={fr.common.all} options={catalogOptions(options?.catalogs, 'fuel_type').map((option) => ({ value: option.code, label: catalogLabel(options?.catalogs, 'fuel_type', option.code) }))} /></label>
      <label><span>{fr.equipment.engineHoursMin}</span><input type="number" min="0" step="0.01" {...field('engine_hours_min')} /></label>
      <label><span>{fr.equipment.engineHoursMax}</span><input type="number" min="0" step="0.01" {...field('engine_hours_max')} /></label>
      <label><span>{fr.equipment.tankMin}</span><input type="number" min="0" step="0.01" {...field('tank_capacity_litres_min')} /></label>
      <label><span>{fr.equipment.tankMax}</span><input type="number" min="0" step="0.01" {...field('tank_capacity_litres_max')} /></label>
    </div></fieldset>
  </div>
}

function RangeInputs({ label, minimum, maximum }: { label: string; minimum: InputHTMLAttributes<HTMLInputElement>; maximum: InputHTMLAttributes<HTMLInputElement> }) {
  return <div className="range-filter"><span>{label}</span><div><input type="number" min="0" step="0.01" placeholder={fr.common.minimum} {...minimum} /><input type="number" min="0" step="0.01" placeholder={fr.common.maximum} {...maximum} /></div></div>
}
