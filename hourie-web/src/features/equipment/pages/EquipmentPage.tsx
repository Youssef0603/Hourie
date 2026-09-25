import { useEffect, useRef, useState } from 'react'
import type { AuthenticatedUser } from '../../auth/types'
import { AddGeneratorForm } from '../components/AddGeneratorForm'
import { ImportGeneratorForm } from '../components/ImportGeneratorForm'
import { EquipmentDetailPanel } from '../components/EquipmentDetailPanel'
import { EquipmentInventoryTable } from '../components/EquipmentInventoryTable'
import { SettingsPage } from '../../settings/pages/SettingsPage'
import { EquipmentFilterDrawer } from '../components/EquipmentFilterDrawer'
import { AssetInventoryView } from '../components/AssetInventoryView'
import { assetCategoryLabel, isAssetCategoryCode, type AssetView } from '../assetCategories'
import { advancedFilterKeys, initialFilters } from '../filters'
import { PeoplePage } from '../../directory/pages/PeoplePage'
import { SitesPage } from '../../directory/pages/SitesPage'
import { SiteEditForm } from '../../directory/components/SiteEditForm'
import { deleteSite, getSite } from '../../directory/api'
import type { Site } from '../../directory/types'
import { fr, type Language } from '../../../i18n/fr'
import { WorkspaceHeader, WorkspaceSidebar } from '../../../app/WorkspaceNavigation'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { Modal } from '../../../shared/components/Modal'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import {
  deleteEquipment,
  getEquipment,
  getEquipmentFilterOptions,
  getEquipmentItem,
} from '../api'
import { parseWorkspaceRoute, workspacePath, type WorkspaceRoute } from '../../../app/routes'
import type {
  Equipment,
  EquipmentFilterOptions,
  EquipmentFilters,
  EquipmentListResponse,
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

function auditDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function equipmentAuditLabel(type: Equipment['changes'][number]['type'], categoryCode: string, language: Language): string {
  if (categoryCode === 'generator') return fr.audit.equipmentActions[type]

  const category = isAssetCategoryCode(categoryCode) ? assetCategoryLabel(categoryCode, language) : fr.assets.title

  if (type === 'initial_import') return fr.audit.assetImported(category)
  if (type === 'identity_updated') return fr.audit.assetIdentityUpdated(category)
  if (type === 'specifications_updated') return fr.audit.assetSpecificationsUpdated(category)
  if (type === 'archived') return fr.audit.assetArchived(category)

  return fr.audit.equipmentActions[type]
}

export function EquipmentPage({
  user,
  isLoggingOut,
  logoutError,
  onLogout,
  language,
  onToggleLanguage,
}: EquipmentPageProps) {
  const [pathname, setPathname] = useState(() => window.location.pathname)
  const route = parseWorkspaceRoute(pathname)
  const previousSiteId = useRef(route.siteId)
  const previousAssetCategory = useRef(route.section === 'assets' ? route.assetCategory : 'generator')
  const activeSection = route.section
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    category: route.section === 'assets' ? route.assetCategory === 'all' ? '' : route.assetCategory : 'generator',
    project_id: route.siteId ? String(route.siteId) : '',
  }))
  const [search, setSearch] = useState('')
  const [result, setResult] = useState<EquipmentListResponse | null>(null)
  const [options, setOptions] = useState<EquipmentFilterOptions | null>(null)
  const [selected, setSelected] = useState<Equipment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isEditingEquipment, setIsEditingEquipment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddGenerator, setShowAddGenerator] = useState(false)
  const [showImportGenerator, setShowImportGenerator] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [showHistory, setShowHistory] = useState<'equipment' | 'site' | null>(null)
  const [showEditSite, setShowEditSite] = useState(false)
  const [siteContext, setSiteContext] = useState<Site | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    const canonicalPath = workspacePath(parseWorkspaceRoute(window.location.pathname))
    if (window.location.pathname !== canonicalPath) window.history.replaceState(null, '', canonicalPath)
    const onPopState = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    let cancelled = false
    const currentRoute = parseWorkspaceRoute(pathname)
    if (currentRoute.section === 'catalogs' && !user.permissions.manage_sites) {
      navigate('/assets/generator', true)
      return
    }
    const wasSiteId = previousSiteId.current
    previousSiteId.current = currentRoute.siteId
    const currentCategory = currentRoute.section === 'assets' ? currentRoute.assetCategory : 'generator'
    const wasAssetCategory = previousAssetCategory.current
    previousAssetCategory.current = currentCategory
    // The browser history is an external source of navigation state.
    setShowHistory(null)
    setShowEditSite(false)
    setShowFilterDrawer(false)
    setShowAddGenerator(false)
    setShowImportGenerator(false)
    setIsEditingEquipment(false)
    setSelected(null)
    setIsLoadingDetail(currentRoute.equipmentId !== null)

    if (currentRoute.siteId) {
      setSiteContext((current) => current?.id === currentRoute.siteId ? current : null)
      if (wasSiteId !== currentRoute.siteId) {
        setIsLoading(true)
        setResult(null)
        setFilters({ ...initialFilters, category: 'generator', project_id: String(currentRoute.siteId) })
      }
      getSite(currentRoute.siteId).then((site) => {
        if (!cancelled) setSiteContext(site)
      }).catch(() => {
        if (!cancelled) {
          setError(fr.directory.loadError)
          navigate('/sites', true)
        }
      })
    } else {
      setSiteContext(null)
      if (wasSiteId !== null || wasAssetCategory !== currentCategory) {
        setIsLoading(true)
        setResult(null)
        setSearch('')
        setFilters({ ...initialFilters, category: currentCategory === 'all' ? '' : currentCategory })
      }
    }

    if (currentRoute.equipmentId) {
      getEquipmentItem(currentRoute.equipmentId).then((equipment) => {
        if (!cancelled) setSelected(equipment)
      }).catch(() => {
        if (!cancelled) setError(fr.equipment.detailError)
      }).finally(() => {
        if (!cancelled) setIsLoadingDetail(false)
      })
    }

    return () => { cancelled = true }
  }, [pathname, user.permissions.manage_sites])

  function navigate(path: string, replace = false) {
    if (window.location.pathname === path) return
    if (replace) window.history.replaceState(null, '', path)
    else window.history.pushState(null, '', path)
    setPathname(path)
  }

  function navigateSection(section: WorkspaceRoute['section']) {
    navigate(section === 'catalogs' ? '/settings' : section === 'assets' ? '/assets' : section === 'generators' ? '/assets/generator' : `/${section}`)
  }

  function navigateAsset(category: AssetView) {
    navigate(`/assets/${category}`)
  }

  function closeEquipment() {
    navigate(route.siteId ? `/sites/${route.siteId}` : route.section === 'assets' ? `/assets/${route.assetCategory}` : '/assets/generator')
  }

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

  function openEquipment(id: number) {
    navigate(route.siteId ? `/sites/${route.siteId}/generators/${id}` : route.section === 'assets' ? `/assets/${route.assetCategory}/${id}` : `/assets/generator/${id}`)
  }

  const isSiteView = siteContext !== null
  const hasFilters = Object.entries(filters).some(
    ([key, value]) =>
      !['page', 'per_page', 'sort', 'q', 'category', ...(isSiteView ? ['project_id'] : [])].includes(key)
      && value !== '',
  )
  const advancedFilterCount = advancedFilterKeys.filter((key) => filters[key] !== '').length
  const physicalLocationOptions = (options?.locations ?? []).filter((location) => (
    location.parent_id !== null
    && (filters.project_id === '' || String(location.project_id) === filters.project_id)
  ))
  function openSiteInventory(site: Site) {
    setSiteContext(site)
    navigate(`/sites/${site.id}`)
    setSearch('')
    setIsLoading(true)
    setResult(null)
    setFilters({ ...initialFilters, category: 'generator', project_id: String(site.id) })
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
    setFilters({ ...initialFilters, category: 'generator' })
  }

  async function removeSelectedEquipment() {
    if (!selected || !window.confirm(selected.category.code === 'generator' ? fr.equipment.deleteConfirmation : fr.assets.deleteConfirmation)) return

    try {
      await deleteEquipment(selected.id)
      closeEquipment()
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
      navigate('/sites', true)
    } catch {
      setError(fr.common.deleteError)
    }
  }

  if (route.siteId && siteContext?.id !== route.siteId) {
    return <main className="session-loading" aria-live="polite"><LoadingSpinner label={fr.common.loading} /></main>
  }

  return (
    <div className="workspace-shell">
      <WorkspaceHeader user={user} language={language} onToggleLanguage={onToggleLanguage} onLogout={onLogout} isLoggingOut={isLoggingOut} />

      <div className={`workspace-layout${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <WorkspaceSidebar user={user} language={language} activeSection={activeSection} activeAssetCategory={activeSection === 'assets' ? route.assetCategory : activeSection === 'generators' ? 'generator' : 'all'} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={() => setIsSidebarCollapsed((value) => !value)} onNavigate={navigateSection} onNavigateAsset={navigateAsset} />

      {(activeSection === 'generators' || isSiteView) ? <main className="equipment-page">
        {isSiteView && <nav className="breadcrumbs" aria-label={fr.navigation.breadcrumbs}>
          <button type="button" onClick={() => navigateSection('generators')}>{fr.equipment.section}</button>
          <span aria-hidden="true">/</span>
          <button type="button" onClick={() => navigateSection('sites')}>{fr.directory.sites}</button>
          <span aria-hidden="true">/</span>
          <strong aria-current="page">{siteContext.name}</strong>
        </nav>}
        <section className="page-heading">
          <div>
            {!isSiteView && <p className="section-label">{fr.navigation.assets}</p>}
            {isSiteView ? <div className="site-page-title-row"><button className="table-refresh-button" type="button" onClick={() => navigateSection('sites')}><ActionIcon name="collapse" /><span>{fr.navigation.sites}</span></button><h1>{siteContext.name}</h1></div> : <h1>{fr.equipment.title}</h1>}
            {(!isSiteView || siteContext?.address) && <p>{isSiteView ? siteContext?.address : fr.equipment.subtitle}</p>}
          </div>
          <div className="heading-actions">
            {isSiteView && <button className="table-refresh-button" type="button" onClick={() => setShowHistory('site')}><ActionIcon name="history" /><span>{fr.audit.button}</span></button>}
            {isSiteView && user.permissions.manage_sites && <button className="table-refresh-button" type="button" onClick={() => setShowEditSite(true)}><ActionIcon name="edit" /><span>{fr.common.edit}</span></button>}
            {isSiteView && user.permissions.manage_sites && <button className="danger-button" type="button" onClick={removeCurrentSite}><ActionIcon name="delete" /><span>{fr.directory.deleteSite}</span></button>}
            {!isSiteView && user.permissions.manage_equipment && <button className="table-refresh-button import-excel-action" type="button" onClick={() => setShowImportGenerator(true)}><ActionIcon name="upload" /><span>{fr.equipment.importExcel}</span></button>}
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

        {showAddGenerator && options && <Modal title={fr.equipment.addGenerator} size="wide" onClose={() => setShowAddGenerator(false)}><AddGeneratorForm options={options} initialProjectId={siteContext?.id} onCreated={(equipment) => { setShowAddGenerator(false); openEquipment(equipment.id); setFilters((current) => ({ ...current, page: 1 })); refreshInventory() }} /></Modal>}
        {showImportGenerator && <Modal title={fr.equipment.importTitle} onClose={() => setShowImportGenerator(false)}><ImportGeneratorForm onClose={() => setShowImportGenerator(false)} onImported={() => { refreshInventory(); refreshFilterOptions() }} /></Modal>}
        {showEditSite && siteContext && <Modal title={fr.directory.editSite} size="wide" onClose={() => setShowEditSite(false)}><SiteEditForm site={siteContext} catalogs={options?.catalogs} employees={options?.employees ?? []} onSaved={(site) => { setSiteContext(site); setShowEditSite(false); refreshFilterOptions(); refreshInventory() }} /></Modal>}

        <section className="inventory-panel" aria-label={fr.equipment.title}>
          <div className="filter-bar">
            <div className="search-field">
              <label htmlFor="equipment-search">{fr.equipment.search}</label>
              <input
                id="equipment-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={fr.equipment.searchPlaceholder}
              />
              {search !== '' && <button className="search-clear-button" type="button" onClick={() => setSearch('')} aria-label={fr.common.clearSearch}><ActionIcon name="close" /></button>}
            </div>
            <div className="filter-toolbar-actions">
              <button className={`advanced-filter-toggle${showFilterDrawer ? ' active' : ''}`} type="button" onClick={() => setShowFilterDrawer(true)} aria-expanded={showFilterDrawer}>
                <ActionIcon name="filter" />
                <span>{fr.equipment.filters}</span>
                {hasFilters && <strong>{advancedFilterCount || 1}</strong>}
              </button>
              {user.permissions.manage_equipment && <button className="table-refresh-button table-add-button" type="button" onClick={() => setShowAddGenerator(true)} aria-label={fr.equipment.addGenerator} title={fr.equipment.addGenerator}><ActionIcon name="add" /></button>}
              <button className="table-refresh-button filter-refresh-button" type="button" onClick={refreshInventory} aria-label={fr.common.refresh} title={fr.common.refresh}><ActionIcon name="refresh" /></button>
              {hasFilters && (
                <button
                  className="clear-filters"
                  type="button"
                  onClick={() => {
                    setIsLoading(true)
                    setError(null)
                    setFilters({ ...initialFilters, q: search, category: 'generator', project_id: isSiteView ? String(siteContext?.id) : '' })
                  }}
                >
                  {fr.equipment.clearFilters}
                </button>
              )}
            </div>
          </div>

          <EquipmentInventoryTable
            result={result}
            isLoading={isLoading}
            options={options}
            onOpenEquipment={openEquipment}
            onChangePage={changePage}
          />
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
      </main> : activeSection === 'assets' ? <AssetInventoryView category={route.assetCategory} language={language} options={options} filters={filters} search={search} result={result} isLoading={isLoading} error={error} canManage={user.permissions.manage_equipment} onSearchChange={setSearch} onFilterChange={updateFilter} onRefresh={refreshInventory} onPageChange={changePage} onOpen={openEquipment} onCreated={(equipment) => { refreshInventory(); openEquipment(equipment.id) }} onClearFilters={() => { setIsLoading(true); setError(null); setFilters({ ...initialFilters, q: search, category: route.assetCategory === 'all' ? filters.category : route.assetCategory }) }} onCategorySelect={(selectedCategory) => { setIsLoading(true); setError(null); setSearch(''); setFilters({ ...initialFilters, category: selectedCategory === 'all' ? '' : selectedCategory }) }} /> : activeSection === 'sites' ? <SitesPage canAdd={user.permissions.manage_sites} catalogs={options?.catalogs} employees={options?.employees} onOpenSite={openSiteInventory} /> : activeSection === 'catalogs' ? <SettingsPage onChanged={refreshFilterOptions} /> : <PeoplePage canAdd={user.permissions.manage_users} canManageManagerAccounts={user.role === 'manager'} catalogs={options?.catalogs} />}
      </div>

      {(activeSection === 'generators' || activeSection === 'assets' || isSiteView) && <EquipmentDetailPanel
        user={user}
        language={language}
        selected={selected}
        options={options}
        isLoadingDetail={isLoadingDetail}
        isEditingEquipment={isEditingEquipment}
        onClose={closeEquipment}
        onDelete={removeSelectedEquipment}
        onShowHistory={() => setShowHistory('equipment')}
        onEditingChange={setIsEditingEquipment}
        onChanged={(equipment) => { setSelected(equipment); refreshInventory() }}
        onRefreshSelected={async () => { if (selected) setSelected(await getEquipmentItem(selected.id)) }}
        onMaintenanceChanged={async () => {
          if (selected) setSelected(await getEquipmentItem(selected.id))
        }}
      />}
      {showHistory && <Modal title={fr.audit.title} onClose={() => setShowHistory(null)}>
        {showHistory === 'equipment'
          ? selected && selected.changes.length > 0
            ? <div className="audit-list audit-modal-list">{selected.changes.map((change) => <article key={change.id}><span className="audit-dot" aria-hidden="true" /><div><strong>{equipmentAuditLabel(change.type, selected.category.code, language)}</strong><p>{fr.audit.by(change.actor?.name ?? fr.audit.system)} · <time dateTime={change.occurred_at}>{auditDate(change.occurred_at)}</time></p></div></article>)}</div>
            : <p className="audit-empty">{fr.audit.empty}</p>
          : siteContext?.changes?.length
            ? <div className="audit-list audit-modal-list">{siteContext.changes.map((change) => <article key={change.id}><span className="audit-dot" aria-hidden="true" /><div><strong>{fr.audit.siteActions[change.action]}</strong><p>{fr.audit.by(change.actor?.name ?? fr.audit.system)} · <time dateTime={change.occurred_at}>{auditDate(change.occurred_at)}</time></p></div></article>)}</div>
            : <p className="audit-empty">{fr.audit.empty}</p>}
      </Modal>}
    </div>
  )
}
