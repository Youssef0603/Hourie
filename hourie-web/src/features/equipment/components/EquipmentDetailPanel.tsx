import { useState, type ReactNode } from 'react'
import type { AuthenticatedUser } from '../../auth/types'
import { fr, type Language } from '../../../i18n/fr'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { Modal } from '../../../shared/components/Modal'
import { EquipmentEditForm } from './EquipmentEditForm'
import { AssetForm } from './AssetForm'
import { assetCategory, assetCategoryLabel, assetFieldLabel, isAssetCategoryCode } from '../assetCategories'
import { EquipmentImages } from './EquipmentImages'
import { EquipmentInvoices } from './EquipmentInvoices'
import { MaintenanceSection } from './MaintenanceSection'
import { catalogBadgeStyle, catalogLabel } from '../catalogs'
import { displayedValue, locationName, measurement } from '../equipmentDisplay'
import type { Equipment, EquipmentFilterOptions } from '../types'
import { GeneratorTransferForm } from './GeneratorTransferForm'
import { formatMoney } from '../../../shared/formatMoney'

type EquipmentDetailPanelProps = {
  user: AuthenticatedUser
  language: Language
  selected: Equipment | null
  options: EquipmentFilterOptions | null
  isLoadingDetail: boolean
  isEditingEquipment: boolean
  onClose: () => void
  onDelete: () => void
  onEditingChange: (editing: boolean) => void
  onChanged: (equipment: Equipment) => void
  onRefreshSelected: () => Promise<void>
  onMaintenanceChanged: () => Promise<void>
}

