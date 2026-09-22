import type { AuthenticatedUser } from '../../auth/types'
import { fr } from '../../../i18n/fr'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { EquipmentEditForm } from './EquipmentEditForm'
import { EquipmentImages } from './EquipmentImages'
import { EquipmentInvoices } from './EquipmentInvoices'
import { MaintenanceSection } from './MaintenanceSection'
import { catalogBadgeStyle, catalogLabel } from '../catalogs'
import { displayedValue, locationName, measurement } from '../equipmentDisplay'
import type { Equipment, EquipmentFilterOptions } from '../types'

type EquipmentDetailPanelProps = {
  user: AuthenticatedUser
  selected: Equipment | null
  options: EquipmentFilterOptions | null
  isLoadingDetail: boolean
  isEditingEquipment: boolean
  onClose: () => void
  onDelete: () => void
  onShowHistory: () => void
  onEditingChange: (editing: boolean) => void
  onChanged: (equipment: Equipment) => void
  onRefreshSelected: () => Promise<void>
  onMaintenanceChanged: () => Promise<void>
}

export function EquipmentDetailPanel({
  user, selected, options, isLoadingDetail, isEditingEquipment, onClose, onDelete,
  onShowHistory, onEditingChange, onChanged, onRefreshSelected, onMaintenanceChanged,
}: EquipmentDetailPanelProps) {
  if (!selected && !isLoadingDetail) return null

  return (
        <div className="detail-backdrop" onMouseDown={() => !isLoadingDetail && onClose()}>
          <aside
            className="detail-panel"
            role="dialog"
            aria-modal="true"
            aria-label={fr.equipment.details}
            aria-live="polite"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {isLoadingDetail ? (
              <LoadingSpinner className="detail-loading" label={fr.common.loading} />
            ) : selected && (
              <>
                <header className="detail-header">
                  <div>
                    <p className="section-label">{selected.category.name}</p>
                    <h2>{selected.asset_code}</h2>
                    <p>{[selected.brand, selected.model].filter(Boolean).join(' ') || fr.common.notProvided}</p>
                  </div>
                  <button type="button" aria-label={fr.common.close} onClick={onClose}><ActionIcon name="close" /></button>
                </header>
                <div className="detail-content">
                  <div className={`detail-primary-actions${isEditingEquipment ? ' editing' : ''}`}>
                    {user.permissions.manage_equipment && (
                      <EquipmentEditForm
                        key={selected.id}
                        equipment={selected}
                        employees={options?.employees ?? []}
                        projects={options?.projects ?? []}
                        locations={options?.locations ?? []}
                        catalogs={options?.catalogs ?? []}
                        onEditingChange={onEditingChange}
                        onChanged={(equipment) => { onChanged(equipment) }}
                        imageEditor={<><EquipmentImages equipment={selected} canManage onChanged={async () => { await onRefreshSelected() }} /><EquipmentInvoices equipment={selected} canManage onChanged={async () => { await onRefreshSelected() }} /></>}
                      />
                    )}
                    {!isEditingEquipment && user.permissions.delete_equipment && <button className="danger-button detail-delete-button" type="button" onClick={onDelete}><ActionIcon name="delete" />{fr.equipment.deleteGenerator}</button>}
                    {!isEditingEquipment && <button className="equipment-history-button" type="button" onClick={() => onShowHistory()}><ActionIcon name="history" />{fr.audit.button}</button>}
                  </div>
                  <section>
                    <h3>{fr.equipment.assignment}</h3>
                    <dl>
                      <div><dt>{fr.equipment.project}</dt><dd>{selected.current_project_assignment?.project.name ?? fr.common.notProvided}</dd></div>
                      <div><dt>{fr.equipment.location}</dt><dd>{locationName(selected)}</dd></div>
                      <div><dt>{fr.equipment.custodian}</dt><dd>{selected.responsible ? <>{selected.responsible.name}{selected.responsible_source === 'site' && <small className="responsibility-source">{fr.equipment.inheritedFromSite}</small>}</> : fr.common.notProvided}</dd></div>
                    </dl>
                  </section>
                  <section>
                    <h3>{fr.equipment.identification}</h3>
                    <dl>
                      <div><dt>{fr.equipment.serialNumber}</dt><dd>{displayedValue(selected.serial_number)}</dd></div>
                      <div><dt>{fr.equipment.manufactureYear}</dt><dd>{displayedValue(selected.manufacture_year)}</dd></div>
                      <div><dt>{fr.equipment.condition}</dt><dd>{selected.condition ? <span className={`status-badge status-${selected.condition}`} style={catalogBadgeStyle(options?.catalogs, 'equipment_condition', selected.condition)}>{catalogLabel(options?.catalogs, 'equipment_condition', selected.condition)}</span> : fr.common.notProvided}</dd></div>
                      <div><dt>{fr.equipment.situation}</dt><dd>{selected.operational_situation ? <span className="status-badge" style={catalogBadgeStyle(options?.catalogs, 'operational_situation', selected.operational_situation)}>{catalogLabel(options?.catalogs, 'operational_situation', selected.operational_situation)}</span> : fr.common.notProvided}</dd></div>
                    </dl>
                  </section>
                  {selected.generator_details && (
                    <section>
                      <h3>{fr.equipment.technicalDetails}</h3>
                      <dl>
                        <div><dt>{fr.equipment.apparentPower}</dt><dd>{measurement(selected.generator_details.apparent_power_kva, 'kVA')}</dd></div>
                        <div><dt>{fr.equipment.activePower}</dt><dd>{measurement(selected.generator_details.active_power_kw, 'kW')}</dd></div>
                        <div><dt>{fr.equipment.voltage}</dt><dd>{displayedValue(selected.generator_details.voltage_rating)}</dd></div>
                        <div><dt>{fr.equipment.frequency}</dt><dd>{displayedValue(selected.generator_details.frequency_hz)}</dd></div>
                        <div><dt>{fr.equipment.current}</dt><dd>{displayedValue(selected.generator_details.current_rating)}</dd></div>
                        <div><dt>{fr.equipment.phases}</dt><dd>{displayedValue(selected.generator_details.phases)}</dd></div>
                        <div><dt>{fr.equipment.fuel}</dt><dd>{selected.generator_details.fuel_type ? <span className="status-badge" style={catalogBadgeStyle(options?.catalogs, 'fuel_type', selected.generator_details.fuel_type)}>{catalogLabel(options?.catalogs, 'fuel_type', selected.generator_details.fuel_type)}</span> : fr.common.notProvided}</dd></div>
                        <div><dt>{fr.equipment.tank}</dt><dd>{displayedValue(selected.generator_details.tank_capacity_litres)}</dd></div>
                        <div><dt>{fr.equipment.engineHours}</dt><dd>{displayedValue(selected.generator_details.current_engine_hours)}</dd></div>
                      </dl>
                    </section>
                  )}
                  <section>
                    <h3>{fr.equipment.observations}</h3>
                    <p className="observations">{displayedValue(selected.observations)}</p>
                  </section>
                  {!isEditingEquipment && <EquipmentImages equipment={selected} canManage={false} onChanged={async () => { await onRefreshSelected() }} />}
                  {!isEditingEquipment && <EquipmentInvoices equipment={selected} canManage={false} onChanged={async () => { await onRefreshSelected() }} />}
                  <MaintenanceSection
                    equipment={selected}
                    employees={options?.employees ?? []}
                    canManage={user.permissions.manage_maintenance}
                    canDelete={user.permissions.delete_maintenance}
                    catalogs={options?.catalogs ?? []}
                    onChanged={async () => {
                      await onMaintenanceChanged()
                    }}
                  />
                </div>
              </>
            )}
          </aside>
        </div>
  )
}
