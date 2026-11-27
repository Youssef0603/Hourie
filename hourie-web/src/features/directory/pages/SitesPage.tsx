import { useCallback, useState, type FormEvent } from 'react'
import { DetailIconButton } from '../../../shared/components/DetailIconButton'
import { fr } from '../../../i18n/fr'
import { operationPhrase } from '../../../i18n/operations'
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
import { Pagination } from '../../../shared/components/Pagination'
import { SearchField } from '../../../shared/components/SearchField'
import { ToolbarIconButton } from '../../../shared/components/ToolbarButtons'
import { clickableRow } from '../../../shared/clickableRow'
import { formatDate } from '../../../shared/format'
import { normalizeSearch } from '../../../shared/text'
import { usePaginatedList } from '../../../shared/usePaginatedList'
import { DirectoryDetailPanel } from '../components/DirectoryDetailPanel'

type SitesPageProps = {
  canAdd: boolean
  onOpenSite?: (site: Site) => void
  onOpenInsurance?: (site: Site) => void
  onOpenBonds?: (site: Site) => void
  onOpenPeople?: (site: Site) => void
  catalogs?: CatalogOption[]
  employees?: NamedReference[]
}

export function SitesPage({ canAdd, onOpenSite, onOpenInsurance, onOpenBonds, onOpenPeople, catalogs, employees = [] }: SitesPageProps) {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
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

  const fetchSites = useCallback((page: number) => getSites(page, search), [search])
  const { items: sites, setItems: setSites, meta: pagination, setPage: setCurrentPage, loading: isRefreshing, error: listError, reload: refreshSites } = usePaginatedList<Site>(
    fetchSites,
    fr.directory.loadError,
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      const site = await createSite({
        name: name.trim(),
        code: code.trim() || null,
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
      setCode('')
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
    setIsEditingSite(false)
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
    return formatDate(value, { style: 'long', fallback: fr.common.toComplete })
  }

  const projectStatusOptions = catalogOptions(catalogs, 'project_status')
  const selectedProjectStatus = status || projectStatusOptions[0]?.code || ''
  const searchTerm = normalizeSearch(search)
  const visibleSites = searchTerm
    ? sites.filter((site) => normalizeSearch([site.name, site.code, site.address, site.responsible?.name].filter(Boolean).join(' ')).includes(searchTerm))
    : sites
  const siteEditFormId = selectedSite ? `site-edit-form-${selectedSite.id}` : 'site-edit-form'

  return (
    <main className="directory-page">
      <DirectoryHeading title={fr.directory.sites} subtitle={fr.directory.sitesSubtitle} canAdd={false} showForm={showForm} onToggle={() => setShowForm((value) => !value)} addLabel={fr.directory.addSite} />
      {listError && <div className="form-alert" role="alert">{listError}</div>}
      {showForm && (
        <Modal title={fr.directory.addSite} size="wide" onClose={() => setShowForm(false)}>
          <form className="site-form" onSubmit={submit}>
            {error && <div className="form-alert" role="alert">{error}</div>}
            <div className="asset-form-layout">
            <section className="asset-form-section"><div className="asset-form-section-heading"><div><strong>{fr.directory.siteInformation}</strong></div></div><div className="maintenance-form-grid site-form-grid asset-form-grid-3">
              <label><span>{fr.directory.siteName}</span><input required value={name} onChange={(event) => setName(event.target.value)} /></label>
              <label><span>{fr.directory.costCode}</span><input inputMode="numeric" pattern="[0-9]+" value={code} onChange={(event) => setCode(event.target.value)} /></label>
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
        <DirectoryDetailPanel
          title={fr.directory.siteDetails}
          sectionLabel={fr.directory.sites}
          subtitle={selectedSite.name}
          className="directory-site-detail-panel"
          onClose={() => {
            setSelectedSite(null)
            setDetailsError(null)
          }}
        >
          <div className="site-details-modal">
            {isLoadingDetails && <div className="site-details-loading"><LoadingSpinner label={fr.common.loading} /></div>}
            {detailsError && <div className="form-alert" role="alert">{detailsError}</div>}
            {canAdd && <div className="detail-primary-actions site-detail-toolbar">
              <DetailIconButton icon="edit" label={fr.directory.editThisSite} onClick={() => setIsEditingSite(true)} />
            </div>}
            <section className="site-detail-section">
              <h3><ActionIcon name="identification" />{operationPhrase('Informations principales')}</h3>
              <dl className="site-details-facts">
                <div><dt>{operationPhrase('État')}</dt><dd><span className={`project-status project-status-${selectedSite.status}`} style={catalogBadgeStyle(catalogs, 'project_status', selectedSite.status)}>{catalogLabel(catalogs, 'project_status', selectedSite.status)}</span></dd></div>
                <div><dt>{fr.directory.costCode}</dt><dd>{selectedSite.code ?? fr.common.notProvided}</dd></div>
                <div><dt>{fr.directory.siteResponsible}</dt><dd>{selectedSite.responsible?.name ?? fr.common.notAssigned}</dd></div>
                <div><dt>{fr.directory.siteAddress}</dt><dd>{selectedSite.address ?? fr.common.notProvided}</dd></div>
                <div><dt>{fr.directory.assignedAssets}</dt><dd className="site-details-count">{selectedSite.active_equipment_count}</dd></div>
              </dl>
            </section>
            <section className="site-detail-section site-related-section">
              <h3><ActionIcon name="transfer" />{fr.directory.relatedItems}</h3>
              <div className="site-related-links">
                <article>
                  <NavigationIcon name="generators" />
                  <div><strong>{fr.directory.viewAssets}</strong><span>{fr.directory.assetCount(selectedSite.active_equipment_count)}</span></div>
                  <button type="button" onClick={() => onOpenSite?.(selectedSite)}>{fr.common.view}<ActionIcon name="expand" /></button>
                </article>
                <article>
                  <ActionIcon name="people" />
                  <div><strong>{fr.navigation.people}</strong><span>{fr.directory.sitePeopleDescription}</span></div>
                  <button type="button" onClick={() => onOpenPeople?.(selectedSite)}>{fr.common.view}<ActionIcon name="expand" /></button>
                </article>
                <article>
                  <ActionIcon name="invoice" />
                  <div><strong>{fr.directory.viewInsurance}</strong><span>{fr.directory.siteInsuranceDescription}</span></div>
                  <button type="button" onClick={() => onOpenInsurance?.(selectedSite)}>{fr.common.view}<ActionIcon name="expand" /></button>
                </article>
                <article>
                  <NavigationIcon name="bonds" />
                  <div><strong>{fr.navigation.bonds}</strong><span>{fr.directory.siteBondsDescription}</span></div>
                  <button type="button" onClick={() => onOpenBonds?.(selectedSite)}>{fr.common.view}<ActionIcon name="expand" /></button>
                </article>
              </div>
            </section>
            <section className="site-detail-section">
              <h3><ActionIcon name="history" />{operationPhrase('Planification')}</h3>
              <dl className="site-details-facts">
                <div><dt>{fr.directory.startDate}</dt><dd>{formatSiteDate(selectedSite.start_date)}</dd></div>
                <div><dt>{fr.directory.expectedEndDate}</dt><dd>{formatSiteDate(selectedSite.expected_end_date)}</dd></div>
              </dl>
            </section>
            <section className="site-detail-section site-details-locations">
              <h3><ActionIcon name="location" />{fr.directory.locations}<span className="site-detail-section-count">{selectedSite.locations.filter((location) => location.parent_id !== null).length}</span></h3>
              <div className="site-details-location-list">{selectedSite.locations.filter((location) => location.parent_id !== null).map((location) => <span key={location.id}><ActionIcon name="location" />{location.name}</span>)}</div>
              {selectedSite.locations.every((location) => location.parent_id === null) && <EmptyState compact icon="location" title={fr.directory.noLocations} />}
            </section>
            <section className="site-detail-section site-details-notes">
              <h3><ActionIcon name="note" />{fr.directory.siteNotes}</h3>
              <p className={selectedSite.notes ? '' : 'site-details-notes-empty'}>{selectedSite.notes || operationPhrase('Aucune observation.')}</p>
            </section>
          </div>
        </DirectoryDetailPanel>
      )}
      {selectedSite && isEditingSite && (
        <DirectoryDetailPanel
          title={fr.directory.editSite}
          sectionLabel={fr.directory.sites}
          subtitle={selectedSite.name}
          className="directory-site-edit-panel directory-edit-panel"
          onClose={() => setIsEditingSite(false)}
          headerActions={<button className="primary-button directory-panel-save" type="submit" form={siteEditFormId}>{fr.common.save}</button>}
        >
          <SiteEditForm site={selectedSite} catalogs={catalogs} employees={employees} formId={siteEditFormId} hideSubmit onSaved={(site) => {
            const updated = { ...selectedSite, ...site }
            setSelectedSite(updated)
            setSites((current) => current.map((item) => item.id === site.id ? site : item).sort((a, b) => a.name.localeCompare(b.name)))
            setIsEditingSite(false)
          }} />
        </DirectoryDetailPanel>
      )}
      <section className="inventory-panel">
        <div className="filter-bar">
          <SearchField label={fr.equipment.search} value={search} onChange={(value) => { setSearch(value); setCurrentPage(1) }} placeholder={operationPhrase('Rechercher un chantier, un code, une adresse ou un responsable')} />
          <div className="filter-toolbar-actions">
            {canAdd && <ToolbarIconButton icon="add" label={fr.directory.addSite} onClick={() => setShowForm(true)} />}
            <ToolbarIconButton icon="refresh" label={fr.common.refresh} disabled={isRefreshing} onClick={() => void refreshSites()} />
          </div>
        </div>
        {!isRefreshing && visibleSites.length > 0 && <>
          <DataTable className="asset-inventory-table" ariaLabel={fr.directory.sites}>
              <thead><tr><th>{operationPhrase('Chantier')}</th><th>{fr.directory.costCode}</th><th>{fr.directory.siteResponsible}</th><th>{fr.directory.siteAddress}</th><th>{fr.directory.assignedAssets}</th><th>{fr.directory.startDate}</th><th>{fr.directory.expectedEndDate}</th><th>{operationPhrase('État')}</th></tr></thead>
              <tbody>{visibleSites.map((site) => <tr key={site.id} {...clickableRow(() => openSiteDetails(site))}>
                <td><strong>{site.name}</strong></td>
                <td>{site.code ?? fr.common.notProvided}</td>
                <td>{site.responsible?.name ?? fr.common.notAssigned}</td>
                <td>{site.address ?? fr.common.notProvided}</td>
                <td>{site.active_equipment_count}</td>
                <td>{formatSiteDate(site.start_date)}</td>
                <td>{formatSiteDate(site.expected_end_date)}</td>
                <td><span className={`project-status project-status-${site.status}`} style={catalogBadgeStyle(catalogs, 'project_status', site.status)}>{catalogLabel(catalogs, 'project_status', site.status)}</span></td>
              </tr>)}</tbody>
          </DataTable>
          {pagination && <Pagination meta={pagination} disabled={isRefreshing} hideWhenSinglePage={false} onPageChange={setCurrentPage} />}
        </>}
        {!isRefreshing && visibleSites.length === 0 && <EmptyState icon="location" title={operationPhrase(searchTerm ? 'Aucun chantier trouvé' : 'Aucun chantier enregistré')} description={operationPhrase(searchTerm ? 'Modifiez votre recherche pour afficher d’autres chantiers.' : 'Les chantiers ajoutés apparaîtront ici.')} />}
        {isRefreshing && <div className="table-state"><LoadingSpinner label={fr.common.loading} /></div>}
      </section>
    </main>
  )
}
