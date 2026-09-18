import { useRef, useState, type FormEvent } from 'react'
import { fr } from '../../../i18n/fr'
import { ApiError } from '../../../shared/api/http'
import { createEquipment, uploadEquipmentImages } from '../api'
import { locationOptionLabel } from '../locationLabel'
import type { Equipment, EquipmentFilterOptions } from '../types'
import { catalogLabel, catalogOptions } from '../catalogs'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { ActionIcon } from '../../../shared/components/ActionIcon'

type AddGeneratorFormProps = {
  options: EquipmentFilterOptions
  initialProjectId?: number
  onCreated: (equipment: Equipment) => void
  onCancel: () => void
}

export function AddGeneratorForm({ options, initialProjectId, onCreated, onCancel }: AddGeneratorFormProps) {
  const [form, setForm] = useState({
    brand: '', model: '', serial_number: '', purchase_year: '', condition: 'functional',
    operational_situation: '', project_id: initialProjectId?.toString() ?? '', current_location_id: '', custodian_employee_id: '',
    apparent_power_kva: '', active_power_kw: '', fuel_type: '', observations: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [createdEquipment, setCreatedEquipment] = useState<Equipment | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const physicalLocationOptions = options.locations.filter((location) =>
    location.parent_id !== null
    && (form.project_id === '' || String(location.project_id) === form.project_id),
  )

  function update(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function updateProject(projectId: string) {
    setForm((current) => ({
      ...current,
      project_id: projectId,
      // A physical location belongs to a site. Do not keep a location from the
      // previously selected site when the assignment changes.
      current_location_id: '',
    }))
  }

  const number = (value: string) => value === '' ? null : Number(value)
  const text = (value: string) => value.trim() === '' ? null : value.trim()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    let savedEquipment = createdEquipment
    try {
      const equipment = createdEquipment ?? await createEquipment({
        brand: text(form.brand), model: text(form.model), serial_number: text(form.serial_number),
        purchase_year: number(form.purchase_year), condition: text(form.condition),
        operational_situation: text(form.operational_situation),
        project_id: number(form.project_id), current_location_id: number(form.current_location_id),
        custodian_employee_id: number(form.custodian_employee_id), observations: text(form.observations),
        generator_details: {
          apparent_power_kva: number(form.apparent_power_kva), active_power_kw: number(form.active_power_kw),
          phases: null, voltage_rating: null, frequency_hz: null, current_rating: null,
          fuel_type: text(form.fuel_type), tank_capacity_litres: null, current_engine_hours: null,
        },
      })
      savedEquipment = equipment
      setCreatedEquipment(equipment)
      const images = photos.length > 0 ? await uploadEquipmentImages(equipment.id, photos) : equipment.images
      onCreated({ ...equipment, images })
    } catch (caught) {
      const fallback = savedEquipment ? fr.images.createdUploadError : fr.equipment.createError
      setError(caught instanceof ApiError ? Object.values(caught.errors)[0]?.[0] ?? fallback : fallback)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="generator-create-form" onSubmit={submit}>
      <p>{fr.equipment.automaticId}</p>
      {error && <div className="form-alert" role="alert">{error}</div>}
      <div className="maintenance-form-grid">
        <label><span>{fr.equipment.brand}</span><input required value={form.brand} onChange={(event) => update('brand', event.target.value)} /></label>
        <label><span>{fr.equipment.model}</span><input required value={form.model} onChange={(event) => update('model', event.target.value)} /></label>
        <label><span>{fr.equipment.serialNumber}</span><input value={form.serial_number} onChange={(event) => update('serial_number', event.target.value)} /></label>
        <label><span>{fr.equipment.purchaseYear}</span><input type="number" min="1900" max="2100" value={form.purchase_year} onChange={(event) => update('purchase_year', event.target.value)} /></label>
        <label><span>{fr.equipment.apparentPower}</span><input type="number" min="0" step="0.01" value={form.apparent_power_kva} onChange={(event) => update('apparent_power_kva', event.target.value)} /></label>
        <label><span>{fr.equipment.activePower}</span><input type="number" min="0" step="0.01" value={form.active_power_kw} onChange={(event) => update('active_power_kw', event.target.value)} /></label>
        <label><span>{fr.equipment.fuel}</span><select value={form.fuel_type} onChange={(event) => update('fuel_type', event.target.value)}><option value="">{fr.common.toComplete}</option>{options.fuel_types.map((fuelType) => <option key={fuelType} value={fuelType}>{fuelType}</option>)}</select></label>
        <label><span>{fr.equipment.condition}</span><select value={form.condition} onChange={(event) => update('condition', event.target.value)}>{catalogOptions(options.catalogs, 'equipment_condition').map((option) => <option key={option.code} value={option.code}>{catalogLabel(options.catalogs, 'equipment_condition', option.code)}</option>)}</select></label>
        <label><span>{fr.equipment.situation}</span><select value={form.operational_situation} onChange={(event) => update('operational_situation', event.target.value)}><option value="">{fr.common.toComplete}</option>{catalogOptions(options.catalogs, 'operational_situation').map((option) => <option key={option.code} value={option.code}>{catalogLabel(options.catalogs, 'operational_situation', option.code)}</option>)}</select></label>
        <label><span>{fr.equipment.project}</span><select value={form.project_id} onChange={(event) => updateProject(event.target.value)}><option value="">{fr.common.toComplete}</option>{options.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label><span>{fr.equipment.location}</span><select value={form.current_location_id} onChange={(event) => update('current_location_id', event.target.value)}><option value="">{fr.common.toComplete}</option>{physicalLocationOptions.map((location) => <option key={location.id} value={location.id}>{form.project_id === '' ? locationOptionLabel(location) : location.name}</option>)}</select></label>
        <label className="field-wide"><span>{fr.equipment.custodian}</span><select value={form.custodian_employee_id} onChange={(event) => update('custodian_employee_id', event.target.value)}><option value="">{fr.common.toComplete}</option>{options.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label className="field-wide"><span>{fr.equipment.observations}</span><textarea rows={3} value={form.observations} onChange={(event) => update('observations', event.target.value)} /></label>
        <div className="generator-photo-field field-wide"><span>{fr.images.optionalTitle}</span><input ref={photoInput} hidden multiple accept="image/jpeg,image/png,image/webp" type="file" onChange={(event) => setPhotos(Array.from(event.target.files ?? []))} /><button type="button" onClick={() => photoInput.current?.click()}><ActionIcon name="upload" /><span>{photos.length > 0 ? fr.images.selected(photos.length) : fr.images.addOnCreate}</span><small>{fr.images.formats}</small></button>{photos.length > 0 && <div className="selected-photo-list">{photos.map((photo) => <span key={`${photo.name}-${photo.lastModified}`}>{photo.name}</span>)}</div>}</div>
      </div>
      <div className="maintenance-form-actions"><button type="button" onClick={() => createdEquipment ? onCreated(createdEquipment) : onCancel()}>{fr.common.cancel}</button><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? <LoadingSpinner compact label={fr.common.saving} /> : createdEquipment ? fr.images.retry : fr.common.save}</button></div>
    </form>
  )
}
