import { useEffect, useState, type ChangeEvent, type InputHTMLAttributes } from 'react'
import type { AuthenticatedUser } from '../../auth/types'
import { EquipmentEditForm } from '../components/EquipmentEditForm'
import { AddGeneratorForm } from '../components/AddGeneratorForm'
import { ImportGeneratorForm } from '../components/ImportGeneratorForm'
import { MaintenanceSection } from '../components/MaintenanceSection'
import { EquipmentImages } from '../components/EquipmentImages'
import { CatalogsPage } from '../components/CatalogsPage'
import { PeoplePage, SitesPage } from '../../directory/pages/DirectoryPages'
import { SiteEditForm } from '../../directory/components/SiteEditForm'
import { deleteSite } from '../../directory/api'
import type { Site } from '../../directory/types'
import { fr, type Language } from '../../../i18n/fr'
import { LanguageSwitch } from '../../../shared/components/LanguageSwitch'
import { NavigationIcon } from '../../../shared/components/NavigationIcon'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { Modal } from '../../../shared/components/Modal'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import hourieLogo from '../../../assets/hourie-logo.svg'
import {
  deleteEquipment,
  getEquipment,
  getEquipmentFilterOptions,
  getEquipmentItem,
} from '../api'
import { locationOptionLabel } from '../locationLabel'
import { catalogBadgeStyle, catalogLabel, catalogOptions } from '../catalogs'
import type {
  Equipment,
  EquipmentFilterOptions,
  EquipmentFilters,
  EquipmentListResponse,
  EquipmentSummary,
} from '../types'
import './equipment-page.css'

type EquipmentPageProps = {
  user: AuthenticatedUser
  isLoggingOut: boolean
  logoutError: string | null
  onLogout: () => void
  language: Language
  onToggleLanguage: () => void
}

const initialFilters: EquipmentFilters = {
  q: '',
  category: '',
  condition: '',
  operational_situation: '',
  project_id: '',
  location_id: '',
  custodian_employee_id: '',
  brand: '',
  model: '',
  serial_number: '',
  manufacture_year_from: '',
  manufacture_year_to: '',
  created_from: '',
  created_to: '',
  apparent_power_kva_min: '',
  apparent_power_kva_max: '',
  active_power_kw_min: '',
  active_power_kw_max: '',
  frequency_hz_min: '',
  frequency_hz_max: '',
  engine_hours_min: '',
  engine_hours_max: '',
  tank_capacity_litres_min: '',
  tank_capacity_litres_max: '',
  phases: '',
  voltage_rating: '',
  current_rating: '',
  fuel_type: '',
  page: 1,
  per_page: 10,
  sort: 'created_at_desc',
}

const advancedFilterKeys: Array<keyof EquipmentFilters> = [
  'custodian_employee_id', 'manufacture_year_from', 'manufacture_year_to', 'created_from', 'created_to',
  'apparent_power_kva_min', 'apparent_power_kva_max', 'active_power_kw_min',
  'active_power_kw_max', 'frequency_hz_min', 'frequency_hz_max',
  'engine_hours_min', 'engine_hours_max', 'tank_capacity_litres_min',
  'tank_capacity_litres_max', 'phases', 'voltage_rating', 'current_rating', 'fuel_type',
]

function displayedValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === ''
    ? fr.common.notProvided
    : String(value)
}

function locationName(equipment: EquipmentSummary) {
  if (!equipment.current_location) {
    return fr.common.notProvided
  }

  return equipment.current_location.parent
    ? `${equipment.current_location.parent.name} / ${equipment.current_location.name}`
    : equipment.current_location.name
}

function measurement(value: string | null | undefined, unit: string) {
  return value ? `${value} ${unit}` : fr.common.toComplete
}

function auditDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  return `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts.at(-1)?.[0] ?? '' : ''}`.toUpperCase()
}

