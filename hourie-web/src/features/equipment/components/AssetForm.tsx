import { useState, type FormEvent, type ReactNode } from 'react'
import { fr, type Language } from '../../../i18n/fr'
import { ApiError } from '../../../shared/api/http'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'
import { assetCategory, assetFieldLabel, type AssetCategoryCode, type AssetField } from '../assetCategories'
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
  formId?: string
}

const numberOrNull = (value: string) => value.trim() === '' ? null : Number(value)
const textOrNull = (value: string) => value.trim() === '' ? null : value.trim()
const isYes = (value: unknown) => /^oui\b/i.test(String(value ?? '').trim())
const airConditioningParts = (value: unknown) => {
  const description = String(value ?? '').replace(/^oui\s*[—-]?\s*/i, '').trim()
  const match = description.match(/^(.*?)[,\s]+(\d+(?:[,.]\d+)?)\s*CH$/i)

  return { brand: match?.[1]?.trim() ?? description, power: match?.[2] ?? '' }
}

export function InventoryFormSection({ title, icon, children, defaultOpen = true }: { title: string; icon: 'location' | 'identification' | 'specifications' | 'note' | 'photo' | 'invoice'; children: ReactNode; defaultOpen?: boolean }) {
  return <details className="detail-section inventory-form-section" open={defaultOpen}><summary><h3><ActionIcon name={icon} />{title}</h3><ActionIcon name="expand" /></summary><div className="detail-section-body">{children}</div></details>
}

