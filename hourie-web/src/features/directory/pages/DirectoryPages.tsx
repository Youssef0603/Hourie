import { useEffect, useRef, useState, type FormEvent } from 'react'
import { fr } from '../../../i18n/fr'
import { createEmployee, createSite, deleteEmployee, getEmployee, getEmployees, getSites, updateEmployee } from '../api'
import type { Employee, EmployeeDetails, ProjectStatus, Site } from '../types'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { NavigationIcon } from '../../../shared/components/NavigationIcon'
import { Modal } from '../../../shared/components/Modal'
import { ApiError } from '../../../shared/api/http'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import type { CatalogOption, NamedReference } from '../../equipment/types'
import { catalogBadgeStyle, catalogLabel, catalogOptions } from '../../equipment/catalogs'

type DirectoryPageProps = {
  canAdd: boolean
  canManageManagerAccounts?: boolean
  onOpenSite?: (site: Site) => void
  catalogs?: CatalogOption[]
  employees?: NamedReference[]
}

function generatedUsername(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

export function SitesPage({ canAdd, onOpenSite, catalogs, employees = [] }: DirectoryPageProps) {
  const [sites, setSites] = useState<Site[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('')
  const [startDate, setStartDate] = useState('')
  const [expectedEndDate, setExpectedEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [responsibleEmployeeId, setResponsibleEmployeeId] = useState('')
  const [locations, setLocations] = useState([''])
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
        responsible_employee_id: Number(responsibleEmployeeId),
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
      setLocations([''])
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
              <label><span>{fr.directory.siteStatus}</span><select required value={selectedProjectStatus} onChange={(event) => setStatus(event.target.value as ProjectStatus)}>{projectStatusOptions.map((option) => <option key={option.code} value={option.code}>{catalogLabel(catalogs, 'project_status', option.code)}</option>)}</select></label>
              <label><span>{fr.directory.siteResponsible}</span><select required value={responsibleEmployeeId} onChange={(event) => setResponsibleEmployeeId(event.target.value)}><option value="">{fr.directory.selectResponsible}</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
              <label><span>{fr.directory.siteAddress}</span><input value={address} onChange={(event) => setAddress(event.target.value)} /></label>
              <label><span>{fr.directory.startDate}</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
              <label><span>{fr.directory.expectedEndDate}</span><input type="date" min={startDate || undefined} value={expectedEndDate} onChange={(event) => setExpectedEndDate(event.target.value)} /></label>
              <div className="site-location-fields field-wide"><div className="site-location-fields-heading"><span>{fr.directory.initialLocations}</span><button type="button" onClick={() => setLocations((current) => [...current, ''])}><ActionIcon name="add" />{fr.directory.addLocation}</button></div>{locations.map((location, index) => <div className="site-location-input" key={index}><input required aria-label={`${fr.directory.locationName} ${index + 1}`} placeholder={fr.directory.locationName} value={location} onChange={(event) => updateLocation(index, event.target.value)} />{locations.length > 1 && <button type="button" onClick={() => removeLocation(index)} aria-label={fr.common.delete}><ActionIcon name="close" /></button>}</div>)}</div>
              <label className="field-wide"><span>{fr.directory.siteNotes}</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
            </div>
            <div className="maintenance-form-actions"><button type="button" onClick={() => setShowForm(false)}>{fr.common.cancel}</button><button className="primary-button" type="submit">{fr.common.save}</button></div>
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
              <div><span className="site-metric-icon"><NavigationIcon name="generators" /></span><span><strong>{site.active_equipment_count}</strong><small>{fr.directory.assignedGenerators}</small></span></div>
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

export function PeoplePage({ canAdd, canManageManagerAccounts = false, catalogs }: DirectoryPageProps) {
  const [people, setPeople] = useState<Employee[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'manager' | 'cms_manager' | 'generator_manager' | 'viewer'>('viewer')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<EmployeeDetails | null>(null)
  const [isLoadingPerson, setIsLoadingPerson] = useState(false)
  const [isEditingPerson, setIsEditingPerson] = useState(false)
  const personRequest = useRef(0)
  const roleEntries = Object.entries(fr.roles).filter(([value]) => canManageManagerAccounts || value !== 'manager')

  useEffect(() => {
    refreshPeople()
  }, [])

  function refreshPeople() {
    setError(null)
    return getEmployees().then(setPeople).catch(() => setError(fr.directory.loadError))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await createEmployee({
        name: name.trim(),
        phone_number: phoneNumber.trim() || null,
        email: email.trim() || null,
        role,
        password,
        password_confirmation: passwordConfirmation,
      })
      await refreshPeople()
      setName('')
      setPhoneNumber('')
      setEmail('')
      setRole('viewer')
      setPassword('')
      setPasswordConfirmation('')
      setShowForm(false)
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors)[0]?.[0] ?? fr.directory.saveError : fr.directory.saveError)
    }
  }

  async function openPerson(id: number) {
    const requestId = ++personRequest.current
    setIsLoadingPerson(true)
    setSelectedPerson(null)
    setIsEditingPerson(false)
    setError(null)

    try {
      const person = await getEmployee(id)
      if (personRequest.current === requestId) setSelectedPerson(person)
    } catch {
      if (personRequest.current === requestId) setError(fr.directory.loadError)
    } finally {
      if (personRequest.current === requestId) setIsLoadingPerson(false)
    }
  }

  function closePerson() {
    personRequest.current += 1
    setIsLoadingPerson(false)
    setSelectedPerson(null)
    setIsEditingPerson(false)
  }

  async function removePerson() {
    if (!selectedPerson || !window.confirm(fr.directory.deletePersonConfirmation)) return

    try {
      await deleteEmployee(selectedPerson.id)
      closePerson()
      await refreshPeople()
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors)[0]?.[0] ?? fr.common.deleteError : fr.common.deleteError)
    }
  }

  return (
    <main className="directory-page">
      <DirectoryHeading title={fr.directory.people} subtitle={fr.directory.peopleSubtitle} canAdd={canAdd} showForm={showForm} onToggle={() => setShowForm((value) => !value)} addLabel={fr.directory.addPerson} onRefresh={refreshPeople} />
      {error && <div className="form-alert" role="alert">{error}</div>}
      {showForm && <Modal title={fr.directory.addPerson} onClose={() => setShowForm(false)}><form className="directory-form people-form modal-directory-form" onSubmit={submit}><p className="account-form-hint">{fr.directory.credentialsHint}</p>{error && <div className="form-alert account-form-alert" role="alert">{error}</div>}<label><span>{fr.directory.fullName}</span><input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>{fr.directory.phoneNumber}</span><input type="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+225 07 00 00 00 00" /></label><label><span>{fr.directory.username}</span><input className="generated-username" readOnly tabIndex={-1} value={generatedUsername(name)} placeholder={fr.directory.usernameGeneratedPlaceholder} /><small>{fr.directory.usernameGeneratedHint}</small></label><label><span>{fr.directory.optionalEmail}</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nom@hourie.ci" /></label><label><span>{fr.directory.accountRole}</span><select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>{roleEntries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>{fr.directory.temporaryPassword}</span><input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label><span>{fr.directory.confirmPassword}</span><input required minLength={12} type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></label><div className="maintenance-form-actions"><button type="button" onClick={() => setShowForm(false)}>{fr.common.cancel}</button><button className="primary-button" type="submit">{fr.common.save}</button></div></form></Modal>}
      <div className="people-table-wrap">
        <table className="people-table">
          <colgroup><col className="people-name-column" /><col className="people-contact-column" /><col className="people-phone-column" /><col className="people-role-column" /><col className="people-count-column" /></colgroup>
          <thead><tr><th>{fr.directory.fullName}</th><th>{fr.directory.username}</th><th>{fr.directory.phoneNumber}</th><th>{fr.directory.role}</th><th>{fr.directory.assignedEquipment}</th></tr></thead>
          <tbody>{people.map((person) => <tr key={person.id} tabIndex={0} onClick={() => openPerson(person.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPerson(person.id) } }}><td><div className="person-identity"><span className="person-avatar">{person.name.slice(0, 1).toUpperCase()}</span><strong>{person.name}</strong></div></td><td><strong>{person.user?.username ?? fr.common.notAssigned}</strong>{person.user?.email && <span className="secondary-cell">{person.user.email}</span>}</td><td>{person.phone_number ?? fr.common.notAssigned}</td><td>{person.user ? fr.roles[person.user.role] : fr.common.notAssigned}</td><td><span className="assignment-count">{person.equipment_in_custody_count}</span></td></tr>)}</tbody>
        </table>
      </div>
      {(isLoadingPerson || selectedPerson) && <Modal title={isEditingPerson ? fr.directory.editPerson : selectedPerson?.name ?? fr.directory.personDetails} size="wide" onClose={closePerson}>{isLoadingPerson ? <LoadingSpinner className="person-detail-loading" label={fr.common.loading} /> : selectedPerson && (isEditingPerson ? <EditPersonForm person={selectedPerson} canManageManagerAccounts={canManageManagerAccounts} onCancel={() => setIsEditingPerson(false)} onSaved={(updated) => { setSelectedPerson(updated); setIsEditingPerson(false); refreshPeople() }} /> : <PersonDetail person={selectedPerson} catalogs={catalogs} canEdit={canAdd && (canManageManagerAccounts || selectedPerson.user?.role !== 'manager')} onEdit={() => setIsEditingPerson(true)} onDelete={removePerson} />)}</Modal>}
    </main>
  )
}