export function EquipmentDetailPanel({
  user, language, selected, options, isLoadingDetail, isEditingEquipment, onClose, onDelete,
  onEditingChange, onChanged, onRefreshSelected, onMaintenanceChanged,
}: EquipmentDetailPanelProps) {
  const [showTransfer, setShowTransfer] = useState(false)
  if (!selected && !isLoadingDetail) return null
  const categoryCode = selected?.category.code ?? 'generator'
  const isOtherAsset = isAssetCategoryCode(categoryCode)
  const assetDefinition = isOtherAsset ? assetCategory(categoryCode) : null
  const openHistory = () => {
    if (!selected) return
    const section = document.getElementById(`equipment-history-${selected.id}`) as HTMLDetailsElement | null
    if (!section) return
    section.open = true
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return (
        <div className="detail-backdrop" onMouseDown={() => !isLoadingDetail && onClose()}>
          <aside
            className="detail-panel"
            role="dialog"
            aria-modal="true"
            aria-label={isOtherAsset ? fr.assets.details : fr.equipment.details}
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
                      isOtherAsset && selected && options ? (
                        isEditingEquipment ? <AssetForm key={selected.id} categoryCode={categoryCode} language={language} options={options} equipment={selected} onSaved={(equipment) => { onChanged(equipment); onEditingChange(false) }} onCancel={() => onEditingChange(false)} />
                          : <button className="equipment-edit-button detail-toolbar-button" type="button" onClick={() => onEditingChange(true)}><ActionIcon name="edit" />{fr.common.edit}</button>
                      ) : <EquipmentEditForm
                        key={selected.id}
                        equipment={selected}
                        employees={options?.employees ?? []}
                        projects={options?.projects ?? []}
                        locations={options?.locations ?? []}
                        catalogs={options?.catalogs ?? []}
                        onEditingChange={onEditingChange}
                        onChanged={(equipment) => { onChanged(equipment) }}
                      />
                    )}
                    {!isEditingEquipment && user.permissions.delete_equipment && <button className="danger-button detail-delete-button" type="button" onClick={onDelete}><ActionIcon name="delete" />{isOtherAsset ? fr.assets.delete : fr.equipment.deleteGenerator}</button>}
                    {!isEditingEquipment && !isOtherAsset && options && user.permissions.manage_equipment && <button className="equipment-transfer-button detail-toolbar-button" type="button" onClick={() => setShowTransfer(true)}><ActionIcon name="transfer" />{fr.equipment.transfer}</button>}
                    {!isEditingEquipment && <button className="equipment-history-button detail-toolbar-button" type="button" onClick={openHistory}><ActionIcon name="history" />{fr.audit.viewButton}</button>}
                  </div>
                  <DetailSection title={fr.equipment.assignment} icon="location" defaultOpen>
                    <dl>
                      <div><dt>{fr.equipment.project}</dt><dd>{selected.current_project_assignment?.project.name ?? fr.common.notProvided}</dd></div>
                      <div><dt>{fr.equipment.location}</dt><dd>{locationName(selected)}</dd></div>
                      <div><dt>{categoryCode === 'car' ? fr.equipment.assignedTo : fr.equipment.custodian}</dt><dd>{selected.responsible ? <>{selected.responsible.name}{selected.responsible_source === 'site' && <small className="responsibility-source">{fr.equipment.inheritedFromSite}</small>}</> : fr.common.notProvided}</dd></div>
                    </dl>
                  </DetailSection>
                  <DetailSection title={fr.equipment.identification} icon="identification" defaultOpen>
                    <dl>
                      <div><dt>{categoryCode === 'car' ? fr.equipment.registrationNumber : fr.equipment.serialNumber}</dt><dd>{displayedValue(selected.serial_number)}</dd></div>
                      {isOtherAsset && <div><dt>{fr.equipment.model}</dt><dd>{displayedValue(selected.model)}</dd></div>}
                      {!isOtherAsset && <div><dt>{fr.equipment.model}</dt><dd>{displayedValue(selected.model)}</dd></div>}
                      <div><dt>{fr.equipment.manufactureYear}</dt><dd>{displayedValue(selected.manufacture_year)}</dd></div>
                      <div><dt>{fr.equipment.purchaseDate}</dt><dd>{displayedValue(selected.purchase_date)}</dd></div>
                      <div><dt>{fr.equipment.condition}</dt><dd>{selected.condition ? <span className={`status-badge status-${selected.condition}`} style={catalogBadgeStyle(options?.catalogs, 'equipment_condition', selected.condition)}>{catalogLabel(options?.catalogs, 'equipment_condition', selected.condition)}</span> : fr.common.notProvided}</dd></div>
                      <div><dt>{fr.equipment.situation}</dt><dd>{selected.operational_situation ? <span className="status-badge" style={catalogBadgeStyle(options?.catalogs, 'operational_situation', selected.operational_situation)}>{catalogLabel(options?.catalogs, 'operational_situation', selected.operational_situation)}</span> : fr.common.notProvided}</dd></div>
                    </dl>
                  </DetailSection>
                  {isOtherAsset && assetDefinition && <DetailSection title={fr.assets.specifications} icon="specifications" defaultOpen><dl>{assetDefinition.fields.map((field) => {
                    const value = selected.asset_details?.[field.key]
                    const isCost = field.key === 'purchase_price' || field.key === 'shipping_cost'
                    const display = value === null || value === undefined || value === ''
                      ? fr.common.notProvided
                      : isCost
                        ? formatMoney(value, priceCurrencyLabel(selected.asset_details?.[`${field.key}_currency`]))
                        : `${value}${field.unit ? ` ${field.unit}` : ''}`

                    return <div key={field.key}><dt>{assetFieldLabel(field, language)}</dt><dd>{display}</dd></div>
                  })}</dl></DetailSection>}
                  {!isOtherAsset && selected.generator_details && (
                    <DetailSection title={fr.equipment.technicalDetails} icon="specifications" defaultOpen>
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
                        <div><dt>{fr.equipment.purchasePrice}</dt><dd>{selected.generator_details.purchase_price_fcfa === null ? fr.common.notProvided : formatMoney(selected.generator_details.purchase_price_fcfa)}</dd></div>
                      </dl>
                    </DetailSection>
                  )}
                  <DetailSection title={fr.equipment.observations} icon="note">
                    <p className="observations">{displayedValue(selected.observations)}</p>
                  </DetailSection>
                  <DetailSection title={fr.assets.photos} icon="photo"><EquipmentImages equipment={selected} canManage={user.permissions.manage_equipment} hideHeading onChanged={async () => { await onRefreshSelected() }} /></DetailSection>
                  <DetailSection title={fr.assets.invoices} icon="invoice"><EquipmentInvoices equipment={selected} canManage={user.permissions.manage_equipment} hideHeading onChanged={async () => { await onRefreshSelected() }} /></DetailSection>
                  {!isOtherAsset && <DetailSection title={fr.maintenance.count(selected.maintenances.length)} icon="maintenance"><MaintenanceSection
                    equipment={selected}
                    employees={options?.employees ?? []}
                    canManage={user.permissions.manage_maintenance}
                    canDelete={user.permissions.delete_maintenance}
                    catalogs={options?.catalogs ?? []}
                    hideHeading
                    onChanged={async () => {
                      await onMaintenanceChanged()
                    }}
                  /></DetailSection>}
                  <DetailSection id={`equipment-history-${selected.id}`} title={fr.audit.button} icon="history">
                    {selected.changes.length > 0
                      ? <div className="audit-list detail-audit-list">{selected.changes.map((change) => <article key={change.id}><span className="audit-dot" aria-hidden="true" /><div><strong>{equipmentAuditLabel(change.type, selected.category.code, language)}</strong><p>{fr.audit.by(change.actor?.name ?? fr.audit.system)} · <time dateTime={change.occurred_at}>{auditDate(change.occurred_at)}</time></p></div></article>)}</div>
                      : <p className="audit-empty">{fr.audit.empty}</p>}
                  </DetailSection>
                </div>
                {showTransfer && options && <Modal title={fr.equipment.transferTitle} onClose={() => setShowTransfer(false)}><GeneratorTransferForm equipment={selected} options={options} onCancel={() => setShowTransfer(false)} onTransferred={(equipment) => { setShowTransfer(false); onChanged(equipment) }} /></Modal>}
              </>
            )}
          </aside>
        </div>
  )
}

function priceCurrencyLabel(currency: unknown): string {
  return currency === 'EUR' || currency === 'USD' ? currency : 'FCFA'
}

function auditDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function equipmentAuditLabel(type: Equipment['changes'][number]['type'], categoryCode: string, language: Language): string {
  if (categoryCode === 'generator') return fr.audit.equipmentActions[type]

  const category = isAssetCategoryCode(categoryCode) ? assetCategoryLabel(categoryCode, language) : fr.assets.title

  if (type === 'initial_import') return fr.audit.assetImported(category)
  if (type === 'identity_updated') return fr.audit.assetIdentityUpdated(category)
  if (type === 'specifications_updated') return fr.audit.assetSpecificationsUpdated(category)
  if (type === 'archived') return fr.audit.assetArchived(category)

  return fr.audit.equipmentActions[type]
}

function DetailSection({ id, title, children, defaultOpen = false, icon }: { id?: string; title: string; children: ReactNode; defaultOpen?: boolean; icon?: 'location' | 'identification' | 'specifications' | 'note' | 'photo' | 'invoice' | 'maintenance' | 'history' }) {
  return <details id={id} className="detail-section" open={defaultOpen}>
    <summary><h3>{icon && <ActionIcon name={icon} />}{title}</h3><ActionIcon name="expand" /></summary>
    <div className="detail-section-body">{children}</div>
  </details>
}
