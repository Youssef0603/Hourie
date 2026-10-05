import { useEffect, useState, type FormEvent } from 'react'
import { fr } from '../../../i18n/fr'
import { createSite, getSite, getSites } from '../api'
import type { ProjectStatus, Site, SiteDetails } from '../types'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { NavigationIcon } from '../../../shared/components/NavigationIcon'
import { Modal } from '../../../shared/components/Modal'
import { ApiError } from '../../../shared/api/http'
import type { CatalogOption, NamedReference } from '../../equipment/types'
import { catalogBadgeStyle, catalogLabel, catalogOptions } from '../../equipment/catalogs'
import { DirectoryHeading } from '../components/DirectoryHeading'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { SiteEditForm } from '../components/SiteEditForm'
import { EmptyState } from '../../../shared/components/EmptyState'
import { DataTable } from '../../../shared/components/DataTable'

type SitesPageProps = {
  canAdd: boolean
  onOpenSite?: (site: Site) => void
  onOpenInsurance?: (site: Site) => void
  catalogs?: CatalogOption[]
  employees?: NamedReference[]
}

export function SitesPage({ canAdd, onOpenSite, onOpenInsurance, catalogs, employees = [] }: SitesPageProps) {
  const [sites, setSites] = useState<Site[]>([])
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('')
  const [startDate, setStartDate] = useState('')
  const [expectedEndDate, setExpectedEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [responsibleEmployeeId, setResponsibleEmployeeId] = useState('')
  const [locations, setLocations] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedSite, setSelectedSite] = useState<SiteDetails | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [isEditingSite, setIsEditingSite] = useState(false)

  useEffect(() => {
    refreshSites()
  }, [])

  async function refreshSites() {
    setError(null)
    setIsRefreshing(true)
    try {
      setSites(await getSites())
    } catch {
      setError(fr.directory.loadError)
    } finally {
      setIsRefreshing(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      const site = await createSite({
        name: name.trim(),
        address: address.trim() || null,
        status: status || projectStatusOptions[0]?.code || '',
        start_date: startDate || null,
        expected_end_date: expectedEndDate || null,
        notes: notes.trim() || null,
        responsible_employee_id: responsibleEmployeeId === '' ? null : Number(responsibleEmployeeId),
        locations: locations.map((location) => location.trim()).filter(Boolean),
      })
      setSites((current) => [...current, site].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
      setAddress('')
      setStatus('')
      setStartDate('')
      setExpectedEndDate('')
      setNotes('')
      setResponsibleEmployeeId('')
      setLocations([])
      setShowForm(false)
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors)[0]?.[0] ?? fr.directory.saveError : fr.directory.saveError)
    }
  }

  function updateLocation(index: number, value: string) {
    setLocations((current) => current.map((location, locationIndex) => locationIndex === index ? value : location))
  }

  function removeLocation(index: number) {
    setLocations((current) => current.filter((_, locationIndex) => locationIndex !== index))
  }

  async function openSiteDetails(site: Site) {
    setSelectedSite({ ...site, equipment: [] })
    setDetailsError(null)
    setIsLoadingDetails(true)

    try {
      const details = await getSite(site.id)
      setSelectedSite((current) => current?.id === site.id
        ? { ...details, active_equipment_count: site.active_equipment_count }
        : current)
    } catch {
      setDetailsError(fr.directory.loadError)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  function formatSiteDate(value: string | null) {
    if (!value) return fr.common.toComplete
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(`${value}T00:00:00`))
  }

  const projectStatusOptions = catalogOptions(catalogs, 'project_status')
  const selectedProjectStatus = status || projectStatusOptions[0]?.code || ''
  const searchTerm = search.trim().toLocaleLowerCase('fr-FR')
  const visibleSites = searchTerm
    ? sites.filter((site) => [site.name, site.address, site.responsible?.name].filter(Boolean).join(' ').toLocaleLowerCase('fr-FR').includes(searchTerm))
    : sites
  const sitesPerPage = 10
  const totalPages = Math.max(1, Math.ceil(visibleSites.length / sitesPerPage))
  const page = Math.min(currentPage, totalPages)
  const paginatedSites = visibleSites.slice((page - 1) * sitesPerPage, page * sitesPerPage)

  return (
    <main className="directory-page">
      <DirectoryHeading title={fr.directory.sites} subtitle={fr.directory.sitesSubtitle} canAdd={false} showForm={showForm} onToggle={() => setShowForm((value) => !value)} addLabel={fr.directory.addSite} />
      {error && <div className="form-alert" role="alert">{error}</div>}
      {showForm && (
        <Modal title={fr.directory.addSite} size="wide" onClose={() => setShowForm(false)}>
          <form className="site-form" onSubmit={submit}>
            {error && <div className="form-alert" role="alert">{error}</div>}
            <div className="asset-form-layout">
            <section className="asset-form-section"><div className="asset-form-section-heading"><div><strong>{fr.directory.siteInformation}</strong></div></div><div className="maintenance-form-grid site-form-grid asset-form-grid-3">
              <label><span>{fr.directory.siteName}</span><input required value={name} onChange={(event) => setName(event.target.value)} /></label>
              <label><span>{fr.directory.siteStatus}</span><SearchableSelect ariaLabel={fr.directory.siteStatus} value={selectedProjectStatus} onChange={(value) => setStatus(value as ProjectStatus)} placeholder={fr.common.toComplete} includeEmpty={false} options={projectStatusOptions.map((option) => ({ value: option.code, label: catalogLabel(catalogs, 'project_status', option.code) }))} /></label>
              <label><span>{fr.directory.siteResponsible}</span><SearchableSelect ariaLabel={fr.directory.siteResponsible} value={responsibleEmployeeId} onChange={setResponsibleEmployeeId} placeholder={fr.directory.selectResponsible} options={employees.map((employee) => ({ value: String(employee.id), label: employee.name }))} /></label>
              <label><span>{fr.directory.siteAddress}</span><input value={address} onChange={(event) => setAddress(event.target.value)} /></label>
            </div></section>
            <section className="asset-form-section"><div className="asset-form-section-heading"><div><strong>{fr.directory.sitePlanning}</strong></div></div><div className="maintenance-form-grid site-form-grid asset-form-grid-2">
              <label><span>{fr.directory.startDate}</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
              <label><span>{fr.directory.expectedEndDate}</span><input type="date" min={startDate || undefined} value={expectedEndDate} onChange={(event) => setExpectedEndDate(event.target.value)} /></label>
            </div></section>
            <section className="asset-form-section"><div className="asset-form-section-heading site-locations-section-heading"><div><strong>{fr.directory.initialLocations}</strong></div><button className="site-add-location-button" type="button" onClick={() => setLocations((current) => [...current, ''])}><ActionIcon name="add" />{fr.directory.addLocation}</button></div><div className="maintenance-form-grid site-form-grid">
              <div className="site-location-list field-wide">{locations.map((location, index) => <div className="site-location-input" key={index}><input required aria-label={`${fr.directory.locationName} ${index + 1}`} placeholder={fr.directory.locationName} value={location} onChange={(event) => updateLocation(index, event.target.value)} /><button type="button" onClick={() => removeLocation(index)} aria-label={fr.common.delete}><ActionIcon name="close" /></button></div>)}</div>
              <label className="field-wide"><span>{fr.directory.siteNotes}</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
            </div></section></div>
            <div className="maintenance-form-actions"><button className="primary-button save-button" type="submit">{fr.common.save}</button></div>
          </form>
        </Modal>
      )}
      {selectedSite && !isEditingSite && (
        <Modal title={fr.directory.siteDetails} size="site" onClose={() => setSelectedSite(null)}>
          <div className="site-details-modal">
            {isLoadingDetails && <div className="site-details-loading"><LoadingSpinner label={fr.common.loading} /></div>}
            {detailsError && <div className="form-alert" role="alert">{detailsError}</div>}
            <div className="site-details-heading">
              <div>
                <span className={`project-status project-status-${selectedSite.status}`} style={catalogBadgeStyle(catalogs, 'project_status', selectedSite.status)}>{catalogLabel(catalogs, 'project_status', selectedSite.status)}</span>
                <h3>{selectedSite.name}</h3>
                {selectedSite.address && <p><ActionIcon name="location" />{selectedSite.address}</p>}
              </div>
            </div>
            <dl className="site-details-facts">
              <div><dt>{fr.directory.siteResponsible}</dt><dd>{selectedSite.responsible?.name ?? fr.common.notAssigned}</dd></div>
              <div><dt>{fr.directory.assignedAssets}</dt><dd className="site-details-count">{selectedSite.active_equipment_count}</dd></div>
              <div><dt>{fr.directory.startDate}</dt><dd>{formatSiteDate(selectedSite.start_date)}</dd></div>
              <div><dt>{fr.directory.expectedEndDate}</dt><dd>{formatSiteDate(selectedSite.expected_end_date)}</dd></div>
            </dl>
            <section className="site-details-locations">
              <h4>{fr.directory.locations} ({selectedSite.locations.filter((location) => location.parent_id !== null).length})</h4>
              <div className="site-details-location-list">{selectedSite.locations.filter((location) => location.parent_id !== null).map((location) => <span key={location.id}><ActionIcon name="location" />{location.name}</span>)}</div>
              {selectedSite.locations.every((location) => location.parent_id === null) && <EmptyState compact icon="location" title={fr.directory.noLocations} />}
            </section>
            {selectedSite.notes && <section className="site-details-notes"><h4>{fr.directory.siteNotes}</h4><p>{selectedSite.notes}</p></section>}
            <div className="site-details-actions">
              {canAdd && <button className="site-detail-action primary" type="button" onClick={() => setIsEditingSite(true)}><ActionIcon name="edit" />{fr.directory.editThisSite}</button>}
              <button className="site-detail-action" type="button" onClick={() => onOpenSite?.(selectedSite)}><NavigationIcon name="generators" />{fr.directory.viewAssets}</button>
              <button className="site-detail-action" type="button" onClick={() => onOpenInsurance?.(selectedSite)}><ActionIcon name="invoice" />{fr.directory.viewInsurance}</button>
            </div>
          </div>
        </Modal>
      )}
      {selectedSite && isEditingSite && (
        <Modal title={fr.directory.editSite} size="wide" onClose={() => setIsEditingSite(false)}>
          <SiteEditForm site={selectedSite} catalogs={catalogs} employees={employees} onSaved={(site) => {
            const updated = { ...selectedSite, ...site }
            setSelectedSite(updated)
            setSites((current) => current.map((item) => item.id === site.id ? site : item).sort((a, b) => a.name.localeCompare(b.name)))
            setIsEditingSite(false)
          }} />
        </Modal>
      )}
      <section className="inventory-panel">
        <div className="filter-bar">
          <label className="search-field">
            <span>{fr.equipment.search}</span>
            <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1) }} placeholder="Rechercher un site, une adresse ou un responsable" />
          </label>
          <div className="filter-toolbar-actions">
            {canAdd && <button className="table-refresh-button table-add-button" type="button" onClick={() => setShowForm(true)} aria-label={fr.directory.addSite} title={fr.directory.addSite}><ActionIcon name="add" /></button>}
            <button className="table-refresh-button filter-refresh-button" type="button" onClick={refreshSites} disabled={isRefreshing} aria-label={fr.common.refresh} title={fr.common.refresh}><ActionIcon name="refresh" /></button>
          </div>
        </div>
        {!isRefreshing && visibleSites.length > 0 && <>
          <DataTable className="asset-inventory-table" ariaLabel={fr.directory.sites}>
              <thead><tr><th>Site / projet</th><th>{fr.directory.siteResponsible}</th><th>{fr.directory.siteAddress}</th><th>{fr.directory.assignedAssets}</th><th>{fr.directory.startDate}</th><th>{fr.directory.expectedEndDate}</th><th>Statut</th></tr></thead>
              <tbody>{paginatedSites.map((site) => <tr key={site.id} tabIndex={0} onClick={() => openSiteDetails(site)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openSiteDetails(site) } }}>
                <td><strong>{site.name}</strong></td>
                <td>{site.responsible?.name ?? fr.common.notAssigned}</td>
                <td>{site.address ?? fr.common.notProvided}</td>
                <td>{site.active_equipment_count}</td>
                <td>{formatSiteDate(site.start_date)}</td>
                <td>{formatSiteDate(site.expected_end_date)}</td>
                <td><span className={`project-status project-status-${site.status}`} style={catalogBadgeStyle(catalogs, 'project_status', site.status)}>{catalogLabel(catalogs, 'project_status', site.status)}</span></td>
              </tr>)}</tbody>
          </DataTable>
          {totalPages > 1 && <nav className="pagination" aria-label={fr.equipment.pagination}><span>{visibleSites.length} site{visibleSites.length > 1 ? 's' : ''}</span><div><button type="button" disabled={page === 1} onClick={() => setCurrentPage(page - 1)}>{fr.common.previous}</button><span>{fr.equipment.page(page, totalPages)}</span><button type="button" disabled={page === totalPages} onClick={() => setCurrentPage(page + 1)}>{fr.common.next}</button></div></nav>}
        </>}
        {!isRefreshing && visibleSites.length === 0 && <EmptyState icon="location" title={searchTerm ? 'Aucun site trouvé' : 'Aucun site enregistré'} description={searchTerm ? 'Modifiez votre recherche pour afficher d’autres sites.' : 'Les sites et projets ajoutés apparaîtront ici.'} />}
        {isRefreshing && <div className="table-state"><LoadingSpinner label={fr.common.loading} /></div>}
      </section>
    </main>
  )
}
