import { useState, type FormEvent } from 'react'
import { fr } from '../../../i18n/fr'
import { ApiError } from '../../../shared/api/http'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { catalogLabel, catalogOptions } from '../../equipment/catalogs'
import type { CatalogOption, NamedReference } from '../../equipment/types'
import { updateSite } from '../api'
import type { Site } from '../types'

type EditableLocation = { id: number | null; name: string }

export function SiteEditForm({ site, catalogs, employees, onCancel, onSaved }: {
  site: Site
  catalogs: CatalogOption[] | undefined
  employees: NamedReference[]
  onCancel: () => void
  onSaved: (site: Site) => void
}) {
  const [name, setName] = useState(site.name)
  const [status, setStatus] = useState(site.status)
  const [address, setAddress] = useState(site.address ?? '')
  const [startDate, setStartDate] = useState(site.start_date ?? '')
  const [expectedEndDate, setExpectedEndDate] = useState(site.expected_end_date ?? '')
  const [notes, setNotes] = useState(site.notes ?? '')
  const [responsibleEmployeeId, setResponsibleEmployeeId] = useState(site.responsible?.id.toString() ?? '')
  const [locations, setLocations] = useState<EditableLocation[]>(
    site.locations.filter((location) => location.parent_id !== null).map((location) => ({ id: location.id, name: location.name })),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const availableStatuses = catalogOptions(catalogs, 'project_status')
  const currentStatusIsUnavailable = !availableStatuses.some((option) => option.code === status)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      onSaved(await updateSite(site.id, {
        name: name.trim(),
        status,
        address: address.trim() || null,
        start_date: startDate || null,
        expected_end_date: expectedEndDate || null,
        notes: notes.trim() || null,
        responsible_employee_id: Number(responsibleEmployeeId),
        locations: locations.map((location) => ({ ...location, name: location.name.trim() })),
      }))
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors)[0]?.[0] ?? fr.directory.saveError : fr.directory.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="site-form" onSubmit={submit}>
      {error && <div className="form-alert" role="alert">{error}</div>}
      <div className="maintenance-form-grid site-form-grid">
        <label><span>{fr.directory.siteName}</span><input required disabled={isSaving} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label><span>{fr.directory.siteStatus}</span><select disabled={isSaving} value={status} onChange={(event) => setStatus(event.target.value)}>{currentStatusIsUnavailable && <option value={status}>{catalogLabel(catalogs, 'project_status', status)}</option>}{availableStatuses.map((option) => <option key={option.code} value={option.code}>{catalogLabel(catalogs, 'project_status', option.code)}</option>)}</select></label>
        <label><span>{fr.directory.siteResponsible}</span><select required disabled={isSaving} value={responsibleEmployeeId} onChange={(event) => setResponsibleEmployeeId(event.target.value)}><option value="">{fr.directory.selectResponsible}</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label><span>{fr.directory.siteAddress}</span><input disabled={isSaving} value={address} onChange={(event) => setAddress(event.target.value)} /></label>
        <label><span>{fr.directory.startDate}</span><input disabled={isSaving} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label><span>{fr.directory.expectedEndDate}</span><input disabled={isSaving} type="date" min={startDate || undefined} value={expectedEndDate} onChange={(event) => setExpectedEndDate(event.target.value)} /></label>
        <div className="site-location-fields field-wide"><div className="site-location-fields-heading"><span>{fr.directory.initialLocations}</span><button disabled={isSaving} type="button" onClick={() => setLocations((current) => [...current, { id: null, name: '' }])}><ActionIcon name="add" />{fr.directory.addLocation}</button></div>{locations.map((location, index) => <div className="site-location-input" key={location.id ?? `new-${index}`}><input required disabled={isSaving} aria-label={`${fr.directory.locationName} ${index + 1}`} value={location.name} onChange={(event) => setLocations((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />{locations.length > 1 && <button disabled={isSaving} type="button" onClick={() => setLocations((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={fr.common.delete}><ActionIcon name="close" /></button>}</div>)}</div>
        <label className="field-wide"><span>{fr.directory.siteNotes}</span><textarea disabled={isSaving} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      </div>
      <div className="maintenance-form-actions"><button type="button" disabled={isSaving} onClick={onCancel}>{fr.common.cancel}</button><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? <LoadingSpinner compact label={fr.common.saving} /> : fr.common.save}</button></div>
    </form>
  )
}
