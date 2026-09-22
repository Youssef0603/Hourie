import { useEffect, useRef, useState } from 'react'
import type { AuthenticatedUser } from '../../auth/types'
import { AddGeneratorForm } from '../components/AddGeneratorForm'
import { ImportGeneratorForm } from '../components/ImportGeneratorForm'
import { MaintenanceWarningsPanel } from '../components/MaintenanceWarningsPage'
import { EquipmentDetailPanel } from '../components/EquipmentDetailPanel'
import { EquipmentInventoryTable } from '../components/EquipmentInventoryTable'
import { SettingsPage } from '../../settings/pages/SettingsPage'
import { EquipmentFilterDrawer } from '../components/EquipmentFilterDrawer'
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
  getMaintenanceWarnings,
} from '../api'
import { parseWorkspaceRoute, workspacePath, type WorkspaceRoute } from '../../../app/routes'
import type {
  Equipment,
  EquipmentFilterOptions,
  EquipmentFilters,
  EquipmentListResponse,
  MaintenanceWarningResponse,
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
  const activeSection = route.section
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
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
  const [maintenanceWarnings, setMaintenanceWarnings] = useState<MaintenanceWarningResponse | null>(null)
  const [maintenanceWarningPage, setMaintenanceWarningPage] = useState(1)
  const [maintenanceWarningRefreshToken, setMaintenanceWarningRefreshToken] = useState(0)
  const [isLoadingMaintenanceWarnings, setIsLoadingMaintenanceWarnings] = useState(true)
  const [maintenanceWarningError, setMaintenanceWarningError] = useState<string | null>(null)

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
      navigate('/generators', true)
      return
    }
    const wasSiteId = previousSiteId.current
    previousSiteId.current = currentRoute.siteId
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
        setFilters({ ...initialFilters, project_id: String(currentRoute.siteId) })
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
      if (wasSiteId !== null) {
        setIsLoading(true)
        setResult(null)
        setFilters({ ...initialFilters })
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
    navigate(section === 'catalogs' ? '/settings' : `/${section}`)
  }

  function closeEquipment() {
    navigate(route.siteId ? `/sites/${route.siteId}` : '/generators')
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

  useEffect(() => {
    let cancelled = false

    getMaintenanceWarnings(maintenanceWarningPage)
      .then((warnings) => {
        if (!cancelled) {
          setMaintenanceWarnings(warnings)
          setMaintenanceWarningError(null)
        }
      })
      .catch(() => {
        if (!cancelled) setMaintenanceWarningError(fr.maintenanceWarnings.loadError)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMaintenanceWarnings(false)
      })

    return () => {
      cancelled = true
    }
  }, [maintenanceWarningPage, maintenanceWarningRefreshToken])

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
    navigate(route.siteId ? `/sites/${route.siteId}/generators/${id}` : `/generators/${id}`)
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
    setSiteContext(site)
    navigate(`/sites/${site.id}`)
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
        <WorkspaceSidebar user={user} activeSection={activeSection} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={() => setIsSidebarCollapsed((value) => !value)} onNavigate={navigateSection} />

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
            {!isSiteView && <p className="section-label">{fr.equipment.section}</p>}
            {isSiteView ? <div className="site-page-title-row"><button className="table-refresh-button" type="button" onClick={() => navigateSection('sites')}><ActionIcon name="collapse" /><span>{fr.navigation.sites}</span></button><h1>{siteContext.name}</h1></div> : <h1>{fr.equipment.title}</h1>}
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

        {showAddGenerator && options && <Modal title={fr.equipment.addGenerator} size="wide" onClose={() => setShowAddGenerator(false)}><AddGeneratorForm options={options} initialProjectId={siteContext?.id} onCancel={() => setShowAddGenerator(false)} onCreated={(equipment) => { setShowAddGenerator(false); openEquipment(equipment.id); setFilters((current) => ({ ...current, page: 1 })); refreshInventory() }} /></Modal>}
        {showImportGenerator && <Modal title={fr.equipment.importTitle} onClose={() => setShowImportGenerator(false)}><ImportGeneratorForm onClose={() => setShowImportGenerator(false)} onImported={() => { refreshInventory(); refreshFilterOptions() }} /></Modal>}
        {showEditSite && siteContext && <Modal title={fr.directory.editSite} size="wide" onClose={() => setShowEditSite(false)}><SiteEditForm site={siteContext} catalogs={options?.catalogs} employees={options?.employees ?? []} onCancel={() => setShowEditSite(false)} onSaved={(site) => { setSiteContext(site); setShowEditSite(false); refreshFilterOptions(); refreshInventory() }} /></Modal>}

        {!isSiteView && <MaintenanceWarningsPanel result={maintenanceWarnings} isLoading={isLoadingMaintenanceWarnings} error={maintenanceWarningError} onRefresh={() => { setIsLoadingMaintenanceWarnings(true); setMaintenanceWarningRefreshToken((current) => current + 1) }} onPageChange={(page) => { setIsLoadingMaintenanceWarnings(true); setMaintenanceWarningPage(page) }} onOpenEquipment={openEquipment} />}

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

          <EquipmentInventoryTable
            result={result}
            isLoading={isLoading}
            language={language}
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
      </main> : activeSection === 'sites' ? <SitesPage canAdd={user.permissions.manage_sites} catalogs={options?.catalogs} employees={options?.employees} onOpenSite={openSiteInventory} /> : activeSection === 'catalogs' ? <SettingsPage onChanged={refreshFilterOptions} /> : <PeoplePage canAdd={user.permissions.manage_users} canManageManagerAccounts={user.role === 'manager'} catalogs={options?.catalogs} />}
      </div>

      {(activeSection === 'generators' || isSiteView) && <EquipmentDetailPanel
        user={user}
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
          setMaintenanceWarningPage(1)
          setMaintenanceWarningRefreshToken((current) => current + 1)
        }}
      />}
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