export function EquipmentPage({
  user,
  isLoggingOut,
  logoutError,
  onLogout,
  language,
  onToggleLanguage,
}: EquipmentPageProps) {
  const [filters, setFilters] = useState(initialFilters)
  const [search, setSearch] = useState('')
  const [result, setResult] = useState<EquipmentListResponse | null>(null)
  const [options, setOptions] = useState<EquipmentFilterOptions | null>(null)
  const [selected, setSelected] = useState<Equipment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isEditingEquipment, setIsEditingEquipment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'generators' | 'sites' | 'people' | 'catalogs'>('generators')
  const [showAddGenerator, setShowAddGenerator] = useState(false)
  const [showImportGenerator, setShowImportGenerator] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [showHistory, setShowHistory] = useState<'equipment' | 'site' | null>(null)
  const [showEditSite, setShowEditSite] = useState(false)
  const [siteContext, setSiteContext] = useState<Site | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (filters.q !== search) {
        setIsLoading(true)
        setError(null)
        setFilters((current) => ({ ...current, q: search, page: 1 }))
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [filters.q, search])

  useEffect(() => {
    let cancelled = false

    getEquipmentFilterOptions()
      .then((filterOptions) => {
        if (!cancelled) {
          setOptions(filterOptions)
        }
      })
      .catch(() => {
        if (!cancelled) setError(fr.equipment.loadError)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    getEquipment(filters)
      .then((equipmentResult) => {
        if (!cancelled) setResult(equipmentResult)
      })
      .catch(() => {
        if (!cancelled) setError(fr.equipment.loadError)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filters, refreshToken])

  function refreshInventory() {
    setIsLoading(true)
    setError(null)
    setRefreshToken((current) => current + 1)
  }

  function refreshFilterOptions() {
    getEquipmentFilterOptions()
      .then(setOptions)
      .catch(() => setError(fr.equipment.loadError))
  }

  function updateFilter(name: keyof EquipmentFilters, value: string) {
    setIsLoading(true)
    setError(null)
    setFilters((current) => ({ ...current, [name]: value, page: 1 }))
  }

  function updateProjectFilter(projectId: string) {
    setIsLoading(true)
    setError(null)
    setFilters((current) => ({
      ...current,
      project_id: projectId,
      location_id: '',
      page: 1,
    }))
  }

  function changePage(page: number) {
    setIsLoading(true)
    setError(null)
    setFilters((current) => ({ ...current, page }))
  }

  async function openEquipment(id: number) {
    setIsLoadingDetail(true)
    setIsEditingEquipment(false)
    setSelected(null)
    setError(null)

    try {
      setSelected(await getEquipmentItem(id))
    } catch {
      setError(fr.equipment.detailError)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const isSiteView = siteContext !== null
  const hasFilters = Object.entries(filters).some(
    ([key, value]) =>
      !['page', 'per_page', 'sort', ...(isSiteView ? ['project_id'] : [])].includes(key)
      && value !== '',
  )
  const advancedFilterCount = advancedFilterKeys.filter((key) => filters[key] !== '').length
  const physicalLocationOptions = (options?.locations ?? []).filter((location) => (
    location.parent_id !== null
    && (filters.project_id === '' || String(location.project_id) === filters.project_id)
  ))
  function openSiteInventory(site: Site) {
    setSelected(null)
    setSiteContext(site)
    setShowFilterDrawer(false)
    setSearch('')
    setIsLoading(true)
    setResult(null)
    setFilters({ ...initialFilters, project_id: String(site.id) })
  }

  function closeSiteInventory() {
    setShowHistory(null)
    setShowEditSite(false)
    setSiteContext(null)
    setSearch('')
    setIsLoading(true)
    setResult(null)
    // Always create a new filter object. Reusing `initialFilters` can make
    // React skip the state change, leaving `isLoading` stuck without a request.
    setFilters({ ...initialFilters })
  }

  async function removeSelectedEquipment() {
    if (!selected || !window.confirm(fr.equipment.deleteConfirmation)) return

    try {
      await deleteEquipment(selected.id)
      setSelected(null)
      refreshInventory()
    } catch {
      setError(fr.common.deleteError)
    }
  }

  async function removeCurrentSite() {
    if (!siteContext || !window.confirm(fr.directory.deleteSiteConfirmation)) return

    try {
      await deleteSite(siteContext.id)
      closeSiteInventory()
      setActiveSection('sites')
    } catch {
      setError(fr.common.deleteError)
    }
  }

  return (
    <div className="workspace-shell">
      <header className="workspace-header">
        <div className="workspace-brand">
          <span className="workspace-logo-frame">
            <img className="workspace-logo" src={hourieLogo} alt={fr.app.companyName} />
          </span>
        </div>
        <div className="user-menu">
          <LanguageSwitch language={language} onToggle={onToggleLanguage} />
          <div className="user-identity">
            <span className="user-avatar" aria-hidden="true">{userInitials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <span>{fr.roles[user.role]}</span>
            </div>
          </div>
          <button className="logout-button" type="button" onClick={onLogout} disabled={isLoggingOut}>
            <ActionIcon name="logout" />
            {isLoggingOut ? <LoadingSpinner compact label={fr.auth.loggingOut} /> : <span>{fr.auth.logout}</span>}
          </button>
        </div>
      </header>

      <div className={`workspace-layout${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <aside className="workspace-sidebar">
          <div className="sidebar-heading">
            <p className="sidebar-label">{fr.navigation.title}</p>
            <button className="sidebar-toggle" type="button" onClick={() => setIsSidebarCollapsed((value) => !value)} aria-label={isSidebarCollapsed ? fr.navigation.expand : fr.navigation.collapse} title={isSidebarCollapsed ? fr.navigation.expand : fr.navigation.collapse}>
              <ActionIcon name={isSidebarCollapsed ? 'expand' : 'collapse'} />
            </button>
          </div>
          <nav aria-label={fr.navigation.title}>
            <div className="sidebar-navigation-group">
              <p className="sidebar-group-label">{fr.navigation.inventory}</p>
              <button title={fr.navigation.generators} className={`sidebar-child ${activeSection === 'generators' ? 'active' : ''}`} type="button" onClick={() => { closeSiteInventory(); setActiveSection('generators') }}><NavigationIcon name="generators" /><span className="nav-label">{fr.navigation.generators}</span></button>
            </div>
            <button title={fr.navigation.sites} className={activeSection === 'sites' ? 'active' : ''} type="button" onClick={() => { closeSiteInventory(); setActiveSection('sites') }}><NavigationIcon name="sites" /><span className="nav-label">{fr.navigation.sites}</span></button>
            <button title={fr.navigation.people} className={activeSection === 'people' ? 'active' : ''} type="button" onClick={() => { closeSiteInventory(); setActiveSection('people') }}><NavigationIcon name="people" /><span className="nav-label">{fr.navigation.people}</span></button>
            {user.permissions.manage_sites && <button title={fr.navigation.settings} className={activeSection === 'catalogs' ? 'active' : ''} type="button" onClick={() => { closeSiteInventory(); setActiveSection('catalogs') }}><NavigationIcon name="settings" /><span className="nav-label">{fr.navigation.settings}</span></button>}
          </nav>
        </aside>

      {(activeSection === 'generators' || isSiteView) ? <main className="equipment-page">
        {isSiteView && <nav className="breadcrumbs" aria-label={fr.navigation.breadcrumbs}>
          <button type="button" onClick={() => { closeSiteInventory(); setActiveSection('generators') }}>{fr.equipment.section}</button>
          <span aria-hidden="true">/</span>
          <button type="button" onClick={() => { closeSiteInventory(); setActiveSection('sites') }}>{fr.directory.sites}</button>
          <span aria-hidden="true">/</span>
          <strong aria-current="page">{siteContext.name}</strong>
        </nav>}
        <section className="page-heading">
          <div>
            {!isSiteView && <p className="section-label">{fr.equipment.section}</p>}
            {isSiteView ? <div className="site-page-title-row"><button className="table-refresh-button" type="button" onClick={() => { closeSiteInventory(); setActiveSection('sites') }}><ActionIcon name="collapse" /><span>{fr.navigation.sites}</span></button><h1>{siteContext.name}</h1></div> : <h1>{fr.equipment.title}</h1>}
            {(!isSiteView || siteContext?.address) && <p>{isSiteView ? siteContext?.address : fr.equipment.subtitle}</p>}
          </div>
          <div className="heading-actions">
            {isSiteView && <button className="table-refresh-button" type="button" onClick={() => setShowHistory('site')}><ActionIcon name="history" /><span>{fr.audit.button}</span></button>}
            {isSiteView && user.permissions.manage_sites && <button className="table-refresh-button" type="button" onClick={() => setShowEditSite(true)}><ActionIcon name="edit" /><span>{fr.common.edit}</span></button>}
            {isSiteView && user.permissions.manage_sites && <button className="danger-button" type="button" onClick={removeCurrentSite}><ActionIcon name="delete" /><span>{fr.directory.deleteSite}</span></button>}
            {!isSiteView && user.permissions.manage_equipment && <button className="table-refresh-button" type="button" onClick={() => setShowImportGenerator(true)}><ActionIcon name="upload" /><span>{fr.equipment.importExcel}</span></button>}
            {user.permissions.manage_equipment && <button className="primary-button page-action compact-action" type="button" onClick={() => setShowAddGenerator((value) => !value)}><ActionIcon name={showAddGenerator ? 'close' : 'add'} /><span>{showAddGenerator ? fr.common.close : fr.equipment.addGenerator}</span></button>}
            <div className="inventory-count" aria-live="polite">
              <strong>{result?.meta.total ?? '—'}</strong>
              <span>{fr.equipment.items}</span>
            </div>
          </div>
        </section>

        {(error || logoutError) && (
          <div className="form-alert" role="alert">
            {error ?? logoutError}
          </div>
        )}

        {showAddGenerator && options && <Modal title={fr.equipment.addGenerator} size="wide" onClose={() => setShowAddGenerator(false)}><AddGeneratorForm options={options} initialProjectId={siteContext?.id} onCancel={() => setShowAddGenerator(false)} onCreated={(equipment) => { setShowAddGenerator(false); setSelected(equipment); setFilters((current) => ({ ...current, page: 1 })); refreshInventory() }} /></Modal>}
        {showImportGenerator && <Modal title={fr.equipment.importTitle} onClose={() => setShowImportGenerator(false)}><ImportGeneratorForm onClose={() => setShowImportGenerator(false)} onImported={() => { refreshInventory(); refreshFilterOptions() }} /></Modal>}
        {showEditSite && siteContext && <Modal title={fr.directory.editSite} size="wide" onClose={() => setShowEditSite(false)}><SiteEditForm site={siteContext} catalogs={options?.catalogs} employees={options?.employees ?? []} onCancel={() => setShowEditSite(false)} onSaved={(site) => { setSiteContext(site); setShowEditSite(false); refreshFilterOptions(); refreshInventory() }} /></Modal>}

        <section className="inventory-panel" aria-label={fr.equipment.title}>
          <div className="filter-bar">
            <label className="search-field">
              <span>{fr.equipment.search}</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={fr.equipment.searchPlaceholder}
              />
            </label>
            <div className="filter-toolbar-actions">
              <button className={`advanced-filter-toggle${showFilterDrawer ? ' active' : ''}`} type="button" onClick={() => setShowFilterDrawer(true)} aria-expanded={showFilterDrawer}>
                <ActionIcon name="filter" />
                <span>{fr.equipment.filters}</span>
                {hasFilters && <strong>{advancedFilterCount || 1}</strong>}
              </button>
              <button className="table-refresh-button filter-refresh-button" type="button" onClick={refreshInventory} aria-label={fr.common.refresh} title={fr.common.refresh}><ActionIcon name="refresh" /></button>
              {hasFilters && (
                <button
                  className="clear-filters"
                  type="button"
                  onClick={() => {
                    setIsLoading(true)
                    setError(null)
                    setSearch('')
                    setFilters({ ...initialFilters, project_id: isSiteView ? String(siteContext?.id) : '' })
                  }}
                >
                  {fr.equipment.clearFilters}
                </button>
              )}
            </div>
          </div>

          <div className="equipment-table-wrap">
            <table className="equipment-table">
              <thead>
                <tr>
                  <th>{fr.equipment.number}</th>
                  <th>{fr.equipment.addedOn}</th>
                  <th>{fr.equipment.identification}</th>
                  <th>{fr.equipment.apparentPowerShort}</th>
                  <th>{fr.equipment.activePowerShort}</th>
                  <th>{fr.equipment.fuel}</th>
                  <th>{fr.equipment.condition}</th>
                  <th>{fr.equipment.situation}</th>
                  <th>{fr.equipment.project}</th>
                  <th>{fr.equipment.locationShort}</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && result?.data.map((equipment) => (
                  <tr
                    key={equipment.id}
                    tabIndex={0}
                    onClick={() => openEquipment(equipment.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openEquipment(equipment.id)
                      }
                    }}
                  >
                    <td><strong>{equipment.display_id}</strong><span className="secondary-cell">{equipment.asset_code}</span></td>
                    <td>{new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'fr-FR').format(new Date(equipment.created_at))}</td>
                    <td>
                      <span className="primary-cell">
                        {[equipment.brand, equipment.model].filter(Boolean).join(' ') || fr.common.notProvided}
                      </span>
                      <span className="secondary-cell">{equipment.category.name}</span>
                    </td>
                    <td>{measurement(equipment.power?.apparent_kva, 'kVA')}</td>
                    <td>{measurement(equipment.power?.active_kw, 'kW')}</td>
                    <td>{equipment.fuel_type ? <span className="status-badge" style={catalogBadgeStyle(options?.catalogs, 'fuel_type', equipment.fuel_type)}>{catalogLabel(options?.catalogs, 'fuel_type', equipment.fuel_type)}</span> : fr.common.notProvided}</td>
                    <td>
                      <span className={`status-badge status-${equipment.condition ?? 'unknown'}`} style={catalogBadgeStyle(options?.catalogs, 'equipment_condition', equipment.condition)}>
                        {equipment.condition ? catalogLabel(options?.catalogs, 'equipment_condition', equipment.condition) : fr.common.notProvided}
                      </span>
                    </td>
                    <td>{equipment.operational_situation ? <span className="status-badge" style={catalogBadgeStyle(options?.catalogs, 'operational_situation', equipment.operational_situation)}>{catalogLabel(options?.catalogs, 'operational_situation', equipment.operational_situation)}</span> : fr.common.notProvided}</td>
                    <td>{equipment.current_project_assignment?.project.name ?? fr.common.notProvided}</td>
                    <td>{locationName(equipment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isLoading && <div className="table-state"><LoadingSpinner label={fr.common.loading} /></div>}
            {!isLoading && result?.data.length === 0 && (
              <div className="table-state">{fr.equipment.empty}</div>
            )}
          </div>

          {result && result.meta.last_page > 1 && (
            <nav className="pagination" aria-label={fr.equipment.pagination}>
              <span>
                {fr.equipment.results(result.meta.from, result.meta.to, result.meta.total)}
              </span>
              <div>
                <button
                  type="button"
                  disabled={result.meta.current_page === 1 || isLoading}
                  onClick={() => changePage(result.meta.current_page - 1)}
                >
                  {fr.common.previous}
                </button>
                <span>{fr.equipment.page(result.meta.current_page, result.meta.last_page)}</span>
                <button
                  type="button"
                  disabled={result.meta.current_page === result.meta.last_page || isLoading}
                  onClick={() => changePage(result.meta.current_page + 1)}
                >
                  {fr.common.next}
                </button>
              </div>
            </nav>
          )}
        </section>
        {showFilterDrawer && <EquipmentFilterDrawer
          filters={filters}
          options={options}
          isSiteView={isSiteView}
          physicalLocationOptions={physicalLocationOptions}
          onChange={updateFilter}
          onProjectChange={updateProjectFilter}
          onClose={() => setShowFilterDrawer(false)}
        />}
      </main> : activeSection === 'sites' ? <SitesPage canAdd={user.permissions.manage_sites} catalogs={options?.catalogs} employees={options?.employees} onOpenSite={openSiteInventory} /> : activeSection === 'catalogs' ? <CatalogsPage onChanged={refreshFilterOptions} /> : <PeoplePage canAdd={user.permissions.manage_users} canManageManagerAccounts={user.role === 'manager'} catalogs={options?.catalogs} />}
      </div>

      {(activeSection === 'generators' || isSiteView) && (selected || isLoadingDetail) && (
        <div className="detail-backdrop" onMouseDown={() => !isLoadingDetail && setSelected(null)}>
          <aside
            className="detail-panel"
            role="dialog"
            aria-modal="true"
            aria-label={fr.equipment.details}
            aria-live="polite"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {isLoadingDetail ? (
              <LoadingSpinner className="detail-loading" label={fr.common.loading} />
            ) : selected && (
              <>
                <header className="detail-header">
                  <div>
                    <p className="section-label">{selected.category.name}</p>
                    <h2>{selected.asset_code}</h2>
                    <p>{[selected.brand, selected.model].filter(Boolean).join(' ') || fr.common.notProvided}</p>
                  </div>
                  <button type="button" aria-label={fr.common.close} onClick={() => setSelected(null)}><ActionIcon name="close" /></button>
                </header>
                <div className="detail-content">
                  <div className={`detail-primary-actions${isEditingEquipment ? ' editing' : ''}`}>
                    {user.permissions.manage_equipment && (
                      <EquipmentEditForm
                        key={selected.id}
                        equipment={selected}
                        employees={options?.employees ?? []}
                        projects={options?.projects ?? []}
                        locations={options?.locations ?? []}
                        catalogs={options?.catalogs ?? []}
                        onEditingChange={setIsEditingEquipment}
                        onChanged={(equipment) => { setSelected(equipment); refreshInventory() }}
                      />
                    )}
                    {!isEditingEquipment && user.permissions.delete_equipment && <button className="danger-button detail-delete-button" type="button" onClick={removeSelectedEquipment}><ActionIcon name="delete" />{fr.equipment.deleteGenerator}</button>}
                    {!isEditingEquipment && <button className="equipment-history-button" type="button" onClick={() => setShowHistory('equipment')}><ActionIcon name="history" />{fr.audit.button}</button>}
                  </div>
                  <section>
                    <h3>{fr.equipment.assignment}</h3>
                    <dl>
                      <div><dt>{fr.equipment.project}</dt><dd>{selected.current_project_assignment?.project.name ?? fr.common.notProvided}</dd></div>
                      <div><dt>{fr.equipment.location}</dt><dd>{locationName(selected)}</dd></div>
                      <div><dt>{fr.equipment.custodian}</dt><dd>{selected.responsible ? <>{selected.responsible.name}{selected.responsible_source === 'site' && <small className="responsibility-source">{fr.equipment.inheritedFromSite}</small>}</> : fr.common.notProvided}</dd></div>
                    </dl>
                  </section>
                  <section>
                    <h3>{fr.equipment.identification}</h3>
                    <dl>
                      <div><dt>{fr.equipment.serialNumber}</dt><dd>{displayedValue(selected.serial_number)}</dd></div>
                      <div><dt>{fr.equipment.manufactureYear}</dt><dd>{displayedValue(selected.manufacture_year)}</dd></div>
                      <div><dt>{fr.equipment.condition}</dt><dd>{selected.condition ? <span className={`status-badge status-${selected.condition}`} style={catalogBadgeStyle(options?.catalogs, 'equipment_condition', selected.condition)}>{catalogLabel(options?.catalogs, 'equipment_condition', selected.condition)}</span> : fr.common.notProvided}</dd></div>
                      <div><dt>{fr.equipment.situation}</dt><dd>{selected.operational_situation ? <span className="status-badge" style={catalogBadgeStyle(options?.catalogs, 'operational_situation', selected.operational_situation)}>{catalogLabel(options?.catalogs, 'operational_situation', selected.operational_situation)}</span> : fr.common.notProvided}</dd></div>
                    </dl>
                  </section>
                  {selected.generator_details && (
                    <section>
                      <h3>{fr.equipment.technicalDetails}</h3>
                      <dl>
                        <div><dt>{fr.equipment.apparentPower}</dt><dd>{measurement(selected.generator_details.apparent_power_kva, 'kVA')}</dd></div>
                        <div><dt>{fr.equipment.activePower}</dt><dd>{measurement(selected.generator_details.active_power_kw, 'kW')}</dd></div>
                        <div><dt>{fr.equipment.voltage}</dt><dd>{displayedValue(selected.generator_details.voltage_rating)}</dd></div>
                        <div><dt>{fr.equipment.frequency}</dt><dd>{displayedValue(selected.generator_details.frequency_hz)}</dd></div>
                        <div><dt>{fr.equipment.current}</dt><dd>{displayedValue(selected.generator_details.current_rating)}</dd></div>
                        <div><dt>{fr.equipment.phases}</dt><dd>{displayedValue(selected.generator_details.phases)}</dd></div>
                        <div><dt>{fr.equipment.fuel}</dt><dd>{selected.generator_details.fuel_type ? <span className="status-badge" style={catalogBadgeStyle(options?.catalogs, 'fuel_type', selected.generator_details.fuel_type)}>{catalogLabel(options?.catalogs, 'fuel_type', selected.generator_details.fuel_type)}</span> : fr.common.notProvided}</dd></div>
                        <div><dt>{fr.equipment.tank}</dt><dd>{displayedValue(selected.generator_details.tank_capacity_litres)}</dd></div>
                        <div><dt>{fr.equipment.engineHours}</dt><dd>{displayedValue(selected.generator_details.current_engine_hours)}</dd></div>
                      </dl>
                    </section>
                  )}
                  <section>
                    <h3>{fr.equipment.observations}</h3>
                    <p className="observations">{displayedValue(selected.observations)}</p>
                  </section>
                  <EquipmentImages equipment={selected} canManage={user.permissions.manage_equipment && isEditingEquipment} onChanged={async () => { setSelected(await getEquipmentItem(selected.id)) }} />
                  <MaintenanceSection
                    equipment={selected}
                    employees={options?.employees ?? []}
                    canManage={user.permissions.manage_maintenance}
                    canDelete={user.permissions.delete_maintenance}
                    catalogs={options?.catalogs ?? []}
                    onChanged={async () => {
                      setSelected(await getEquipmentItem(selected.id))
                    }}
                  />
                </div>
              </>
            )}
          </aside>
        </div>
      )}
      {showHistory && <Modal title={fr.audit.title} onClose={() => setShowHistory(null)}>
        {showHistory === 'equipment'
          ? selected && selected.changes.length > 0
            ? <div className="audit-list audit-modal-list">{selected.changes.map((change) => <article key={change.id}><span className="audit-dot" aria-hidden="true" /><div><strong>{fr.audit.equipmentActions[change.type]}</strong><p>{fr.audit.by(change.actor?.name ?? fr.audit.system)} · <time dateTime={change.occurred_at}>{auditDate(change.occurred_at)}</time></p></div></article>)}</div>
            : <p className="audit-empty">{fr.audit.empty}</p>
          : siteContext?.changes?.length
            ? <div className="audit-list audit-modal-list">{siteContext.changes.map((change) => <article key={change.id}><span className="audit-dot" aria-hidden="true" /><div><strong>{fr.audit.siteActions[change.action]}</strong><p>{fr.audit.by(change.actor?.name ?? fr.audit.system)} · <time dateTime={change.occurred_at}>{auditDate(change.occurred_at)}</time></p></div></article>)}</div>
            : <p className="audit-empty">{fr.audit.empty}</p>}
      </Modal>}
    </div>
  )
}

type AdvancedEquipmentFiltersProps = {
  filters: EquipmentFilters
  options: EquipmentFilterOptions | null
  onChange: (name: keyof EquipmentFilters, value: string) => void
}

type EquipmentFilterDrawerProps = AdvancedEquipmentFiltersProps & {
  isSiteView: boolean
  physicalLocationOptions: EquipmentFilterOptions['locations']
  onProjectChange: (projectId: string) => void
  onClose: () => void
}

function EquipmentFilterDrawer({ filters, options, isSiteView, physicalLocationOptions, onChange, onProjectChange, onClose }: EquipmentFilterDrawerProps) {
  return <div className="filter-drawer-backdrop" onMouseDown={onClose}>
    <aside className="filter-drawer" role="dialog" aria-modal="true" aria-label={fr.equipment.filters} onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="section-label">{fr.equipment.section}</p><h2>{fr.equipment.filters}</h2></div><button type="button" onClick={onClose} aria-label={fr.common.close}><ActionIcon name="close" /></button></header>
      <div className="filter-drawer-content">
        <fieldset className="drawer-basic-filters"><legend>{fr.equipment.filters}</legend><div className="advanced-filter-grid">
          <label><span>{fr.equipment.condition}</span><select value={filters.condition} onChange={(event) => onChange('condition', event.target.value)}><option value="">{fr.common.all}</option>{catalogOptions(options?.catalogs, 'equipment_condition').map((option) => <option key={option.code} value={option.code}>{catalogLabel(options?.catalogs, 'equipment_condition', option.code)}</option>)}</select></label>
          <label><span>{fr.equipment.situation}</span><select value={filters.operational_situation} onChange={(event) => onChange('operational_situation', event.target.value)}><option value="">{fr.common.all}</option>{catalogOptions(options?.catalogs, 'operational_situation').map((option) => <option key={option.code} value={option.code}>{catalogLabel(options?.catalogs, 'operational_situation', option.code)}</option>)}</select></label>
          {!isSiteView && <label><span>{fr.equipment.project}</span><select value={filters.project_id} onChange={(event) => onProjectChange(event.target.value)}><option value="">{fr.common.all}</option>{options?.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
          <label><span>{fr.equipment.location}</span><select value={filters.location_id} onChange={(event) => onChange('location_id', event.target.value)}><option value="">{fr.common.all}</option>{physicalLocationOptions.map((location) => <option key={location.id} value={location.id}>{filters.project_id === '' ? locationOptionLabel(location) : location.name}</option>)}</select></label>
          <label><span>{fr.equipment.sort}</span><select value={filters.sort} onChange={(event) => onChange('sort', event.target.value)}><option value="created_at_desc">{fr.equipment.addedNewestFirst}</option><option value="created_at_asc">{fr.equipment.addedOldestFirst}</option><option value="manufacture_year_desc">{fr.equipment.manufacturedNewestFirst}</option><option value="manufacture_year_asc">{fr.equipment.manufacturedOldestFirst}</option></select></label>
        </div></fieldset>
        <AdvancedEquipmentFilters filters={filters} options={options} onChange={onChange} />
      </div>
    </aside>
  </div>
}

function AdvancedEquipmentFilters({ filters, options, onChange }: AdvancedEquipmentFiltersProps) {
  const field = (name: keyof EquipmentFilters) => ({
    value: String(filters[name]),
    onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(name, event.target.value),
  })

  return (
    <div className="advanced-filter-panel">
      <fieldset><legend>{fr.equipment.assignmentAndDateFilters}</legend><div className="advanced-filter-grid">
        <label><span>{fr.equipment.custodian}</span><select value={filters.custodian_employee_id} onChange={(event) => onChange('custodian_employee_id', event.target.value)}><option value="">{fr.common.all}</option>{options?.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
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
        <label><span>{fr.equipment.fuel}</span><select value={filters.fuel_type} onChange={(event) => onChange('fuel_type', event.target.value)}><option value="">{fr.common.all}</option>{catalogOptions(options?.catalogs, 'fuel_type').map((option) => <option key={option.code} value={option.code}>{catalogLabel(options?.catalogs, 'fuel_type', option.code)}</option>)}</select></label>
        <label><span>{fr.equipment.engineHoursMin}</span><input type="number" min="0" step="0.01" {...field('engine_hours_min')} /></label>
        <label><span>{fr.equipment.engineHoursMax}</span><input type="number" min="0" step="0.01" {...field('engine_hours_max')} /></label>
        <label><span>{fr.equipment.tankMin}</span><input type="number" min="0" step="0.01" {...field('tank_capacity_litres_min')} /></label>
        <label><span>{fr.equipment.tankMax}</span><input type="number" min="0" step="0.01" {...field('tank_capacity_litres_max')} /></label>
      </div></fieldset>
    </div>
  )
}

function RangeInputs({ label, minimum, maximum }: { label: string; minimum: InputHTMLAttributes<HTMLInputElement>; maximum: InputHTMLAttributes<HTMLInputElement> }) {
  return <div className="range-filter"><span>{label}</span><div><input type="number" min="0" step="0.01" placeholder={fr.common.minimum} {...minimum} /><input type="number" min="0" step="0.01" placeholder={fr.common.maximum} {...maximum} /></div></div>
}
