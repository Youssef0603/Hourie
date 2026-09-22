import { useState } from 'react'
import { fr } from '../../../i18n/fr'
import { ApiError } from '../../../shared/api/http'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { Modal } from '../../../shared/components/Modal'
import { deleteMaintenance, saveMaintenance } from '../api'
import type {
  Equipment,
  EquipmentFilterOptions,
  EquipmentMaintenance,
  MaintenanceType,
  MaintenancePayload,
} from '../types'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'
import { catalogBadgeStyle, catalogLabel, catalogOptions } from '../catalogs'

type MaintenanceSectionProps = {
  equipment: Equipment
  employees: EquipmentFilterOptions['employees']
  canManage: boolean
  canDelete: boolean
  onChanged: () => Promise<void>
  catalogs: EquipmentFilterOptions['catalogs']
}

type FormState = {
  maintenance_date: string
  engine_hours: string
  intervention_type: string
  oil_changed: string
  oil_quantity_litres: string
  oil_filter_changed: string
  fuel_filter_changed: string
  air_filter_changed: string
  battery_serviced: string
  coolant_serviced: string
  technician_employee_id: string
  technician_name: string
  external_technician_phone: string
  next_maintenance_date: string
  cost: string
  observations: string
}

const emptyForm: FormState = {
  maintenance_date: '',
  engine_hours: '',
  intervention_type: '',
  oil_changed: '',
  oil_quantity_litres: '',
  oil_filter_changed: '',
  fuel_filter_changed: '',
  air_filter_changed: '',
  battery_serviced: '',
  coolant_serviced: '',
  technician_employee_id: '',
  technician_name: '',
  external_technician_phone: '',
  next_maintenance_date: '',
  cost: '',
  observations: '',
}

const yesNoOptions = [
  { value: 'true', label: fr.common.yes },
  { value: 'false', label: fr.common.no },
]