export function AssetForm({ categoryCode, language, options, equipment, onSaved, onCancel, formId }: AssetFormProps) {
  const category = assetCategory(categoryCode)
  const isCar = categoryCode === 'car'
  const isBungalow = categoryCode === 'portacabin'
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
  const initialAirConditioning = airConditioningParts(equipment?.asset_details?.air_conditioning)
  const [hasElectricalInstallation, setHasElectricalInstallation] = useState(() => isYes(equipment?.asset_details?.electrical_installation))
  const [hasAirConditioning, setHasAirConditioning] = useState(() => isYes(equipment?.asset_details?.air_conditioning))
  const [airConditioningBrand, setAirConditioningBrand] = useState(initialAirConditioning.brand)
  const [airConditioningPower, setAirConditioningPower] = useState(initialAirConditioning.power)
  const [priceCurrencies, setPriceCurrencies] = useState({
    purchase_price: String(equipment?.asset_details?.purchase_price_currency ?? 'XOF'),
    shipping_cost: String(equipment?.asset_details?.shipping_cost_currency ?? 'XOF'),
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!category) return null

  const locations = options.locations.filter((location) => form.project_id
    ? location.parent_id !== null && String(location.project_id) === form.project_id
    : location.location_type === 'company_location' && location.project_id === null)
  const selectedProject = options.projects.find((project) => String(project.id) === form.project_id)
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const bungalowBooleanFields = new Set(['electrical_installation', 'air_conditioning'])
  const renderDetailField = (field: AssetField) => <label key={field.key}><span>{assetFieldLabel(field, language)}</span>{field.key === 'purchase_price' || field.key === 'shipping_cost' ? <span className="price-input"><input type="number" min="0" step="any" value={details[field.key] ?? ''} onChange={(event) => setDetails((current) => ({ ...current, [field.key]: event.target.value }))} /><SearchableSelect ariaLabel={`${assetFieldLabel(field, language)} currency`} value={priceCurrencies[field.key]} onChange={(value) => setPriceCurrencies((current) => ({ ...current, [field.key]: value }))} placeholder="FCFA" includeEmpty={false} options={[{ value: 'XOF', label: 'FCFA' }, { value: 'EUR', label: 'EUR' }, { value: 'USD', label: 'USD' }]} /></span> : <input type={field.type} min={field.type === 'number' ? '0' : undefined} step={field.type === 'number' ? 'any' : undefined} placeholder={field.key === 'air_conditioning' ? fr.assets.airConditioningExample : undefined} value={details[field.key] ?? ''} onChange={(event) => setDetails((current) => ({ ...current, [field.key]: event.target.value }))} />}</label>
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    const assetDetails = Object.fromEntries(category!.fields.map((field) => [
      field.key,
      field.type === 'number' ? numberOrNull(details[field.key] ?? '') : textOrNull(details[field.key] ?? ''),
    ]))
    if (isBungalow) {
      assetDetails.electrical_installation = hasElectricalInstallation ? 'Oui' : 'Non'
      assetDetails.air_conditioning = hasAirConditioning
        ? `Oui — ${[airConditioningBrand.trim(), airConditioningPower.trim() && `${airConditioningPower.trim()} CH`].filter(Boolean).join(' ')}`
        : 'Non'
    }
    const payload = {
      brand: textOrNull(form.brand), model: textOrNull(form.model), serial_number: textOrNull(form.serial_number),
      manufacture_year: numberOrNull(form.manufacture_year), purchase_date: textOrNull(form.purchase_date), condition: textOrNull(form.condition),
      operational_situation: textOrNull(form.operational_situation),
      project_id: numberOrNull(form.project_id), current_location_id: numberOrNull(form.current_location_id),
      custodian_employee_id: numberOrNull(form.custodian_employee_id), observations: textOrNull(form.observations),
      asset_details: { ...assetDetails, purchase_price_currency: priceCurrencies.purchase_price, shipping_cost_currency: priceCurrencies.shipping_cost },
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

  return <form id={formId} className="generator-create-form asset-form" onSubmit={submit}>
    {onCancel && <div className="maintenance-form-heading"><strong>{fr.assets.edit}</strong><button type="button" onClick={onCancel} aria-label={fr.common.close}><ActionIcon name="close" /></button></div>}
    {error && <div className="form-alert" role="alert">{error}</div>}
    <div className="inventory-form-note"><ActionIcon name="identification" /><span>{fr.assets.assetCodeAuto}</span></div>
    <div className="asset-form-layout">
      <InventoryFormSection title={fr.equipment.assignment} icon="location"><div className="maintenance-form-grid asset-form-grid-3">
        <label><span>{fr.equipment.project}</span><SearchableSelect ariaLabel={fr.equipment.project} value={form.project_id} onChange={(value) => setForm((current) => ({ ...current, project_id: value, current_location_id: '' }))} placeholder={fr.common.toComplete} options={options.projects.map((project) => ({ value: String(project.id), label: project.name }))} /></label>
        <label><span>{fr.equipment.location}</span><SearchableSelect ariaLabel={fr.equipment.location} value={form.current_location_id} onChange={(value) => update('current_location_id', value)} placeholder={fr.common.toComplete} options={locations.map((location) => ({ value: String(location.id), label: form.project_id ? location.name : locationOptionLabel(location) }))} /></label>
        <label><span>{isCar ? fr.equipment.assignedTo : fr.equipment.custodian}</span><SearchableSelect ariaLabel={isCar ? fr.equipment.assignedTo : fr.equipment.custodian} value={form.custodian_employee_id} onChange={(value) => update('custodian_employee_id', value)} placeholder={selectedProject?.responsible ? fr.equipment.useSiteResponsible(selectedProject.responsible.name) : fr.equipment.noSiteResponsible} options={options.employees.map((employee) => ({ value: String(employee.id), label: employee.name }))} /></label>
      </div></InventoryFormSection>
      <InventoryFormSection title={fr.equipment.identification} icon="identification"><div className="maintenance-form-grid asset-form-grid-3">
        <label><span>{fr.equipment.brand}</span><input required value={form.brand} onChange={(event) => update('brand', event.target.value)} /></label>
        <label><span>{fr.equipment.model}</span><input required value={form.model} onChange={(event) => update('model', event.target.value)} /></label>
        <label><span>{isCar ? fr.equipment.registrationNumber : fr.equipment.serialNumber}</span><input value={form.serial_number} onChange={(event) => update('serial_number', event.target.value)} /></label>
        <label><span>{fr.equipment.manufactureYear}</span><input type="number" min="1900" max="2100" value={form.manufacture_year} onChange={(event) => update('manufacture_year', event.target.value)} /></label>
        <label><span>{fr.equipment.purchaseDate}</span><input type="date" value={form.purchase_date} onChange={(event) => update('purchase_date', event.target.value)} /></label>
        <label><span>{fr.equipment.condition}</span><SearchableSelect ariaLabel={fr.equipment.condition} value={form.condition} onChange={(value) => update('condition', value)} placeholder={fr.common.toComplete} options={catalogOptions(options.catalogs, 'equipment_condition').map((option) => ({ value: option.code, label: catalogLabel(options.catalogs, 'equipment_condition', option.code) }))} /></label>
        <label><span>{fr.equipment.situation}</span><SearchableSelect ariaLabel={fr.equipment.situation} value={form.operational_situation} onChange={(value) => update('operational_situation', value)} placeholder={fr.common.toComplete} options={catalogOptions(options.catalogs, 'operational_situation').map((option) => ({ value: option.code, label: catalogLabel(options.catalogs, 'operational_situation', option.code) }))} /></label>
      </div></InventoryFormSection>
      {category.fields.length > 0 && <InventoryFormSection title={fr.assets.specifications} icon="specifications"><div className="maintenance-form-grid asset-form-grid-3">
        {category.fields.filter((field) => !bungalowBooleanFields.has(field.key)).map(renderDetailField)}
        {isBungalow && <div className="bungalow-utilities field-wide">
          <div className="bungalow-utility-toggles"><label className="maintenance-checkbox bungalow-boolean"><input type="checkbox" checked={hasElectricalInstallation} onChange={(event) => setHasElectricalInstallation(event.target.checked)} /><span>{fr.assets.electricalInstallation}</span></label><label className="maintenance-checkbox bungalow-boolean"><input type="checkbox" checked={hasAirConditioning} onChange={(event) => setHasAirConditioning(event.target.checked)} /><span>{fr.assets.airConditioning}</span></label></div>
          {hasAirConditioning && <div className="bungalow-air-conditioning-fields"><label><span>{fr.assets.airConditioningBrand}</span><input value={airConditioningBrand} onChange={(event) => setAirConditioningBrand(event.target.value)} /></label><label><span>{fr.assets.airConditioningPower}</span><input inputMode="decimal" value={airConditioningPower} onChange={(event) => setAirConditioningPower(event.target.value)} placeholder="1,5" /></label></div>}
        </div>}
      </div></InventoryFormSection>}
      <InventoryFormSection title={fr.equipment.observations} icon="note"><div className="maintenance-form-grid"><label className="field-wide"><span>{fr.equipment.observations}</span><textarea rows={3} value={form.observations} onChange={(event) => update('observations', event.target.value)} /></label></div></InventoryFormSection>
    </div>
    {onCancel && <div className="maintenance-form-actions"><button className="primary-button" type="submit" disabled={isSaving}>{fr.common.save}</button></div>}
  </form>
}
