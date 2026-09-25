import { useState } from 'react'
import type { AuthenticatedUser } from '../../auth/types'
import { fr, type Language } from '../../../i18n/fr'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { Modal } from '../../../shared/components/Modal'
import { EquipmentEditForm } from './EquipmentEditForm'
import { AssetForm } from './AssetForm'
import { assetCategory, assetFieldLabel, isAssetCategoryCode } from '../assetCategories'
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
  onShowHistory: () => void
  onEditingChange: (editing: boolean) => void
  onChanged: (equipment: Equipment) => void
  onRefreshSelected: () => Promise<void>
  onMaintenanceChanged: () => Promise<void>
}

export function EquipmentDetailPanel({
  user, language, selected, options, isLoadingDetail, isEditingEquipment, onClose, onDelete,
  onShowHistory, onEditingChange, onChanged, onRefreshSelected, onMaintenanceChanged,
}: EquipmentDetailPanelProps) {
  const [showTransfer, setShowTransfer] = useState(false)
  if (!selected && !isLoadingDetail) return null
  const categoryCode = selected?.category.code ?? 'generator'
  const isOtherAsset = isAssetCategoryCode(categoryCode)
  const assetDefinition = isOtherAsset ? assetCategory(categoryCode) : null

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
                          : <button className="equipment-edit-button" type="button" onClick={() => onEditingChange(true)}><ActionIcon name="edit" />{fr.assets.edit}</button>
                      ) : <EquipmentEditForm
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
                    {!isEditingEquipment && user.permissions.delete_equipment && <button className="danger-button detail-delete-button" type="button" onClick={onDelete}><ActionIcon name="delete" />{isOtherAsset ? fr.assets.delete : fr.equipment.deleteGenerator}</button>}
                    {!isEditingEquipment && !isOtherAsset && options && user.permissions.manage_equipment && <button className="equipment-transfer-button" type="button" onClick={() => setShowTransfer(true)}><ActionIcon name="location" />{fr.equipment.transfer}</button>}
                    {!isEditingEquipment && <button className="equipment-history-button" type="button" onClick={() => onShowHistory()}><ActionIcon name="history" />{fr.audit.button}</button>}
                  </div>
                  <section>
                    <h3>{fr.equipment.assignment}</h3>
                    <dl>
                      <div><dt>{fr.equipment.project}</dt><dd>{selected.current_project_assignment?.project.name ?? fr.common.notProvided}</dd></div>
                      <div><dt>{fr.equipment.location}</dt><dd>{locationName(selected)}</dd></div>
                      <div><dt>{categoryCode === 'car' ? fr.equipment.assignedTo : fr.equipment.custodian}</dt><dd>{selected.responsible ? <>{selected.responsible.name}{selected.responsible_source === 'site' && <small className="responsibility-source">{fr.equipment.inheritedFromSite}</small>}</> : fr.common.notProvided}</dd></div>
                    </dl>
                  </section>
                  <section>
                    <h3>{fr.equipment.identification}</h3>
                    <dl>
                      <div><dt>{categoryCode === 'car' ? fr.equipment.registrationNumber : fr.equipment.serialNumber}</dt><dd>{displayedValue(selected.serial_number)}</dd></div>
                      {isOtherAsset && <div><dt>{fr.equipment.model}</dt><dd>{displayedValue(selected.model)}</dd></div>}
                      {!isOtherAsset && <div><dt>{fr.equipment.model}</dt><dd>{displayedValue(selected.model)}</dd></div>}
                      <div><dt>{fr.equipment.manufactureYear}</dt><dd>{displayedValue(selected.manufacture_year)}</dd></div>
                      <div><dt>{fr.equipment.purchaseDate}</dt><dd>{displayedValue(selected.purchase_date)}</dd></div>
                      <div><dt>{fr.equipment.condition}</dt><dd>{selected.condition ? <span className={`status-badge status-${selected.condition}`} style={catalogBadgeStyle(options?.catalogs, 'equipment_condition', selected.condition)}>{catalogLabel(options?.catalogs, 'equipment_condition', selected.condition)}</span> : fr.common.notProvided}</dd></div>
                      <div><dt>{fr.equipment.situation}</dt><dd>{selected.operational_situation ? <span className="status-badge" style={catalogBadgeStyle(options?.catalogs, 'operational_situation', selected.operational_situation)}>{catalogLabel(options?.catalogs, 'operational_situation', selected.operational_situation)}</span> : fr.common.notProvided}</dd></div>
                    </dl>
                  </section>
                  {isOtherAsset && assetDefinition && <section><h3>{fr.assets.specifications}</h3><dl>{assetDefinition.fields.map((field) => {
                    const value = selected.asset_details?.[field.key]
                    const isCost = field.key === 'purchase_price' || field.key === 'shipping_cost'
                    const display = value === null || value === undefined || value === ''
                      ? fr.common.notProvided
                      : isCost
                        ? formatMoney(value, priceCurrencyLabel(selected.asset_details?.[`${field.key}_currency`]))
                        : `${value}${field.unit ? ` ${field.unit}` : ''}`

                    return <div key={field.key}><dt>{assetFieldLabel(field, language)}</dt><dd>{display}</dd></div>
                  })}</dl></section>}
                  {!isOtherAsset && selected.generator_details && (
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
                        <div><dt>{fr.equipment.purchasePrice}</dt><dd>{selected.generator_details.purchase_price_fcfa === null ? fr.common.notProvided : formatMoney(selected.generator_details.purchase_price_fcfa)}</dd></div>
                      </dl>
                    </section>
                  )}
                  <section>
                    <h3>{fr.equipment.observations}</h3>
                    <p className="observations">{displayedValue(selected.observations)}</p>
                  </section>
                  {(!isEditingEquipment || isOtherAsset) && <EquipmentImages equipment={selected} canManage={isOtherAsset && isEditingEquipment && user.permissions.manage_equipment} title={isOtherAsset ? fr.assets.photos : undefined} onChanged={async () => { await onRefreshSelected() }} />}
                  {(!isEditingEquipment || isOtherAsset) && <EquipmentInvoices equipment={selected} canManage={isOtherAsset && isEditingEquipment && user.permissions.manage_equipment} title={isOtherAsset ? fr.assets.invoices : undefined} onChanged={async () => { await onRefreshSelected() }} />}
                  {!isOtherAsset && <MaintenanceSection
                    equipment={selected}
                    employees={options?.employees ?? []}
                    canManage={user.permissions.manage_maintenance}
                    canDelete={user.permissions.delete_maintenance}
                    catalogs={options?.catalogs ?? []}
                    onChanged={async () => {
                      await onMaintenanceChanged()
                    }}
                  />}
                </div>
                {showTransfer && options && <Modal title={fr.equipment.transferTitle} onClose={() => setShowTransfer(false)}><GeneratorTransferForm equipment={selected} options={options} onTransferred={(equipment) => { setShowTransfer(false); onChanged(equipment) }} /></Modal>}
              </>
            )}
          </aside>
        </div>
  )
}

function priceCurrencyLabel(currency: unknown): string {
  return currency === 'EUR' || currency === 'USD' ? currency : 'FCFA'
}
