import { useState, type FormEvent } from 'react'
import { fr } from '../../../i18n/fr'
import { ApiError } from '../../../shared/api/http'
import { createEquipment } from '../api'
import { locationOptionLabel } from '../locationLabel'
import type { Equipment, EquipmentFilterOptions } from '../types'

type AddGeneratorFormProps = {
  options: EquipmentFilterOptions
  onCreated: (equipment: Equipment) => void
  onCancel: () => void
}

export function AddGeneratorForm({ options, onCreated, onCancel }: AddGeneratorFormProps) {
  const [form, setForm] = useState({
    brand: '', model: '', serial_number: '', purchase_year: '', condition: 'functional',
    operational_situation: '', project_id: '', current_location_id: '', custodian_employee_id: '',
    apparent_power_kva: '', active_power_kw: '', fuel_type: '', observations: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const number = (value: string) => value === '' ? null : Number(value)
  const text = (value: string) => value.trim() === '' ? null : value.trim()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      const equipment = await createEquipment({
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
      onCreated(equipment)
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors)[0]?.[0] ?? fr.equipment.createError : fr.equipment.createError)
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
        <label><span>{fr.equipment.condition}</span><select value={form.condition} onChange={(event) => update('condition', event.target.value)}>{Object.entries(fr.status.condition).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label><span>{fr.equipment.situation}</span><select value={form.operational_situation} onChange={(event) => update('operational_situation', event.target.value)}><option value="">{fr.common.toComplete}</option>{Object.entries(fr.status.operationalSituation).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label><span>{fr.equipment.project}</span><select value={form.project_id} onChange={(event) => update('project_id', event.target.value)}><option value="">{fr.common.toComplete}</option>{options.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label><span>{fr.equipment.location}</span><select value={form.current_location_id} onChange={(event) => update('current_location_id', event.target.value)}><option value="">{fr.common.toComplete}</option>{options.locations.map((location) => <option key={location.id} value={location.id}>{locationOptionLabel(location)}</option>)}</select></label>
        <label className="field-wide"><span>{fr.equipment.custodian}</span><select value={form.custodian_employee_id} onChange={(event) => update('custodian_employee_id', event.target.value)}><option value="">{fr.common.toComplete}</option>{options.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label className="field-wide"><span>{fr.equipment.observations}</span><textarea rows={3} value={form.observations} onChange={(event) => update('observations', event.target.value)} /></label>
      </div>
      <div className="maintenance-form-actions"><button type="button" onClick={onCancel}>{fr.common.cancel}</button><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? fr.common.saving : fr.common.save}</button></div>
    </form>
  )
}
