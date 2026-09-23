import { useState, type FormEvent } from 'react'
import { fr, type Language } from '../../../i18n/fr'
import { ApiError } from '../../../shared/api/http'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'
import { assetCategory, assetFieldLabel, type AssetCategoryCode } from '../assetCategories'
import { createEquipment, saveEquipment } from '../api'
import { catalogLabel, catalogOptions } from '../catalogs'
import { locationOptionLabel } from '../locationLabel'
import type { Equipment, EquipmentFilterOptions } from '../types'

type AssetFormProps = {
  categoryCode: AssetCategoryCode
  language: Language
  options: EquipmentFilterOptions
  equipment?: Equipment
  onSaved: (equipment: Equipment) => void
  onCancel?: () => void
}

const numberOrNull = (value: string) => value.trim() === '' ? null : Number(value)
const textOrNull = (value: string) => value.trim() === '' ? null : value.trim()

export function AssetForm({ categoryCode, language, options, equipment, onSaved, onCancel }: AssetFormProps) {
  const category = assetCategory(categoryCode)
  const [form, setForm] = useState({
    brand: equipment?.brand ?? '',
    model: equipment?.model ?? '',
    serial_number: equipment?.serial_number ?? '',
    manufacture_year: equipment?.manufacture_year?.toString() ?? '',
    purchase_date: equipment?.purchase_date ?? '',
    condition: equipment?.condition ?? '',
    operational_situation: equipment?.operational_situation ?? '',
    project_id: equipment?.current_project_assignment?.project.id.toString() ?? '',
    current_location_id: equipment?.current_location?.id.toString() ?? '',
    custodian_employee_id: equipment?.custodian?.id.toString() ?? '',
    observations: equipment?.observations ?? '',
  })
  const [details, setDetails] = useState<Record<string, string>>(() => Object.fromEntries(
    (category?.fields ?? []).map((field) => [field.key, String(equipment?.asset_details?.[field.key] ?? '')]),
  ))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!category) return null

  const locations = options.locations.filter((location) => location.parent_id !== null && (!form.project_id || String(location.project_id) === form.project_id))
  const selectedProject = options.projects.find((project) => String(project.id) === form.project_id)
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    const assetDetails = Object.fromEntries(category!.fields.map((field) => [
      field.key,
      field.type === 'number' ? numberOrNull(details[field.key] ?? '') : textOrNull(details[field.key] ?? ''),
    ]))
    const payload = {
      brand: textOrNull(form.brand), model: textOrNull(form.model), serial_number: textOrNull(form.serial_number),
      manufacture_year: numberOrNull(form.manufacture_year), purchase_date: textOrNull(form.purchase_date), condition: textOrNull(form.condition),
      operational_situation: textOrNull(form.operational_situation),
      project_id: numberOrNull(form.project_id), current_location_id: numberOrNull(form.current_location_id),
      custodian_employee_id: numberOrNull(form.custodian_employee_id), observations: textOrNull(form.observations),
      asset_details: assetDetails,
    }

    try {
      onSaved(equipment
        ? await saveEquipment(equipment.id, payload)
        : await createEquipment({ ...payload, category_code: categoryCode }))
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors)[0]?.[0] ?? fr.equipment.saveError : fr.equipment.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  return <form className="generator-create-form asset-form" onSubmit={submit}>
    {error && <div className="form-alert" role="alert">{error}</div>}
    <div className="maintenance-form-grid">
      <label><span>{fr.equipment.brand}</span><input value={form.brand} onChange={(event) => update('brand', event.target.value)} /></label>
      <label><span>{fr.equipment.model}</span><input value={form.model} onChange={(event) => update('model', event.target.value)} /></label>
      <label><span>{fr.equipment.serialNumber}</span><input value={form.serial_number} onChange={(event) => update('serial_number', event.target.value)} /></label>
      <label><span>{fr.equipment.manufactureYear}</span><input type="number" min="1900" max="2100" value={form.manufacture_year} onChange={(event) => update('manufacture_year', event.target.value)} /></label>
      <label><span>{fr.equipment.purchaseDate}</span><input type="date" value={form.purchase_date} onChange={(event) => update('purchase_date', event.target.value)} /></label>
      {category.fields.map((field) => <label key={field.key}><span>{assetFieldLabel(field, language)}</span><input type={field.type} min={field.type === 'number' ? '0' : undefined} step={field.type === 'number' ? 'any' : undefined} value={details[field.key] ?? ''} onChange={(event) => setDetails((current) => ({ ...current, [field.key]: event.target.value }))} /></label>)}
      <label><span>{fr.equipment.condition}</span><SearchableSelect ariaLabel={fr.equipment.condition} value={form.condition} onChange={(value) => update('condition', value)} placeholder={fr.common.toComplete} options={catalogOptions(options.catalogs, 'equipment_condition').map((option) => ({ value: option.code, label: catalogLabel(options.catalogs, 'equipment_condition', option.code) }))} /></label>
      <label><span>{fr.equipment.situation}</span><SearchableSelect ariaLabel={fr.equipment.situation} value={form.operational_situation} onChange={(value) => update('operational_situation', value)} placeholder={fr.common.toComplete} options={catalogOptions(options.catalogs, 'operational_situation').map((option) => ({ value: option.code, label: catalogLabel(options.catalogs, 'operational_situation', option.code) }))} /></label>
      <label><span>{fr.equipment.project}</span><SearchableSelect ariaLabel={fr.equipment.project} value={form.project_id} onChange={(value) => setForm((current) => ({ ...current, project_id: value, current_location_id: '' }))} placeholder={fr.common.toComplete} options={options.projects.map((project) => ({ value: String(project.id), label: project.name }))} /></label>
      <label><span>{fr.equipment.location}</span><SearchableSelect ariaLabel={fr.equipment.location} value={form.current_location_id} onChange={(value) => update('current_location_id', value)} placeholder={fr.common.toComplete} options={locations.map((location) => ({ value: String(location.id), label: form.project_id ? location.name : locationOptionLabel(location) }))} /></label>
      <label className="field-wide"><span>{fr.equipment.custodian}</span><SearchableSelect ariaLabel={fr.equipment.custodian} value={form.custodian_employee_id} onChange={(value) => update('custodian_employee_id', value)} placeholder={selectedProject?.responsible ? fr.equipment.useSiteResponsible(selectedProject.responsible.name) : fr.equipment.noSiteResponsible} options={options.employees.map((employee) => ({ value: String(employee.id), label: employee.name }))} /></label>
      <label className="field-wide"><span>{fr.equipment.observations}</span><textarea rows={3} value={form.observations} onChange={(event) => update('observations', event.target.value)} /></label>
    </div>
    <div className="maintenance-form-actions">
      {onCancel && <button type="button" onClick={onCancel} aria-label={fr.common.close}><ActionIcon name="close" /></button>}
      <button className="primary-button save-button" type="submit" disabled={isSaving}>{isSaving ? <LoadingSpinner compact label={fr.common.saving} /> : fr.common.save}</button>
    </div>
  </form>
}
