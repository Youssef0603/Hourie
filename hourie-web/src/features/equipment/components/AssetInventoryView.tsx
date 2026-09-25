import { useState } from 'react'
import { fr, type Language } from '../../../i18n/fr'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { Modal } from '../../../shared/components/Modal'
import { assetCategory, assetCategoryLabel, assetFieldLabel, isAssetCategoryCode, type AssetView } from '../assetCategories'
import { catalogBadgeStyle, catalogLabel } from '../catalogs'
import { locationName } from '../equipmentDisplay'
import type { Equipment, EquipmentFilterOptions, EquipmentFilters, EquipmentListResponse } from '../types'
import { AssetCategoryCards } from './AssetCategoryCards'
import { AssetForm } from './AssetForm'
import { AddGeneratorForm } from './AddGeneratorForm'
import { ImportGeneratorForm } from './ImportGeneratorForm'
import { ImportAssetInventoryForm } from './ImportAssetInventoryForm'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { AssetFilterDrawer } from './AssetFilterDrawer'
import { EquipmentFilterDrawer } from './EquipmentFilterDrawer'
import { EquipmentInventoryTable } from './EquipmentInventoryTable'

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
  onRefresh: () => void
  onPageChange: (page: number) => void
  onOpen: (id: number) => void
  onCreated: (equipment: Equipment) => void
  onClearFilters: () => void
  onCategorySelect: (category: AssetView) => void
}

