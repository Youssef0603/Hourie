import { useRef, useState, type FormEvent } from 'react'
import { fr } from '../../../i18n/fr'
import { ApiError } from '../../../shared/api/http'
import { createEquipment, uploadEquipmentImages, uploadEquipmentInvoices } from '../api'
import { locationOptionLabel } from '../locationLabel'
import type { Equipment, EquipmentFilterOptions } from '../types'
import { catalogLabel, catalogOptions } from '../catalogs'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'

type AddGeneratorFormProps = {
  options: EquipmentFilterOptions
  initialProjectId?: number
  onCreated: (equipment: Equipment) => void
  onCancel: () => void
}

export function AddGeneratorForm({ options, initialProjectId, onCreated, onCancel }: AddGeneratorFormProps) {
  const defaultCondition = catalogOptions(options.catalogs, 'equipment_condition')[0]?.code ?? ''
  const [form, setForm] = useState({
    brand: '', model: '', serial_number: '', manufacture_year: '', condition: defaultCondition,
    operational_situation: '', project_id: initialProjectId?.toString() ?? '', current_location_id: '', custodian_employee_id: '',
    apparent_power_kva: '', active_power_kw: '', phases: '', voltage_rating: '', frequency_hz: '',
    current_rating: '', fuel_type: '', tank_capacity_litres: '', current_engine_hours: '', observations: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [invoices, setInvoices] = useState<File[]>([])
  const [createdEquipment, setCreatedEquipment] = useState<Equipment | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const invoiceInput = useRef<HTMLInputElement>(null)
  const physicalLocationOptions = options.locations.filter((location) =>
    location.parent_id !== null
    && (form.project_id === '' || String(location.project_id) === form.project_id),
  )
  const selectedProject = options.projects.find((project) => String(project.id) === form.project_id)

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
    let uploadStage: 'photos' | 'invoices' | null = null
    try {
      const equipment = createdEquipment ?? await createEquipment({
        brand: text(form.brand), model: text(form.model), serial_number: text(form.serial_number),
        manufacture_year: number(form.manufacture_year), condition: text(form.condition),
        operational_situation: text(form.operational_situation),
        project_id: number(form.project_id), current_location_id: number(form.current_location_id),
        custodian_employee_id: number(form.custodian_employee_id), observations: text(form.observations),
        generator_details: {
          apparent_power_kva: number(form.apparent_power_kva), active_power_kw: number(form.active_power_kw),
          phases: text(form.phases), voltage_rating: text(form.voltage_rating), frequency_hz: number(form.frequency_hz),
          current_rating: text(form.current_rating), fuel_type: text(form.fuel_type),
          tank_capacity_litres: number(form.tank_capacity_litres), current_engine_hours: number(form.current_engine_hours),
        },
      })
      savedEquipment = equipment
      setCreatedEquipment(equipment)
      uploadStage = 'photos'
      const images = photos.length > 0 ? await uploadEquipmentImages(equipment.id, photos) : equipment.images
      uploadStage = 'invoices'
      const savedInvoices = invoices.length > 0 ? await uploadEquipmentInvoices(equipment.id, invoices) : equipment.invoices
      onCreated({ ...equipment, images, invoices: savedInvoices })
    } catch (caught) {
      const fallback = !savedEquipment
        ? fr.equipment.createError
        : uploadStage === 'invoices'
          ? fr.invoices.createdUploadError
          : fr.images.createdUploadError
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
        <label><span>{fr.equipment.manufactureYear}</span><input type="number" min="1900" max="2100" value={form.manufacture_year} onChange={(event) => update('manufacture_year', event.target.value)} /></label>
        <label><span>{fr.equipment.apparentPower}</span><input type="number" min="0" step="0.01" value={form.apparent_power_kva} onChange={(event) => update('apparent_power_kva', event.target.value)} /></label>
        <label><span>{fr.equipment.activePower}</span><input type="number" min="0" step="0.01" value={form.active_power_kw} onChange={(event) => update('active_power_kw', event.target.value)} /></label>
        <label><span>{fr.equipment.phases}</span><input value={form.phases} onChange={(event) => update('phases', event.target.value)} /></label>
        <label><span>{fr.equipment.voltage}</span><input value={form.voltage_rating} onChange={(event) => update('voltage_rating', event.target.value)} /></label>
        <label><span>{fr.equipment.frequency}</span><input type="number" min="0" step="0.01" value={form.frequency_hz} onChange={(event) => update('frequency_hz', event.target.value)} /></label>
        <label><span>{fr.equipment.current}</span><input value={form.current_rating} onChange={(event) => update('current_rating', event.target.value)} /></label>
        <label><span>{fr.equipment.fuel}</span><SearchableSelect ariaLabel={fr.equipment.fuel} value={form.fuel_type} onChange={(value) => update('fuel_type', value)} placeholder={fr.common.toComplete} options={catalogOptions(options.catalogs, 'fuel_type').map((option) => ({ value: option.code, label: catalogLabel(options.catalogs, 'fuel_type', option.code) }))} /></label>
        <label><span>{fr.equipment.tank}</span><input type="number" min="0" step="0.01" value={form.tank_capacity_litres} onChange={(event) => update('tank_capacity_litres', event.target.value)} /></label>
        <label className="field-wide"><span>{fr.equipment.engineHours}</span><input type="number" min="0" step="0.01" value={form.current_engine_hours} onChange={(event) => update('current_engine_hours', event.target.value)} /></label>
        <label><span>{fr.equipment.condition}</span><SearchableSelect ariaLabel={fr.equipment.condition} value={form.condition} onChange={(value) => update('condition', value)} placeholder={fr.common.toComplete} includeEmpty={false} options={catalogOptions(options.catalogs, 'equipment_condition').map((option) => ({ value: option.code, label: catalogLabel(options.catalogs, 'equipment_condition', option.code) }))} /></label>
        <label><span>{fr.equipment.situation}</span><SearchableSelect ariaLabel={fr.equipment.situation} value={form.operational_situation} onChange={(value) => update('operational_situation', value)} placeholder={fr.common.toComplete} options={catalogOptions(options.catalogs, 'operational_situation').map((option) => ({ value: option.code, label: catalogLabel(options.catalogs, 'operational_situation', option.code) }))} /></label>
        <label><span>{fr.equipment.project}</span><SearchableSelect ariaLabel={fr.equipment.project} value={form.project_id} onChange={updateProject} placeholder={fr.common.toComplete} options={options.projects.map((project) => ({ value: String(project.id), label: project.name }))} /></label>
        <label><span>{fr.equipment.location}</span><SearchableSelect ariaLabel={fr.equipment.location} value={form.current_location_id} onChange={(value) => update('current_location_id', value)} placeholder={fr.common.toComplete} options={physicalLocationOptions.map((location) => ({ value: String(location.id), label: form.project_id === '' ? locationOptionLabel(location) : location.name }))} /></label>
        <label className="field-wide"><span>{fr.equipment.custodian}</span><SearchableSelect ariaLabel={fr.equipment.custodian} value={form.custodian_employee_id} onChange={(value) => update('custodian_employee_id', value)} placeholder={selectedProject?.responsible ? fr.equipment.useSiteResponsible(selectedProject.responsible.name) : fr.equipment.noSiteResponsible} options={options.employees.map((employee) => ({ value: String(employee.id), label: employee.name }))} /></label>
        <label className="field-wide"><span>{fr.equipment.observations}</span><textarea rows={3} value={form.observations} onChange={(event) => update('observations', event.target.value)} /></label>
        <div className="generator-photo-field field-wide"><span>{fr.images.optionalTitle}</span><input ref={photoInput} hidden multiple accept="image/jpeg,image/png,image/webp" type="file" onChange={(event) => setPhotos(Array.from(event.target.files ?? []))} /><button type="button" onClick={() => photoInput.current?.click()}><ActionIcon name="upload" /><span>{photos.length > 0 ? fr.images.selected(photos.length) : fr.images.addOnCreate}</span><small>{fr.images.formats}</small></button>{photos.length > 0 && <div className="selected-photo-list">{photos.map((photo) => <span key={`${photo.name}-${photo.lastModified}`}>{photo.name}</span>)}</div>}</div>
        <div className="generator-photo-field field-wide"><span>{fr.invoices.title}</span><input ref={invoiceInput} hidden multiple accept="application/pdf,.pdf" type="file" onChange={(event) => setInvoices(Array.from(event.target.files ?? []))} /><button type="button" onClick={() => invoiceInput.current?.click()}><ActionIcon name="upload" /><span>{invoices.length > 0 ? fr.invoices.count(invoices.length) : fr.invoices.add}</span><small>{fr.invoices.formats}</small></button>{invoices.length > 0 && <div className="selected-photo-list">{invoices.map((invoice) => <span key={`${invoice.name}-${invoice.lastModified}`}>{invoice.name}</span>)}</div>}</div>
      </div>
      <div className="maintenance-form-actions"><button type="button" onClick={() => createdEquipment ? onCreated(createdEquipment) : onCancel()}>{fr.common.cancel}</button><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? <LoadingSpinner compact label={fr.common.saving} /> : createdEquipment ? fr.images.retry : fr.common.save}</button></div>
    </form>
  )
}