function PersonDetail({ person, catalogs, canEdit, onEdit, onDelete }: { person: EmployeeDetails; catalogs: CatalogOption[] | undefined; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
  return <div className="person-detail"><section><div className="person-detail-heading"><h3>{fr.directory.contactInformation}</h3>{canEdit && <div className="detail-actions"><button className="equipment-edit-button" type="button" onClick={onEdit}><ActionIcon name="edit" />{fr.common.edit}</button><button className="danger-button" type="button" onClick={onDelete}><ActionIcon name="delete" />{fr.directory.deletePerson}</button></div>}</div><dl><div><dt>{fr.directory.username}</dt><dd>{person.user?.username ?? fr.common.notAssigned}</dd></div><div><dt>{fr.directory.email}</dt><dd>{person.user?.email ?? fr.common.notAssigned}</dd></div><div><dt>{fr.directory.phoneNumber}</dt><dd>{person.phone_number ?? fr.common.notAssigned}</dd></div><div><dt>{fr.directory.role}</dt><dd>{person.user ? fr.roles[person.user.role] : fr.common.notAssigned}</dd></div><div><dt>{fr.directory.accountStatus}</dt><dd><span className={`account-status ${person.is_active ? 'active' : 'inactive'}`}>{person.is_active ? fr.directory.active : fr.directory.inactive}</span></dd></div></dl></section><section><div className="section-heading-row"><div><h3>{fr.directory.assignedEquipment}</h3><p>{fr.directory.custodyCount(person.equipment_in_custody_count)}</p></div></div>{person.equipment_in_custody.length > 0 ? <div className="site-inventory-wrap"><table className="equipment-table person-inventory-table"><thead><tr><th>{fr.equipment.number}</th><th>{fr.equipment.identification}</th><th>{fr.equipment.condition}</th><th>{fr.equipment.project}</th><th>{fr.equipment.locationShort}</th></tr></thead><tbody>{person.equipment_in_custody.map((equipment) => <tr key={equipment.id}><td><strong>{equipment.display_id}</strong><span className="secondary-cell">{equipment.asset_code}</span></td><td>{[equipment.brand, equipment.model].filter(Boolean).join(' ') || fr.common.notProvided}</td><td><span className={`status-badge status-${equipment.condition ?? 'unknown'}`} style={catalogBadgeStyle(catalogs, 'equipment_condition', equipment.condition)}>{equipment.condition ? catalogLabel(catalogs, 'equipment_condition', equipment.condition) : fr.common.notProvided}</span></td><td>{equipment.current_project_assignment?.project.name ?? fr.common.notProvided}</td><td>{equipment.current_location?.name ?? fr.common.notProvided}</td></tr>)}</tbody></table></div> : <p>{fr.directory.noGenerators}</p>}</section></div>
}

function EditPersonForm({ person, canManageManagerAccounts, onCancel, onSaved }: { person: EmployeeDetails; canManageManagerAccounts: boolean; onCancel: () => void; onSaved: (person: EmployeeDetails) => void }) {
  const [name, setName] = useState(person.name)
  const [phoneNumber, setPhoneNumber] = useState(person.phone_number ?? '')
  const [username, setUsername] = useState(person.user?.username ?? '')
  const [email, setEmail] = useState(person.user?.email ?? '')
  const [role, setRole] = useState<'manager' | 'cms_manager' | 'generator_manager' | 'viewer'>(person.user?.role ?? 'viewer')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const roleEntries = Object.entries(fr.roles).filter(([value]) => canManageManagerAccounts || value !== 'manager')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setFormError(null)

    try {
      onSaved(await updateEmployee(person.id, {
        name: name.trim(),
        phone_number: phoneNumber.trim() || null,
        username: username.trim() || null,
        email: email.trim() || null,
        role,
        password: password || null,
        password_confirmation: password ? passwordConfirmation : null,
      }))
    } catch (caught) {
      setFormError(caught instanceof ApiError ? Object.values(caught.errors)[0]?.[0] ?? fr.directory.saveError : fr.directory.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  return <form className="directory-form people-form modal-directory-form person-edit-form" onSubmit={submit}><p className="account-form-hint">{fr.directory.editCredentialsHint}</p>{formError && <div className="form-alert account-form-alert" role="alert">{formError}</div>}<label><span>{fr.directory.fullName}</span><input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>{fr.directory.phoneNumber}</span><input type="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} /></label><label><span>{fr.directory.username}</span><input required={person.user !== null} minLength={3} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} /></label><label><span>{fr.directory.optionalEmail}</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label><span>{fr.directory.accountRole}</span><select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>{roleEntries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>{fr.directory.newPassword}</span><input minLength={12} required={!person.user && username !== ''} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label><span>{fr.directory.confirmNewPassword}</span><input minLength={12} required={password !== ''} type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></label><div className="maintenance-form-actions"><button type="button" onClick={onCancel}>{fr.common.cancel}</button><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? <LoadingSpinner compact label={fr.common.saving} /> : fr.common.save}</button></div></form>
}

type HeadingProps = DirectoryPageProps & {
  title: string
  subtitle: string
  addLabel: string
  showForm: boolean
  onToggle: () => void
  onRefresh?: () => void
}

function DirectoryHeading({ title, subtitle, canAdd, addLabel, showForm, onToggle, onRefresh }: HeadingProps) {
  return <section className="page-heading"><div><p className="section-label">{fr.directory.management}</p><h1>{title}</h1><p>{subtitle}</p></div><div className="heading-actions">{onRefresh && <button className="table-refresh-button" type="button" onClick={onRefresh}><ActionIcon name="refresh" /><span>{fr.common.refresh}</span></button>}{canAdd && <button className={`primary-button page-action compact-action${showForm ? ' close-action' : ''}`} type="button" onClick={onToggle}><ActionIcon name={showForm ? 'close' : 'add'} /><span>{showForm ? fr.common.close : addLabel}</span></button>}</div></section>
}
