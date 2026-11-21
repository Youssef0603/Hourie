import type { ReactNode } from 'react'
import { fr, type Language } from '../../../i18n/fr'
import { operationPhrase as t } from '../../../i18n/operations'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { EmptyState } from '../../../shared/components/EmptyState'
import { Pagination } from '../../../shared/components/Pagination'
import { clickableRow } from '../../../shared/clickableRow'
import { assetCategoryLabel, isAssetCategoryCode } from '../assetCategories'
import { catalogBadgeStyle, catalogLabel } from '../catalogs'
import { locationName, measurement } from '../equipmentDisplay'
import type { EquipmentFilterOptions, EquipmentListResponse, EquipmentSummary } from '../types'

type EquipmentInventoryTableProps = {
  result: EquipmentListResponse | null
  isLoading: boolean
  options: EquipmentFilterOptions | null
  onOpenEquipment: (id: number) => void
  onChangePage: (page: number) => void
  mixedCategories?: boolean
  language?: Language
}

type Column = { header: string; cell: (equipment: EquipmentSummary) => ReactNode }

export function EquipmentInventoryTable({
  result, isLoading, options, onOpenEquipment, onChangePage, mixedCategories = false, language = 'fr',
}: EquipmentInventoryTableProps) {
  const catalogs = options?.catalogs

  const identifier: Column = {
    header: fr.equipment.number,
    cell: (equipment) => <><strong>{equipment.display_id}</strong><span className="secondary-cell">{equipment.asset_code}</span></>,
  }
  const brand: Column = { header: fr.equipment.brand, cell: (equipment) => equipment.brand ?? fr.common.notProvided }
  const model: Column = { header: fr.equipment.model, cell: (equipment) => equipment.model ?? fr.common.notProvided }
  const location: Column = { header: fr.equipment.locationShort, cell: locationName }

  const columns: Column[] = mixedCategories
    ? [
        identifier,
        {
          header: fr.equipment.category,
          cell: (equipment) => equipment.category.code === 'generator'
            ? fr.navigation.generators
            : isAssetCategoryCode(equipment.category.code)
              ? assetCategoryLabel(equipment.category.code, language)
              : equipment.category.name,
        },
        brand,
        model,
        {
          header: fr.equipment.condition,
          cell: (equipment) => equipment.condition
            ? <span className="status-badge" style={catalogBadgeStyle(catalogs, 'equipment_condition', equipment.condition)}>{catalogLabel(catalogs, 'equipment_condition', equipment.condition)}</span>
            : fr.common.notProvided,
        },
        location,
      ]
    : [
        identifier,
        brand,
        model,
        { header: fr.equipment.apparentPowerShort, cell: (equipment) => measurement(equipment.power?.apparent_kva, 'kVA') },
        { header: fr.equipment.serialNumber, cell: (equipment) => equipment.serial_number ?? fr.common.notProvided },
        {
          header: fr.equipment.fuel,
          cell: (equipment) => equipment.fuel_type
            ? <span className="status-badge" style={catalogBadgeStyle(catalogs, 'fuel_type', equipment.fuel_type)}>{catalogLabel(catalogs, 'fuel_type', equipment.fuel_type)}</span>
            : fr.common.notProvided,
        },
        {
          header: fr.equipment.condition,
          cell: (equipment) => (
            <span className={`status-badge status-${equipment.condition ?? 'unknown'}`} style={catalogBadgeStyle(catalogs, 'equipment_condition', equipment.condition)}>
              {equipment.condition ? catalogLabel(catalogs, 'equipment_condition', equipment.condition) : fr.common.notProvided}
            </span>
          ),
        },
        { header: fr.equipment.project, cell: (equipment) => equipment.current_project_assignment?.project.name ?? fr.common.notProvided },
        location,
      ]

  return <>
    <div className="equipment-table-wrap">
      <table className={`equipment-table${mixedCategories ? ' asset-inventory-table' : ''}`}>
        <thead>
          <tr>{columns.map((column) => <th key={column.header}>{column.header}</th>)}</tr>
        </thead>
        <tbody>
          {!isLoading && result?.data.map((equipment) => (
            <tr key={equipment.id} {...clickableRow(() => onOpenEquipment(equipment.id))}>
              {columns.map((column) => <td key={column.header}>{column.cell(equipment)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {isLoading && <div className="table-state"><LoadingSpinner label={fr.common.loading} /></div>}
      {!isLoading && result?.data.length === 0 && (
        <EmptyState
          title={mixedCategories ? fr.assets.noResults : fr.equipment.empty}
          description={mixedCategories
            ? t('Modifiez votre recherche ou vos filtres pour afficher d’autres actifs.')
            : t('Modifiez votre recherche ou vos filtres pour afficher d’autres générateurs.')}
        />
      )}
    </div>
    {result && <Pagination meta={result.meta} disabled={isLoading} onPageChange={onChangePage} />}
  </>
}
