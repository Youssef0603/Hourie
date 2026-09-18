import { useState, type FormEvent } from 'react'
import { fr } from '../../../i18n/fr'
import { ApiError } from '../../../shared/api/http'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { saveEquipment } from '../api'
import type { Equipment, EquipmentFilterOptions } from '../types'

type EquipmentEditFormProps = {
  equipment: Equipment
  employees: EquipmentFilterOptions['employees']
  fuelTypes: EquipmentFilterOptions['fuel_types']
  onChanged: (equipment: Equipment) => void
}

type FormState = {
  brand: string
  model: string
  serial_number: string
  purchase_year: string
  condition: string
  operational_situation: string
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
    purchase_year: equipment.purchase_year?.toString() ?? '',
    condition: equipment.condition ?? '',
    operational_situation: equipment.operational_situation ?? '',
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

export function EquipmentEditForm({ equipment, employees, fuelTypes, onChanged }: EquipmentEditFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(() => initialForm(equipment))
  const availableFuelTypes = Array.from(new Set([...fuelTypes, form.fuel_type].filter(Boolean)))

  function update(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
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
        purchase_year: number(form.purchase_year),
        condition: text(form.condition),
        operational_situation: text(form.operational_situation),
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
      setIsOpen(false)
    } catch (caught) {
      setError(caught instanceof ApiError
        ? Object.values(caught.errors)[0]?.[0] ?? fr.equipment.saveError
        : fr.equipment.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) {
    return <button className="equipment-edit-button" type="button" onClick={() => setIsOpen(true)}>{fr.equipment.edit}</button>
  }

  return (
    <form className="maintenance-form equipment-edit-form" onSubmit={submit}>
      <div className="maintenance-form-heading"><strong>{fr.equipment.editTitle}</strong><button type="button" onClick={() => setIsOpen(false)} aria-label={fr.common.close}><ActionIcon name="close" /></button></div>
      {error && <div className="form-alert" role="alert">{error}</div>}
      <p className="protected-code">{fr.equipment.assetCode}: <strong>{equipment.asset_code}</strong> · {fr.equipment.codeProtected}</p>
      <div className="maintenance-form-grid">
        <label><span>{fr.equipment.brand}</span><input value={form.brand} onChange={(event) => update('brand', event.target.value)} /></label>
        <label><span>{fr.equipment.model}</span><input value={form.model} onChange={(event) => update('model', event.target.value)} /></label>
        <label><span>{fr.equipment.serialNumber}</span><input value={form.serial_number} onChange={(event) => update('serial_number', event.target.value)} /></label>
        <label><span>{fr.equipment.purchaseYear}</span><input min="1900" max="2100" type="number" value={form.purchase_year} onChange={(event) => update('purchase_year', event.target.value)} /></label>
        <label><span>{fr.equipment.condition}</span><select value={form.condition} onChange={(event) => update('condition', event.target.value)}><option value="">{fr.common.notProvided}</option>{Object.entries(fr.status.condition).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label><span>{fr.equipment.situation}</span><select value={form.operational_situation} onChange={(event) => update('operational_situation', event.target.value)}><option value="">{fr.common.notProvided}</option>{Object.entries(fr.status.operationalSituation).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="field-wide"><span>{fr.equipment.custodian}</span><select value={form.custodian_employee_id} onChange={(event) => update('custodian_employee_id', event.target.value)}><option value="">{fr.common.notProvided}</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label><span>{fr.equipment.apparentPower}</span><input min="0" step="0.01" type="number" value={form.apparent_power_kva} onChange={(event) => update('apparent_power_kva', event.target.value)} /></label>
        <label><span>{fr.equipment.activePower}</span><input min="0" step="0.01" type="number" value={form.active_power_kw} onChange={(event) => update('active_power_kw', event.target.value)} /></label>
        <label><span>{fr.equipment.phases}</span><input value={form.phases} onChange={(event) => update('phases', event.target.value)} /></label>
        <label><span>{fr.equipment.voltage}</span><input value={form.voltage_rating} onChange={(event) => update('voltage_rating', event.target.value)} /></label>
        <label><span>{fr.equipment.frequency}</span><input min="0" step="0.01" type="number" value={form.frequency_hz} onChange={(event) => update('frequency_hz', event.target.value)} /></label>
        <label><span>{fr.equipment.current}</span><input value={form.current_rating} onChange={(event) => update('current_rating', event.target.value)} /></label>
        <label><span>{fr.equipment.fuel}</span><select value={form.fuel_type} onChange={(event) => update('fuel_type', event.target.value)}><option value="">{fr.common.notProvided}</option>{availableFuelTypes.map((fuelType) => <option key={fuelType} value={fuelType}>{fuelType}</option>)}</select></label>
        <label><span>{fr.equipment.tank}</span><input min="0" step="0.01" type="number" value={form.tank_capacity_litres} onChange={(event) => update('tank_capacity_litres', event.target.value)} /></label>
        <label className="field-wide"><span>{fr.equipment.engineHours}</span><input min="0" step="0.01" type="number" value={form.current_engine_hours} onChange={(event) => update('current_engine_hours', event.target.value)} /></label>
        <label className="field-wide"><span>{fr.equipment.observations}</span><textarea rows={4} value={form.observations} onChange={(event) => update('observations', event.target.value)} /></label>
      </div>
      <div className="maintenance-form-actions"><button type="button" onClick={() => setIsOpen(false)}>{fr.common.cancel}</button><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? fr.common.saving : fr.common.save}</button></div>
    </form>
  )
}
