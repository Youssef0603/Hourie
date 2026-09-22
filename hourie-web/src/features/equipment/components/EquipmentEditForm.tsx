import { useState, type FormEvent, type ReactNode } from 'react'
import { fr } from '../../../i18n/fr'
import { ApiError } from '../../../shared/api/http'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { saveEquipment } from '../api'
import { locationOptionLabel } from '../locationLabel'
import type { Equipment, EquipmentFilterOptions } from '../types'
import { catalogLabel, catalogOptions } from '../catalogs'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'

type EquipmentEditFormProps = {
  equipment: Equipment
  employees: EquipmentFilterOptions['employees']
  projects: EquipmentFilterOptions['projects']
  locations: EquipmentFilterOptions['locations']
  catalogs: EquipmentFilterOptions['catalogs']
  onChanged: (equipment: Equipment) => void
  onEditingChange?: (isEditing: boolean) => void
  imageEditor?: ReactNode
}

type FormState = {
  brand: string
  model: string
  serial_number: string
  manufacture_year: string
  condition: string
  operational_situation: string
  project_id: string
  current_location_id: string
  custodian_employee_id: string
  observations: string
  apparent_power_kva: string
  active_power_kw: string
  phases: string
  voltage_rating: string
  frequency_hz: string
  current_rating: string
  fuel_type: string
  tank_capacity_litres: string
  current_engine_hours: string
}

function initialForm(equipment: Equipment): FormState {
  const details = equipment.generator_details

  return {
    brand: equipment.brand ?? '',
    model: equipment.model ?? '',
    serial_number: equipment.serial_number ?? '',
    manufacture_year: equipment.manufacture_year?.toString() ?? '',
    condition: equipment.condition ?? '',
    operational_situation: equipment.operational_situation ?? '',
    project_id: equipment.current_project_assignment?.project.id.toString() ?? '',
    current_location_id: equipment.current_location?.id.toString() ?? '',
    custodian_employee_id: equipment.custodian?.id.toString() ?? '',
    observations: equipment.observations ?? '',
    apparent_power_kva: details?.apparent_power_kva ?? '',
    active_power_kw: details?.active_power_kw ?? '',
    phases: details?.phases?.toString() ?? '',
    voltage_rating: details?.voltage_rating ?? '',
    frequency_hz: details?.frequency_hz ?? '',
    current_rating: details?.current_rating ?? '',
    fuel_type: details?.fuel_type ?? '',
    tank_capacity_litres: details?.tank_capacity_litres ?? '',
    current_engine_hours: details?.current_engine_hours ?? '',
  }
}

function text(value: string) {
  return value.trim() === '' ? null : value.trim()
}

function number(value: string) {
  return value === '' ? null : Number(value)
}

