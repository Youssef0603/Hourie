import { useEffect, useRef, useState, type FormEvent } from 'react'
import { fr } from '../../../i18n/fr'
import { createEmployee, createSite, getEmployee, getEmployees, getSite, getSites } from '../api'
import type { Employee, EmployeeDetails, Site, SiteDetails } from '../types'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { Modal } from '../../../shared/components/Modal'
import { ApiError } from '../../../shared/api/http'

type DirectoryPageProps = {
  canAdd: boolean
}

export function SitesPage({ canAdd }: DirectoryPageProps) {
  const [sites, setSites] = useState<Site[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedSite, setSelectedSite] = useState<SiteDetails | null>(null)
  const [isLoadingSite, setIsLoadingSite] = useState(false)

  useEffect(() => {
    getSites().then(setSites).catch(() => setError(fr.directory.loadError))
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const site = await createSite({ name: name.trim(), code: code.trim() || null })
      setSites((current) => [...current, site].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
      setCode('')
      setShowForm(false)
    } catch {
      setError(fr.directory.saveError)
    }
  }

  async function openSite(id: number) {
    setIsLoadingSite(true)
    setError(null)
    try {
      setSelectedSite(await getSite(id))
    } catch {
      setError(fr.directory.loadError)
    } finally {
      setIsLoadingSite(false)
    }
  }

  return (
    <main className="directory-page">
      <DirectoryHeading title={fr.directory.sites} subtitle={fr.directory.sitesSubtitle} canAdd={canAdd} showForm={showForm} onToggle={() => setShowForm((value) => !value)} addLabel={fr.directory.addSite} />
      {error && <div className="form-alert" role="alert">{error}</div>}
      {showForm && <Modal title={fr.directory.addSite} onClose={() => setShowForm(false)}><form className="directory-form modal-directory-form" onSubmit={submit}><label><span>{fr.directory.siteName}</span><input required value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>{fr.directory.siteCode}</span><input value={code} onChange={(event) => setCode(event.target.value)} /></label><div className="maintenance-form-actions"><button type="button" onClick={() => setShowForm(false)}>{fr.common.cancel}</button><button className="primary-button" type="submit">{fr.common.save}</button></div></form></Modal>}
      <div className="directory-grid">
        {sites.map((site) => <button className="directory-card site-card" type="button" key={site.id} onClick={() => openSite(site.id)}>{site.code && <span className="directory-card-code">{site.code}</span>}<h2>{site.name}</h2><p>{fr.directory.generatorCount(site.active_equipment_count)}</p><div className="location-tags">{site.locations.map((location) => <span key={location.id}>{location.name}</span>)}</div><span className="site-card-arrow" aria-hidden="true">→</span></button>)}
      </div>
      {isLoadingSite && <div className="directory-loading">{fr.common.loading}</div>}
      {selectedSite && <SiteDetail site={selectedSite} onClose={() => setSelectedSite(null)} />}
    </main>
  )
}

export function PeoplePage({ canAdd }: DirectoryPageProps) {
  const [people, setPeople] = useState<Employee[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'manager' | 'generator_manager' | 'viewer'>('viewer')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<EmployeeDetails | null>(null)
  const [isLoadingPerson, setIsLoadingPerson] = useState(false)
  const personRequest = useRef(0)

  useEffect(() => {
    getEmployees().then(setPeople).catch(() => setError(fr.directory.loadError))
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      const employee = await createEmployee({
        name: name.trim(),
        phone_number: phoneNumber.trim() || null,
        email: email.trim(),
        role,
        password,
        password_confirmation: passwordConfirmation,
      })
      setPeople((current) => [...current, employee].sort((a, b) => a.name.localeCompare(b.name)))
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
  }

  return (
    <main className="directory-page">
      <DirectoryHeading title={fr.directory.people} subtitle={fr.directory.peopleSubtitle} canAdd={canAdd} showForm={showForm} onToggle={() => setShowForm((value) => !value)} addLabel={fr.directory.addPerson} />
      {error && <div className="form-alert" role="alert">{error}</div>}
      {showForm && <Modal title={fr.directory.addPerson} onClose={() => setShowForm(false)}><form className="directory-form people-form modal-directory-form" onSubmit={submit}><p className="account-form-hint">{fr.directory.credentialsHint}</p>{error && <div className="form-alert account-form-alert" role="alert">{error}</div>}<label><span>{fr.directory.fullName}</span><input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>{fr.directory.phoneNumber}</span><input type="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+225 07 00 00 00 00" /></label><label><span>{fr.directory.loginEmail}</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nom@hourie.ci" /></label><label><span>{fr.directory.accountRole}</span><select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>{Object.entries(fr.roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>{fr.directory.temporaryPassword}</span><input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label><span>{fr.directory.confirmPassword}</span><input required minLength={12} type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></label><div className="maintenance-form-actions"><button type="button" onClick={() => setShowForm(false)}>{fr.common.cancel}</button><button className="primary-button" type="submit">{fr.common.save}</button></div></form></Modal>}
      <div className="people-table-wrap">
        <table className="people-table">
          <colgroup><col className="people-name-column" /><col className="people-contact-column" /><col className="people-phone-column" /><col className="people-role-column" /><col className="people-count-column" /></colgroup>
          <thead><tr><th>{fr.directory.fullName}</th><th>{fr.directory.email}</th><th>{fr.directory.phoneNumber}</th><th>{fr.directory.role}</th><th>{fr.directory.assignedEquipment}</th></tr></thead>
          <tbody>{people.map((person) => <tr key={person.id} tabIndex={0} onClick={() => openPerson(person.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPerson(person.id) } }}><td><div className="person-identity"><span className="person-avatar">{person.name.slice(0, 1).toUpperCase()}</span><strong>{person.name}</strong></div></td><td>{person.user?.email ?? fr.common.notAssigned}</td><td>{person.phone_number ?? fr.common.notAssigned}</td><td>{person.user ? fr.roles[person.user.role] : fr.common.notAssigned}</td><td><span className="assignment-count">{person.equipment_in_custody_count}</span></td></tr>)}</tbody>
        </table>
      </div>
      {(isLoadingPerson || selectedPerson) && <Modal title={selectedPerson?.name ?? fr.directory.personDetails} size="wide" onClose={closePerson}>{isLoadingPerson ? <div className="person-detail-loading"><span className="loading-spinner" aria-hidden="true" /><span>{fr.common.loading}</span></div> : selectedPerson && <PersonDetail person={selectedPerson} />}</Modal>}
    </main>
  )
}

function PersonDetail({ person }: { person: EmployeeDetails }) {
  return <div className="person-detail"><section><h3>{fr.directory.contactInformation}</h3><dl><div><dt>{fr.directory.email}</dt><dd>{person.user?.email ?? fr.common.notAssigned}</dd></div><div><dt>{fr.directory.phoneNumber}</dt><dd>{person.phone_number ?? fr.common.notAssigned}</dd></div><div><dt>{fr.directory.role}</dt><dd>{person.user ? fr.roles[person.user.role] : fr.common.notAssigned}</dd></div><div><dt>{fr.directory.accountStatus}</dt><dd><span className={`account-status ${person.is_active ? 'active' : 'inactive'}`}>{person.is_active ? fr.directory.active : fr.directory.inactive}</span></dd></div></dl></section><section><div className="section-heading-row"><div><h3>{fr.directory.assignedEquipment}</h3><p>{fr.directory.custodyCount(person.equipment_in_custody_count)}</p></div></div>{person.equipment_in_custody.length > 0 ? <div className="site-inventory-wrap"><table className="equipment-table person-inventory-table"><thead><tr><th>{fr.equipment.number}</th><th>{fr.equipment.identification}</th><th>{fr.equipment.condition}</th><th>{fr.equipment.project}</th><th>{fr.equipment.locationShort}</th></tr></thead><tbody>{person.equipment_in_custody.map((equipment) => <tr key={equipment.id}><td><strong>{equipment.display_id}</strong><span className="secondary-cell">{equipment.asset_code}</span></td><td>{[equipment.brand, equipment.model].filter(Boolean).join(' ') || fr.common.notProvided}</td><td><span className={`status-badge status-${equipment.condition ?? 'unknown'}`}>{equipment.condition ? fr.status.condition[equipment.condition] : fr.common.notProvided}</span></td><td>{equipment.current_project_assignment?.project.name ?? fr.common.notProvided}</td><td>{equipment.current_location?.name ?? fr.common.notProvided}</td></tr>)}</tbody></table></div> : <p>{fr.directory.noGenerators}</p>}</section></div>
}

type HeadingProps = DirectoryPageProps & {
  title: string
  subtitle: string
  addLabel: string
  showForm: boolean
  onToggle: () => void
}

function DirectoryHeading({ title, subtitle, canAdd, addLabel, showForm, onToggle }: HeadingProps) {
  return <section className="page-heading"><div><p className="section-label">{fr.directory.management}</p><h1>{title}</h1><p>{subtitle}</p></div>{canAdd && <button className={`primary-button page-action compact-action${showForm ? ' close-action' : ''}`} type="button" onClick={onToggle}><ActionIcon name={showForm ? 'close' : 'add'} /><span>{showForm ? fr.common.close : addLabel}</span></button>}</section>
}

function SiteDetail({ site, onClose }: { site: SiteDetails; onClose: () => void }) {
  return (
    <div className="detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <aside className="detail-panel site-detail-panel" role="dialog" aria-modal="true" aria-label={fr.directory.siteDetails}>
        <header className="detail-header"><div><p className="section-label">{fr.directory.siteDetails}</p><h2>{site.name}</h2>{site.code && <p>{site.code}</p>}</div><button type="button" onClick={onClose} aria-label={fr.common.close}><ActionIcon name="close" /></button></header>
        <div className="detail-content">
          <section><h3>{fr.directory.locations}</h3>{site.locations.length > 0 ? <div className="site-location-list">{site.locations.map((location) => <div key={location.id}><strong>{location.name}</strong>{location.location_type === 'project_site' && <span>{fr.directory.locationTypes.project_site}</span>}</div>)}</div> : <p>{fr.directory.noLocations}</p>}</section>
          <section><div className="section-heading-row"><div><h3>{fr.directory.assignedGenerators}</h3><p>{fr.directory.generatorCount(site.equipment.length)}</p></div></div>{site.equipment.length > 0 ? <div className="site-inventory-wrap"><table className="equipment-table site-inventory-table"><thead><tr><th>{fr.equipment.number}</th><th>{fr.equipment.identification}</th><th>{fr.equipment.fuel}</th><th>{fr.equipment.condition}</th><th>{fr.equipment.locationShort}</th><th>{fr.equipment.custodian}</th></tr></thead><tbody>{site.equipment.map((equipment) => <tr key={equipment.id}><td><strong>{equipment.display_id}</strong><span className="secondary-cell">{equipment.asset_code}</span></td><td>{[equipment.brand, equipment.model].filter(Boolean).join(' ') || '—'}</td><td>{equipment.fuel_type ?? '—'}</td><td><span className={`status-badge ${equipment.condition ? `status-${equipment.condition}` : ''}`}>{equipment.condition ? fr.status.condition[equipment.condition] : '—'}</span></td><td>{equipment.current_location?.name ?? '—'}</td><td>{equipment.custodian?.name ?? '—'}</td></tr>)}</tbody></table></div> : <p>{fr.directory.noGenerators}</p>}</section>
        </div>
      </aside>
    </div>
  )
}