export function AssetInventoryView({ category, language, options, filters, search, result, isLoading, error, canManage, onSearchChange, onFilterChange, onRefresh, onPageChange, onOpen, onCreated, onClearFilters, onCategorySelect }: AssetInventoryViewProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [showAddGenerator, setShowAddGenerator] = useState(false)
  const [showImportGenerator, setShowImportGenerator] = useState(false)
  const [showAssetImport, setShowAssetImport] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const definition = category === 'all' ? null : assetCategory(category)
  const filterDefinition = definition ?? (isAssetCategoryCode(filters.category) ? assetCategory(filters.category) : undefined)
  const selectedCategory = category === 'all' ? filters.category : category
  const selectedAssetCategory = isAssetCategoryCode(selectedCategory) ? selectedCategory : null
  const isGeneratorSelected = selectedCategory === 'generator'
  const tableDefinition = definition ?? (selectedAssetCategory ? assetCategory(selectedAssetCategory) : null)
  const isAllAssetsTable = category === 'all' && selectedCategory === ''
  const hasModelColumn = tableDefinition !== null && !isGeneratorSelected
  const isCarTable = tableDefinition?.code === 'car'
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => !['page', 'per_page', 'sort', 'q', 'category', 'asset_field'].includes(key) && value !== '').length + (filters.asset_field !== '' && filters.asset_value !== '' ? 1 : 0)
  const generatorPhysicalLocations = (options?.locations ?? []).filter((location) => (
    location.parent_id !== null && (filters.project_id === '' || String(location.project_id) === filters.project_id)
  ))
  const title = category === 'all' ? fr.assets.all : assetCategoryLabel(category, language)
  const fields = tableDefinition?.fields.filter((field) => tableDefinition.columns.includes(field.key)) ?? []

  return <main className="equipment-page asset-page">
    <section className="page-heading">
      <div><p className="section-label">{fr.assets.title}</p><h1>{title}</h1><p>{fr.assets.subtitle}</p></div>
      <div className="heading-actions">
        <div className="inventory-count" aria-live="polite"><strong>{result?.meta.total ?? '—'}</strong><span>{fr.assets.title}</span></div>
      </div>
    </section>

    {error && <div className="form-alert" role="alert">{error}</div>}
    {category === 'all' && <AssetCategoryCards selected={(filters.category || 'all') as AssetView} language={language} onSelect={onCategorySelect} />}

    <section className="inventory-panel" aria-label={title}>
      <div className="filter-bar">
        <div className="search-field">
          <label htmlFor="asset-inventory-search">{fr.equipment.search}</label>
          <input id="asset-inventory-search" type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={fr.assets.searchPlaceholder} />
          {search !== '' && <button className="search-clear-button" type="button" onClick={() => onSearchChange('')} aria-label={fr.common.clearSearch}><ActionIcon name="close" /></button>}
        </div>
        <div className="filter-toolbar-actions">
          <button className={`advanced-filter-toggle${showFilters ? ' active' : ''}`} type="button" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters}><ActionIcon name="filter" /><span>{fr.equipment.filters}</span>{activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}</button>
          {canManage && category === 'all' && !isGeneratorSelected && <button className="table-refresh-button import-excel-action" type="button" onClick={() => setShowAssetImport(true)}><ActionIcon name="upload" /><span>{fr.assets.importExcel}</span></button>}
          {canManage && isGeneratorSelected && <button className="table-refresh-button import-excel-action" type="button" onClick={() => setShowImportGenerator(true)}><ActionIcon name="upload" /><span>{fr.equipment.importExcel}</span></button>}
          {canManage && selectedCategory && options && <button className="table-refresh-button table-add-button" type="button" onClick={() => isGeneratorSelected ? setShowAddGenerator(true) : setShowAdd(true)} aria-label={isGeneratorSelected ? fr.equipment.addGenerator : fr.assets.add} title={isGeneratorSelected ? fr.equipment.addGenerator : fr.assets.add}><ActionIcon name="add" /></button>}
          <button className="table-refresh-button filter-refresh-button" type="button" onClick={onRefresh} aria-label={fr.common.refresh} title={fr.common.refresh}><ActionIcon name="refresh" /></button>
          {activeFilterCount > 0 && <button className="clear-filters" type="button" onClick={onClearFilters}>{fr.equipment.clearFilters}</button>}
        </div>
      </div>
      {showFilters && (isGeneratorSelected
        ? <EquipmentFilterDrawer
            filters={filters}
            options={options}
            isSiteView={false}
            physicalLocationOptions={generatorPhysicalLocations}
            onChange={onFilterChange}
            onProjectChange={(projectId) => { onFilterChange('project_id', projectId); onFilterChange('location_id', '') }}
            onClose={() => setShowFilters(false)}
          />
        : <AssetFilterDrawer fields={filterDefinition?.fields ?? []} filters={filters} language={language} options={options} onChange={onFilterChange} onClose={() => setShowFilters(false)} />
      )}

      {isGeneratorSelected ? <EquipmentInventoryTable result={result} isLoading={isLoading} options={options} onOpenEquipment={onOpen} onChangePage={onPageChange} /> : <>
      <div className="equipment-table-wrap">
        <table className="equipment-table asset-inventory-table">
          <thead><tr>
            <th>{fr.equipment.number}</th>
            {isAllAssetsTable && <th>{fr.equipment.category}</th>}
            {hasModelColumn ? <><th>{fr.equipment.brand}</th><th>{fr.equipment.model}</th></> : <th>{fr.equipment.identification}</th>}
            {isCarTable && <th>{fr.equipment.registrationNumber}</th>}
            {fields.map((field) => <th key={field.key}>{assetFieldLabel(field, language)}</th>)}
            <th>{fr.equipment.condition}</th><th>{fr.equipment.project}</th><th>{isCarTable ? fr.equipment.driver : fr.equipment.locationShort}</th>
          </tr></thead>
          <tbody>{!isLoading && result?.data.map((item) => <tr key={item.id} tabIndex={0} onClick={() => onOpen(item.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(item.id) } }}>
            <td><strong>{item.display_id}</strong><span className="secondary-cell">{item.asset_code}</span></td>
            {isAllAssetsTable && <td>{item.category.code === 'generator' ? fr.navigation.generators : isAssetCategoryCode(item.category.code) ? assetCategoryLabel(item.category.code, language) : item.category.name}</td>}
            {hasModelColumn
              ? <><td>{item.brand ?? fr.common.notProvided}</td><td>{item.model ?? fr.common.notProvided}</td></>
              : <td><span className="primary-cell">{[item.brand, item.model].filter(Boolean).join(' ') || fr.common.notProvided}</span><span className="secondary-cell">{item.serial_number ?? fr.common.notProvided}</span></td>}
            {isCarTable && <td>{item.serial_number ?? fr.common.notProvided}</td>}
            {fields.map((field) => <td key={field.key}>{item.asset_details?.[field.key] == null ? fr.common.notProvided : `${item.asset_details[field.key]}${field.unit ? ` ${field.unit}` : ''}`}</td>)}
            <td>{item.condition ? <span className="status-badge" style={catalogBadgeStyle(options?.catalogs, 'equipment_condition', item.condition)}>{catalogLabel(options?.catalogs, 'equipment_condition', item.condition)}</span> : fr.common.notProvided}</td>
            <td>{item.current_project_assignment?.project.name ?? fr.common.notProvided}</td>
            <td>{isCarTable ? item.custodian?.name ?? fr.common.notProvided : locationName(item)}</td>
          </tr>)}</tbody>
        </table>
        {isLoading && <div className="table-state"><LoadingSpinner label={fr.common.loading} /></div>}
        {!isLoading && result?.data.length === 0 && <div className="table-state">{fr.assets.noResults}</div>}
      </div>
      {result && result.meta.last_page > 1 && <nav className="pagination" aria-label={fr.equipment.pagination}><span>{fr.equipment.results(result.meta.from, result.meta.to, result.meta.total)}</span><div><button type="button" disabled={result.meta.current_page === 1 || isLoading} onClick={() => onPageChange(result.meta.current_page - 1)}>{fr.common.previous}</button><span>{fr.equipment.page(result.meta.current_page, result.meta.last_page)}</span><button type="button" disabled={result.meta.current_page === result.meta.last_page || isLoading} onClick={() => onPageChange(result.meta.current_page + 1)}>{fr.common.next}</button></div></nav>}
      </>}
    </section>
    {showAdd && selectedAssetCategory && options && <Modal title={`${fr.assets.add} — ${assetCategoryLabel(selectedAssetCategory, language)}`} size="wide" onClose={() => setShowAdd(false)}><AssetForm categoryCode={selectedAssetCategory} language={language} options={options} onSaved={(equipment) => { setShowAdd(false); onCreated(equipment) }} /></Modal>}
    {showAddGenerator && options && <Modal title={fr.equipment.addGenerator} size="wide" onClose={() => setShowAddGenerator(false)}><AddGeneratorForm options={options} onCreated={(equipment) => { setShowAddGenerator(false); onCreated(equipment) }} /></Modal>}
    {showImportGenerator && <Modal title={fr.equipment.importTitle} onClose={() => setShowImportGenerator(false)}><ImportGeneratorForm onClose={() => setShowImportGenerator(false)} onImported={() => onRefresh()} /></Modal>}
    {showAssetImport && <Modal title={fr.assets.importTitle} onClose={() => setShowAssetImport(false)}><ImportAssetInventoryForm onClose={() => setShowAssetImport(false)} onImported={() => onRefresh()} /></Modal>}
  </main>
}
