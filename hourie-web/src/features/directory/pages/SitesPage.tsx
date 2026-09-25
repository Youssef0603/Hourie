import { useEffect, useState, type FormEvent } from 'react'
import { fr } from '../../../i18n/fr'
import { createSite, getSites } from '../api'
import type { ProjectStatus, Site } from '../types'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { NavigationIcon } from '../../../shared/components/NavigationIcon'
import { Modal } from '../../../shared/components/Modal'
import { ApiError } from '../../../shared/api/http'
import type { CatalogOption, NamedReference } from '../../equipment/types'
import { catalogBadgeStyle, catalogLabel, catalogOptions } from '../../equipment/catalogs'
import { DirectoryHeading } from '../components/DirectoryHeading'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'

type SitesPageProps = {
  canAdd: boolean
  onOpenSite?: (site: Site) => void
  catalogs?: CatalogOption[]
  employees?: NamedReference[]
}

export function SitesPage({ canAdd, onOpenSite, catalogs, employees = [] }: SitesPageProps) {
  const [sites, setSites] = useState<Site[]>([])
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

  useEffect(() => {
    getSites()
      .then(setSites)
      .catch(() => setError(fr.directory.loadError))
  }, [])

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

  const projectStatusOptions = catalogOptions(catalogs, 'project_status')
  const selectedProjectStatus = status || projectStatusOptions[0]?.code || ''

  return (
    <main className="directory-page">
      <DirectoryHeading title={fr.directory.sites} subtitle={fr.directory.sitesSubtitle} canAdd={canAdd} showForm={showForm} onToggle={() => setShowForm((value) => !value)} addLabel={fr.directory.addSite} />
      {error && <div className="form-alert" role="alert">{error}</div>}
      {showForm && (
        <Modal title={fr.directory.addSite} size="wide" onClose={() => setShowForm(false)}>
          <form className="site-form" onSubmit={submit}>
            {error && <div className="form-alert" role="alert">{error}</div>}
            <div className="maintenance-form-grid site-form-grid">
              <label><span>{fr.directory.siteName}</span><input required value={name} onChange={(event) => setName(event.target.value)} /></label>
              <label><span>{fr.directory.siteStatus}</span><SearchableSelect ariaLabel={fr.directory.siteStatus} value={selectedProjectStatus} onChange={(value) => setStatus(value as ProjectStatus)} placeholder={fr.common.toComplete} includeEmpty={false} options={projectStatusOptions.map((option) => ({ value: option.code, label: catalogLabel(catalogs, 'project_status', option.code) }))} /></label>
              <label><span>{fr.directory.siteResponsible}</span><SearchableSelect ariaLabel={fr.directory.siteResponsible} value={responsibleEmployeeId} onChange={setResponsibleEmployeeId} placeholder={fr.directory.selectResponsible} options={employees.map((employee) => ({ value: String(employee.id), label: employee.name }))} /></label>
              <label><span>{fr.directory.siteAddress}</span><input value={address} onChange={(event) => setAddress(event.target.value)} /></label>
              <label><span>{fr.directory.startDate}</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
              <label><span>{fr.directory.expectedEndDate}</span><input type="date" min={startDate || undefined} value={expectedEndDate} onChange={(event) => setExpectedEndDate(event.target.value)} /></label>
              <div className="site-location-fields field-wide"><div className="site-location-fields-heading"><span>{fr.directory.initialLocations}</span><button type="button" onClick={() => setLocations((current) => [...current, ''])}><ActionIcon name="add" />{fr.directory.addLocation}</button></div><div className="site-location-list">{locations.map((location, index) => <div className="site-location-input" key={index}><input required aria-label={`${fr.directory.locationName} ${index + 1}`} placeholder={fr.directory.locationName} value={location} onChange={(event) => updateLocation(index, event.target.value)} /><button type="button" onClick={() => removeLocation(index)} aria-label={fr.common.delete}><ActionIcon name="close" /></button></div>)}</div></div>
              <label className="field-wide"><span>{fr.directory.siteNotes}</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
            </div>
            <div className="maintenance-form-actions"><button className="primary-button save-button" type="submit">{fr.common.save}</button></div>
          </form>
        </Modal>
      )}
      <div className="directory-grid">
        {sites.map((site) => {
          const physicalLocations = site.locations.filter((location) => location.parent_id !== null)

          return <button className="directory-card site-card" type="button" key={site.id} onClick={() => onOpenSite?.(site)}>
            <header className="site-card-header">
              <div className="site-card-title"><span className="site-card-icon"><NavigationIcon name="sites" /></span><h2>{site.name}</h2></div>
              <span className={`project-status project-status-${site.status}`} style={catalogBadgeStyle(catalogs, 'project_status', site.status)}>{catalogLabel(catalogs, 'project_status', site.status)}</span>
            </header>
            <p className={`site-card-address${site.address ? '' : ' empty'}`} aria-hidden={!site.address}>{site.address || '\u00a0'}</p>
            <p className="site-card-responsible">{fr.directory.siteResponsible}: <strong>{site.responsible?.name ?? fr.common.notAssigned}</strong></p>
            <div className="site-card-metrics">
              <div><span className="site-metric-icon"><NavigationIcon name="generators" /></span><span><strong>{site.active_equipment_count}</strong><small>{fr.directory.assignedAssets}</small></span></div>
              <div><span className="site-metric-icon"><ActionIcon name="location" /></span><span><strong>{physicalLocations.length}</strong><small>{fr.directory.locations}</small></span></div>
            </div>
            <footer className="site-card-footer">
              <div className="location-tags">{physicalLocations.map((location) => <span key={location.id}><ActionIcon name="location" />{location.name}</span>)}</div>
              <span className="site-card-arrow" aria-hidden="true"><ActionIcon name="expand" /></span>
            </footer>
          </button>
        })}
      </div>
    </main>
  )
}