export function EquipmentEditForm({ equipment, employees, projects, locations, catalogs, onChanged, onEditingChange, imageEditor }: EquipmentEditFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(() => initialForm(equipment))
  const availableFuelTypes = catalogOptions(catalogs, 'fuel_type')
  const currentFuelIsUnavailable = form.fuel_type !== '' && !availableFuelTypes.some((option) => option.code === form.fuel_type)
  const physicalLocationOptions = locations.filter((location) =>
    location.parent_id !== null
    && (form.project_id === '' || String(location.project_id) === form.project_id),
  )
  const selectedProject = projects.find((project) => String(project.id) === form.project_id)

  function update(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function setEditing(isEditing: boolean) {
    setIsOpen(isEditing)
    onEditingChange?.(isEditing)
  }

  function updateProject(projectId: string) {
    setForm((current) => ({
      ...current,
      project_id: projectId,
      current_location_id: '',
    }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const updated = await saveEquipment(equipment.id, {
        brand: text(form.brand),
        model: text(form.model),
        serial_number: text(form.serial_number),
        manufacture_year: number(form.manufacture_year),
        condition: text(form.condition),
        operational_situation: text(form.operational_situation),
        project_id: number(form.project_id),
        current_location_id: number(form.current_location_id),
        custodian_employee_id: number(form.custodian_employee_id),
        observations: text(form.observations),
        generator_details: {
          apparent_power_kva: number(form.apparent_power_kva),
          active_power_kw: number(form.active_power_kw),
          phases: text(form.phases),
          voltage_rating: text(form.voltage_rating),
          frequency_hz: number(form.frequency_hz),
          current_rating: text(form.current_rating),
          fuel_type: text(form.fuel_type),
          tank_capacity_litres: number(form.tank_capacity_litres),
          current_engine_hours: number(form.current_engine_hours),
        },
      })
      onChanged(updated)
      setForm(initialForm(updated))
      setEditing(false)
    } catch (caught) {
      setError(caught instanceof ApiError
        ? Object.values(caught.errors)[0]?.[0] ?? fr.equipment.saveError
        : fr.equipment.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) {
    return <button className="equipment-edit-button" type="button" onClick={() => setEditing(true)}><ActionIcon name="edit" />{fr.equipment.edit}</button>
  }

  return (
    <form className="maintenance-form equipment-edit-form" onSubmit={submit}>
      <div className="maintenance-form-heading"><strong>{fr.equipment.editTitle}</strong><button type="button" onClick={() => setEditing(false)} aria-label={fr.common.close}><ActionIcon name="close" /></button></div>
      {error && <div className="form-alert" role="alert">{error}</div>}
      <p className="protected-code">{fr.equipment.assetCode}: <strong>{equipment.asset_code}</strong> · {fr.equipment.codeProtected}</p>
      <div className="maintenance-form-grid">
        <label><span>{fr.equipment.brand}</span><input value={form.brand} onChange={(event) => update('brand', event.target.value)} /></label>
        <label><span>{fr.equipment.model}</span><input value={form.model} onChange={(event) => update('model', event.target.value)} /></label>
        <label><span>{fr.equipment.serialNumber}</span><input value={form.serial_number} onChange={(event) => update('serial_number', event.target.value)} /></label>
        <label><span>{fr.equipment.manufactureYear}</span><input min="1900" max="2100" type="number" value={form.manufacture_year} onChange={(event) => update('manufacture_year', event.target.value)} /></label>
        <label><span>{fr.equipment.condition}</span><SearchableSelect ariaLabel={fr.equipment.condition} value={form.condition} onChange={(value) => update('condition', value)} placeholder={fr.common.notProvided} options={catalogOptions(catalogs, 'equipment_condition').map((option) => ({ value: option.code, label: catalogLabel(catalogs, 'equipment_condition', option.code) }))} /></label>
        <label><span>{fr.equipment.situation}</span><SearchableSelect ariaLabel={fr.equipment.situation} value={form.operational_situation} onChange={(value) => update('operational_situation', value)} placeholder={fr.common.notProvided} options={catalogOptions(catalogs, 'operational_situation').map((option) => ({ value: option.code, label: catalogLabel(catalogs, 'operational_situation', option.code) }))} /></label>
        <label><span>{fr.equipment.project}</span><SearchableSelect ariaLabel={fr.equipment.project} value={form.project_id} onChange={updateProject} placeholder={fr.common.notProvided} options={projects.map((project) => ({ value: String(project.id), label: project.name }))} /></label>
        <label><span>{fr.equipment.location}</span><SearchableSelect ariaLabel={fr.equipment.location} value={form.current_location_id} onChange={(value) => update('current_location_id', value)} placeholder={fr.common.notProvided} options={physicalLocationOptions.map((location) => ({ value: String(location.id), label: form.project_id === '' ? locationOptionLabel(location) : location.name }))} /></label>
        <label className="field-wide"><span>{fr.equipment.custodian}</span><SearchableSelect ariaLabel={fr.equipment.custodian} value={form.custodian_employee_id} onChange={(value) => update('custodian_employee_id', value)} placeholder={selectedProject?.responsible ? fr.equipment.useSiteResponsible(selectedProject.responsible.name) : fr.equipment.noSiteResponsible} options={employees.map((employee) => ({ value: String(employee.id), label: employee.name }))} /></label>
        <label><span>{fr.equipment.apparentPower}</span><input min="0" step="0.01" type="number" value={form.apparent_power_kva} onChange={(event) => update('apparent_power_kva', event.target.value)} /></label>
        <label><span>{fr.equipment.activePower}</span><input min="0" step="0.01" type="number" value={form.active_power_kw} onChange={(event) => update('active_power_kw', event.target.value)} /></label>
        <label><span>{fr.equipment.phases}</span><input value={form.phases} onChange={(event) => update('phases', event.target.value)} /></label>
        <label><span>{fr.equipment.voltage}</span><input value={form.voltage_rating} onChange={(event) => update('voltage_rating', event.target.value)} /></label>
        <label><span>{fr.equipment.frequency}</span><input min="0" step="0.01" type="number" value={form.frequency_hz} onChange={(event) => update('frequency_hz', event.target.value)} /></label>
        <label><span>{fr.equipment.current}</span><input value={form.current_rating} onChange={(event) => update('current_rating', event.target.value)} /></label>
        <label><span>{fr.equipment.fuel}</span><SearchableSelect ariaLabel={fr.equipment.fuel} value={form.fuel_type} onChange={(value) => update('fuel_type', value)} placeholder={fr.common.notProvided} options={[...(currentFuelIsUnavailable ? [{ value: form.fuel_type, label: form.fuel_type }] : []), ...availableFuelTypes.map((option) => ({ value: option.code, label: catalogLabel(catalogs, 'fuel_type', option.code) }))]} /></label>
        <label><span>{fr.equipment.tank}</span><input min="0" step="0.01" type="number" value={form.tank_capacity_litres} onChange={(event) => update('tank_capacity_litres', event.target.value)} /></label>
        <label className="field-wide"><span>{fr.equipment.engineHours}</span><input min="0" step="0.01" type="number" value={form.current_engine_hours} onChange={(event) => update('current_engine_hours', event.target.value)} /></label>
        <label className="field-wide"><span>{fr.equipment.observations}</span><textarea rows={4} value={form.observations} onChange={(event) => update('observations', event.target.value)} /></label>
      </div>
      {imageEditor}
      <div className="maintenance-form-actions"><button type="button" onClick={() => setEditing(false)}>{fr.common.cancel}</button><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? <LoadingSpinner compact label={fr.common.saving} /> : fr.common.save}</button></div>
    </form>
  )
}