function nullableString(value: string) {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function nullableNumber(value: string) {
  return value === '' ? null : Number(value)
}

function nullableBoolean(value: string) {
  return value === '' ? null : value === 'true'
}

function maintenanceForm(maintenance: EquipmentMaintenance): FormState {
  return {
    maintenance_date: maintenance.maintenance_date,
    engine_hours: maintenance.engine_hours ?? '',
    intervention_type: maintenance.intervention_type,
    oil_changed: maintenance.oil_changed === null ? '' : String(maintenance.oil_changed),
    oil_quantity_litres: maintenance.oil_quantity_litres ?? '',
    oil_filter_changed: maintenance.oil_filter_changed === null ? '' : String(maintenance.oil_filter_changed),
    fuel_filter_changed: maintenance.fuel_filter_changed === null ? '' : String(maintenance.fuel_filter_changed),
    air_filter_changed: maintenance.air_filter_changed === null ? '' : String(maintenance.air_filter_changed),
    battery_serviced: maintenance.battery_serviced === null ? '' : String(maintenance.battery_serviced),
    coolant_serviced: maintenance.coolant_serviced === null ? '' : String(maintenance.coolant_serviced),
    technician_employee_id: maintenance.technician ? String(maintenance.technician.id) : '',
    technician_name: maintenance.technician_name ?? '',
    external_technician_phone: maintenance.external_technician_phone ?? '',
    next_maintenance_date: maintenance.next_maintenance_date ?? '',
    cost: maintenance.cost ?? '',
    observations: maintenance.observations ?? '',
  }
}

function answer(value: boolean | null) {
  if (value === null) return fr.common.notProvided
  return value ? fr.common.yes : fr.common.no
}

function value(value: string | null) {
  return value || fr.common.notProvided
}

export function MaintenanceSection({
  equipment,
  employees,
  canManage,
  canDelete,
  onChanged,
  catalogs,
}: MaintenanceSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | undefined>()
  const [expandedIds, setExpandedIds] = useState<Set<number>>(
    () => new Set(equipment.maintenances[0] ? [equipment.maintenances[0].id] : []),
  )
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const maintenanceTypes = catalogOptions(catalogs, 'maintenance_type')
  const currentTypeIsUnavailable = form.intervention_type !== '' && !maintenanceTypes.some((option) => option.code === form.intervention_type)

  function update(name: keyof FormState, fieldValue: string) {
    setForm((current) => ({ ...current, [name]: fieldValue }))
  }

  function startCreate() {
    setEditingId(undefined)
    setForm(emptyForm)
    setFormError(null)
    setShowForm(true)
  }

  function startEdit(maintenance: EquipmentMaintenance) {
    setExpandedIds((current) => new Set(current).add(maintenance.id))
    setEditingId(maintenance.id)
    setForm(maintenanceForm(maintenance))
    setFormError(null)
    setShowForm(true)
  }

  function toggleMaintenance(maintenanceId: number) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(maintenanceId)) next.delete(maintenanceId)
      else next.add(maintenanceId)
      return next
    })
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(undefined)
    setFormError(null)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setFormError(null)

    const payload: MaintenancePayload = {
      maintenance_date: form.maintenance_date,
      engine_hours: nullableNumber(form.engine_hours),
      intervention_type: form.intervention_type as MaintenanceType,
      oil_changed: nullableBoolean(form.oil_changed),
      oil_quantity_litres: form.oil_changed === 'true' ? nullableNumber(form.oil_quantity_litres) : null,
      oil_filter_changed: nullableBoolean(form.oil_filter_changed),
      fuel_filter_changed: nullableBoolean(form.fuel_filter_changed),
      air_filter_changed: nullableBoolean(form.air_filter_changed),
      battery_serviced: nullableBoolean(form.battery_serviced),
      coolant_serviced: nullableBoolean(form.coolant_serviced),
      technician_employee_id: form.technician_employee_id === '' ? null : Number(form.technician_employee_id),
      technician_name: form.technician_employee_id === '' ? nullableString(form.technician_name) : null,
      external_technician_phone: form.technician_employee_id === '' ? nullableString(form.external_technician_phone) : null,
      next_maintenance_date: nullableString(form.next_maintenance_date),
      cost: nullableNumber(form.cost),
      cost_currency: form.cost === '' ? null : 'XOF',
      observations: nullableString(form.observations),
    }

    try {
      await saveMaintenance(equipment.id, payload, editingId)
      await onChanged()
      closeForm()
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(Object.values(error.errors)[0]?.[0] ?? fr.maintenance.saveError)
      } else {
        setFormError(fr.maintenance.saveError)
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(maintenance: EquipmentMaintenance) {
    if (!window.confirm(fr.maintenance.deleteConfirmation)) return

    try {
      await deleteMaintenance(equipment.id, maintenance.id)
      await onChanged()
    } catch {
      setFormError(fr.maintenance.deleteError)
    }
  }

  return (
    <section className="maintenance-section">
      <div className="section-heading-row">
        <div>
          <h3>{fr.maintenance.title}</h3>
          <p>{fr.maintenance.count(equipment.maintenances.length)}</p>
        </div>
        {canManage && (
          <button className="maintenance-add" type="button" onClick={startCreate}>
            <ActionIcon name="add" />
            <span>{fr.maintenance.add}</span>
          </button>
        )}
      </div>

      {formError && <div className="form-alert" role="alert">{formError}</div>}

      {showForm && (
        <Modal title={editingId ? fr.maintenance.editTitle : fr.maintenance.addTitle} size="wide" onClose={closeForm}>
        <form className="maintenance-form modal-form" onSubmit={submit}>
          <div className="maintenance-form-grid">
            <label><span>{fr.maintenance.date}</span><input required type="date" value={form.maintenance_date} onChange={(event) => update('maintenance_date', event.target.value)} /></label>
            <label><span>{fr.equipment.engineHours}</span><input min="0" step="0.01" type="number" value={form.engine_hours} onChange={(event) => update('engine_hours', event.target.value)} placeholder="1250,50" /></label>
            <label><span>{fr.maintenance.interventionType}</span><SearchableSelect required ariaLabel={fr.maintenance.interventionType} value={form.intervention_type} onChange={(value) => update('intervention_type', value)} placeholder={fr.common.toComplete} options={[...(currentTypeIsUnavailable ? [{ value: form.intervention_type, label: catalogLabel(catalogs, 'maintenance_type', form.intervention_type) }] : []), ...maintenanceTypes.map((option) => ({ value: option.code, label: catalogLabel(catalogs, 'maintenance_type', option.code) }))]} /></label>
            <label>
              <span>{fr.maintenance.oil_changed}</span>
              <SearchableSelect searchable={false} ariaLabel={fr.maintenance.oil_changed} value={form.oil_changed} onChange={(value) => update('oil_changed', value)} placeholder={fr.common.notProvided} options={yesNoOptions} />
            </label>
            {form.oil_changed === 'true' && (
              <label>
                <span>{fr.maintenance.oilQuantity}</span>
                <input required min="0.01" step="0.01" type="number" value={form.oil_quantity_litres} onChange={(event) => update('oil_quantity_litres', event.target.value)} placeholder="18,50" />
              </label>
            )}
            {(['oil_filter_changed', 'fuel_filter_changed', 'air_filter_changed'] as const).map((field) => (
              <label key={field}>
                <span>{fr.maintenance[field]}</span>
                <SearchableSelect searchable={false} ariaLabel={fr.maintenance[field]} value={form[field]} onChange={(value) => update(field, value)} placeholder={fr.common.notProvided} options={yesNoOptions} />
              </label>
            ))}
            {(['battery_serviced', 'coolant_serviced'] as const).map((field) => (
              <label key={field}><span>{field === 'battery_serviced' ? fr.maintenance.battery : fr.maintenance.coolant}</span><SearchableSelect searchable={false} ariaLabel={field === 'battery_serviced' ? fr.maintenance.battery : fr.maintenance.coolant} value={form[field]} onChange={(value) => update(field, value)} placeholder={fr.common.notProvided} options={yesNoOptions} /></label>
            ))}
            <label><span>{fr.maintenance.linkedTechnician}</span><SearchableSelect ariaLabel={fr.maintenance.linkedTechnician} value={form.technician_employee_id} onChange={(value) => { update('technician_employee_id', value); if (value !== '') { update('technician_name', ''); update('external_technician_phone', '') } }} placeholder={fr.common.notProvided} options={employees.map((employee) => ({ value: String(employee.id), label: employee.name }))} /></label>
            {form.technician_employee_id === '' && <><label><span>{fr.maintenance.technicianName}</span><input value={form.technician_name} onChange={(event) => update('technician_name', event.target.value)} /></label><label><span>{fr.maintenance.technicianPhone}</span><input type="tel" value={form.external_technician_phone} onChange={(event) => update('external_technician_phone', event.target.value)} placeholder="+225 07 00 00 00 00" /></label></>}
            <label><span>{fr.maintenance.nextDue}</span><input type="date" min={form.maintenance_date || undefined} value={form.next_maintenance_date} onChange={(event) => update('next_maintenance_date', event.target.value)} /></label>
            <label><span>{fr.maintenance.cost} (FCFA)</span><input min="0" step="0.01" type="number" value={form.cost} onChange={(event) => update('cost', event.target.value)} /></label>
            <label className="field-wide"><span>{fr.equipment.observations}</span><textarea rows={3} value={form.observations} onChange={(event) => update('observations', event.target.value)} /></label>
          </div>
          <div className="maintenance-form-actions">
            <button className="primary-button save-button" type="submit" disabled={isSaving}>{isSaving ? <LoadingSpinner compact label={fr.common.saving} /> : fr.common.save}</button>
          </div>
        </form>
        </Modal>
      )}

      {equipment.maintenances.length === 0 ? (
        <p className="maintenance-empty">{fr.maintenance.empty}</p>
      ) : (
        <div className="maintenance-list">
          {equipment.maintenances.map((maintenance) => {
            const isExpanded = expandedIds.has(maintenance.id)
            const title = catalogLabel(catalogs, 'maintenance_type', maintenance.intervention_type)

            return (
              <article className={`maintenance-card${isExpanded ? ' expanded' : ''}`} key={maintenance.id}>
                <header>
                  <button
                    className="maintenance-card-toggle"
                    type="button"
                    onClick={() => toggleMaintenance(maintenance.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`maintenance-details-${maintenance.id}`}
                    aria-label={`${isExpanded ? fr.maintenance.hideDetails : fr.maintenance.showDetails} — ${title}`}
                  >
                    <span className="maintenance-card-summary"><strong><span className="status-badge" style={catalogBadgeStyle(catalogs, 'maintenance_type', maintenance.intervention_type)}>{title}</span></strong><span>{maintenance.maintenance_date}</span></span>
                    <ActionIcon name="expand" />
                  </button>
                  {canManage && <div className="maintenance-actions"><button type="button" onClick={() => startEdit(maintenance)}><ActionIcon name="edit" />{fr.common.edit}</button>{canDelete && <button type="button" onClick={() => remove(maintenance)}><ActionIcon name="delete" />{fr.common.delete}</button>}</div>}
                </header>
                {isExpanded && (
                  <div className="maintenance-card-body" id={`maintenance-details-${maintenance.id}`}>
                    <dl>
                      <div><dt>{fr.equipment.engineHours}</dt><dd>{value(maintenance.engine_hours)}</dd></div>
                      <div><dt>{fr.maintenance.oil_changed}</dt><dd>{answer(maintenance.oil_changed)}</dd></div>
                      <div><dt>{fr.maintenance.oilQuantity}</dt><dd>{maintenance.oil_quantity_litres ? `${maintenance.oil_quantity_litres} L` : fr.common.notProvided}</dd></div>
                      <div><dt>{fr.maintenance.oil_filter_changed}</dt><dd>{answer(maintenance.oil_filter_changed)}</dd></div>
                      <div><dt>{fr.maintenance.fuel_filter_changed}</dt><dd>{answer(maintenance.fuel_filter_changed)}</dd></div>
                      <div><dt>{fr.maintenance.air_filter_changed}</dt><dd>{answer(maintenance.air_filter_changed)}</dd></div>
                      <div><dt>{fr.maintenance.battery}</dt><dd>{answer(maintenance.battery_serviced)}</dd></div>
                      <div><dt>{fr.maintenance.coolant}</dt><dd>{answer(maintenance.coolant_serviced)}</dd></div>
                      <div><dt>{fr.maintenance.technicianName}</dt><dd>{maintenance.technician?.name ?? value(maintenance.technician_name)}</dd></div>
                      {!maintenance.technician && <div><dt>{fr.maintenance.technicianPhone}</dt><dd>{value(maintenance.external_technician_phone)}</dd></div>}
                      <div><dt>{fr.maintenance.nextDue}</dt><dd>{value(maintenance.next_maintenance_date)}</dd></div>
                      <div><dt>{fr.maintenance.cost}</dt><dd>{maintenance.cost ? `${maintenance.cost} FCFA` : fr.common.notProvided}</dd></div>
                    </dl>
                    <p>{value(maintenance.observations)}</p>
                    <small>{fr.maintenance.recordedBy(maintenance.created_by.name)}</small>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
