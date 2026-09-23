import { useState } from 'react'
import { fr, type Language } from '../../../i18n/fr'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { Modal } from '../../../shared/components/Modal'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'
import { assetCategory, assetCategoryLabel, assetFieldLabel, isAssetCategoryCode, type AssetView } from '../assetCategories'
import { catalogBadgeStyle, catalogLabel, catalogOptions } from '../catalogs'
import { locationName } from '../equipmentDisplay'
import type { Equipment, EquipmentFilterOptions, EquipmentFilters, EquipmentListResponse } from '../types'
import { AssetCategoryCards } from './AssetCategoryCards'
import { AssetForm } from './AssetForm'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'

type AssetInventoryViewProps = {
  category: Exclude<AssetView, 'generator'>
  language: Language
  options: EquipmentFilterOptions | null
  filters: EquipmentFilters
  search: string
  result: EquipmentListResponse | null
  isLoading: boolean
  error: string | null
  canManage: boolean
  onSearchChange: (value: string) => void
  onFilterChange: (name: keyof EquipmentFilters, value: string) => void
  onSelectCategory: (category: AssetView) => void
  onRefresh: () => void
  onPageChange: (page: number) => void
  onOpen: (id: number) => void
  onCreated: (equipment: Equipment) => void
}

export function AssetInventoryView({ category, language, options, filters, search, result, isLoading, error, canManage, onSearchChange, onFilterChange, onSelectCategory, onRefresh, onPageChange, onOpen, onCreated }: AssetInventoryViewProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const definition = category === 'all' ? null : assetCategory(category)
  const title = category === 'all' ? fr.assets.all : assetCategoryLabel(category, language)
  const fields = definition?.fields.filter((field) => definition.columns.includes(field.key)) ?? []

  return <main className="equipment-page asset-page">
    <section className="page-heading">
      <div><p className="section-label">{fr.assets.title}</p><h1>{title}</h1><p>{fr.assets.subtitle}</p></div>
      <div className="heading-actions">
        <div className="inventory-count" aria-live="polite"><strong>{result?.meta.total ?? '—'}</strong><span>{fr.assets.title}</span></div>
      </div>
    </section>

    {error && <div className="form-alert" role="alert">{error}</div>}
    <AssetCategoryCards selected={category} language={language} onSelect={onSelectCategory} />

    <section className="inventory-panel" aria-label={title}>
      <div className="filter-bar">
        <label className="search-field"><span>{fr.equipment.search}</span><input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={fr.assets.searchPlaceholder} /></label>
        <div className="filter-toolbar-actions">
          <button className={`advanced-filter-toggle${showFilters ? ' active' : ''}`} type="button" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters}><ActionIcon name="filter" /><span>{fr.equipment.filters}</span></button>
          {canManage && category !== 'all' && options && <button className="table-refresh-button table-add-button" type="button" onClick={() => setShowAdd(true)} aria-label={fr.assets.add} title={fr.assets.add}><ActionIcon name="add" /></button>}
          <button className="table-refresh-button filter-refresh-button" type="button" onClick={onRefresh} aria-label={fr.common.refresh} title={fr.common.refresh}><ActionIcon name="refresh" /></button>
        </div>
      </div>
      {showFilters && <div className="asset-filter-panel">
        <label><span>{fr.equipment.condition}</span><SearchableSelect ariaLabel={fr.equipment.condition} value={filters.condition} onChange={(value) => onFilterChange('condition', value)} placeholder={fr.common.all} options={catalogOptions(options?.catalogs, 'equipment_condition').map((option) => ({ value: option.code, label: catalogLabel(options?.catalogs, 'equipment_condition', option.code) }))} /></label>
        <label><span>{fr.equipment.project}</span><SearchableSelect ariaLabel={fr.equipment.project} value={filters.project_id} onChange={(value) => onFilterChange('project_id', value)} placeholder={fr.common.all} options={(options?.projects ?? []).map((project) => ({ value: String(project.id), label: project.name }))} /></label>
        <label><span>{fr.equipment.sort}</span><SearchableSelect ariaLabel={fr.equipment.sort} value={filters.sort} onChange={(value) => onFilterChange('sort', value)} placeholder={fr.equipment.sort} includeEmpty={false} options={[{ value: 'manufacture_year_desc', label: fr.equipment.manufacturedNewestFirst }, { value: 'manufacture_year_asc', label: fr.equipment.manufacturedOldestFirst }]} /></label>
        {definition && <><label><span>{fr.assets.typeFilter}</span><SearchableSelect ariaLabel={fr.assets.typeFilter} value={filters.asset_field} onChange={(value) => { onFilterChange('asset_field', value); onFilterChange('asset_value', '') }} placeholder={fr.common.all} options={definition.fields.map((field) => ({ value: field.key, label: assetFieldLabel(field, language) }))} /></label><label><span>{fr.assets.valueFilter}</span><input value={filters.asset_value} onChange={(event) => onFilterChange('asset_value', event.target.value)} disabled={!filters.asset_field} /></label></>}
      </div>}

      <div className="equipment-table-wrap">
        <table className="equipment-table asset-inventory-table">
          <thead><tr>
            <th>{fr.equipment.assetCode}</th>
            {category === 'all' && <th>{fr.equipment.category}</th>}
            <th>{fr.equipment.identification}</th>
            {fields.map((field) => <th key={field.key}>{assetFieldLabel(field, language)}</th>)}
            <th>{fr.equipment.condition}</th><th>{fr.equipment.project}</th><th>{fr.equipment.locationShort}</th><th>{fr.assets.review}</th>
          </tr></thead>
          <tbody>{!isLoading && result?.data.map((item) => <tr key={item.id} tabIndex={0} onClick={() => onOpen(item.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(item.id) } }}>
            <td><strong>{item.asset_code}</strong></td>
            {category === 'all' && <td>{item.category.code === 'generator' ? fr.navigation.generators : isAssetCategoryCode(item.category.code) ? assetCategoryLabel(item.category.code, language) : item.category.name}</td>}
            <td><span className="primary-cell">{[item.brand, item.model].filter(Boolean).join(' ') || fr.common.notProvided}</span><span className="secondary-cell">{item.serial_number ?? fr.common.notProvided}</span></td>
            {fields.map((field) => <td key={field.key}>{item.asset_details?.[field.key] == null ? fr.common.notProvided : `${item.asset_details[field.key]}${field.unit ? ` ${field.unit}` : ''}`}</td>)}
            <td>{item.condition ? <span className="status-badge" style={catalogBadgeStyle(options?.catalogs, 'equipment_condition', item.condition)}>{catalogLabel(options?.catalogs, 'equipment_condition', item.condition)}</span> : fr.common.notProvided}</td>
            <td>{item.current_project_assignment?.project.name ?? fr.common.notProvided}</td>
            <td>{locationName(item)}</td>
            <td>{item.review_flags.length > 0 ? <span className="status-badge asset-review-badge">{fr.assets.review}</span> : '—'}</td>
          </tr>)}</tbody>
        </table>
        {isLoading && <div className="table-state"><LoadingSpinner label={fr.common.loading} /></div>}
        {!isLoading && result?.data.length === 0 && <div className="table-state">{fr.assets.noResults}</div>}
      </div>
      {result && result.meta.last_page > 1 && <nav className="pagination" aria-label={fr.equipment.pagination}><span>{fr.equipment.results(result.meta.from, result.meta.to, result.meta.total)}</span><div><button type="button" disabled={result.meta.current_page === 1 || isLoading} onClick={() => onPageChange(result.meta.current_page - 1)}>{fr.common.previous}</button><span>{fr.equipment.page(result.meta.current_page, result.meta.last_page)}</span><button type="button" disabled={result.meta.current_page === result.meta.last_page || isLoading} onClick={() => onPageChange(result.meta.current_page + 1)}>{fr.common.next}</button></div></nav>}
    </section>
    {showAdd && category !== 'all' && options && <Modal title={`${fr.assets.add} — ${title}`} size="wide" onClose={() => setShowAdd(false)}><AssetForm categoryCode={category} language={language} options={options} onSaved={(equipment) => { setShowAdd(false); onCreated(equipment) }} /></Modal>}
  </main>
}
