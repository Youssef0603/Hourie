import { fr, type Language } from '../../../i18n/fr'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { EmptyState } from '../../../shared/components/EmptyState'
import { assetCategoryLabel, isAssetCategoryCode } from '../assetCategories'
import { catalogBadgeStyle, catalogLabel } from '../catalogs'
import { locationName, measurement } from '../equipmentDisplay'
import type { EquipmentFilterOptions, EquipmentListResponse } from '../types'

type EquipmentInventoryTableProps = {
  result: EquipmentListResponse | null
  isLoading: boolean
  options: EquipmentFilterOptions | null
  onOpenEquipment: (id: number) => void
  onChangePage: (page: number) => void
  mixedCategories?: boolean
  language?: Language
}

export function EquipmentInventoryTable({
  result, isLoading, options, onOpenEquipment, onChangePage, mixedCategories = false, language = 'fr',
}: EquipmentInventoryTableProps) {
  if (mixedCategories) {
    return <>
      <div className="equipment-table-wrap">
        <table className="equipment-table asset-inventory-table">
          <thead><tr>
            <th>{fr.equipment.number}</th>
            <th>{fr.equipment.category}</th>
            <th>{fr.equipment.brand}</th>
            <th>{fr.equipment.model}</th>
            <th>{fr.equipment.condition}</th>
            <th>{fr.equipment.locationShort}</th>
          </tr></thead>
          <tbody>{!isLoading && result?.data.map((equipment) => <tr
            key={equipment.id}
            tabIndex={0}
            onClick={() => onOpenEquipment(equipment.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpenEquipment(equipment.id)
              }
            }}
          >
            <td><strong>{equipment.display_id}</strong><span className="secondary-cell">{equipment.asset_code}</span></td>
            <td>{equipment.category.code === 'generator' ? fr.navigation.generators : isAssetCategoryCode(equipment.category.code) ? assetCategoryLabel(equipment.category.code, language) : equipment.category.name}</td>
            <td>{equipment.brand ?? fr.common.notProvided}</td>
            <td>{equipment.model ?? fr.common.notProvided}</td>
            <td>{equipment.condition ? <span className="status-badge" style={catalogBadgeStyle(options?.catalogs, 'equipment_condition', equipment.condition)}>{catalogLabel(options?.catalogs, 'equipment_condition', equipment.condition)}</span> : fr.common.notProvided}</td>
            <td>{locationName(equipment)}</td>
          </tr>)}</tbody>
        </table>
        {isLoading && <div className="table-state"><LoadingSpinner label={fr.common.loading} /></div>}
        {!isLoading && result?.data.length === 0 && <EmptyState title={fr.assets.noResults} description="Modifiez votre recherche ou vos filtres pour afficher d’autres actifs." />}
      </div>
      {result && result.meta.last_page > 1 && <nav className="pagination" aria-label={fr.equipment.pagination}><span>{fr.equipment.results(result.meta.from, result.meta.to, result.meta.total)}</span><div><button type="button" disabled={result.meta.current_page === 1 || isLoading} onClick={() => onChangePage(result.meta.current_page - 1)}>{fr.common.previous}</button><span>{fr.equipment.page(result.meta.current_page, result.meta.last_page)}</span><button type="button" disabled={result.meta.current_page === result.meta.last_page || isLoading} onClick={() => onChangePage(result.meta.current_page + 1)}>{fr.common.next}</button></div></nav>}
    </>
  }

  return <>
          <div className="equipment-table-wrap">
            <table className="equipment-table">
              <thead>
                <tr>
                  <th>{fr.equipment.number}</th>
                  <th>{fr.equipment.brand}</th>
                  <th>{fr.equipment.model}</th>
                  <th>{fr.equipment.apparentPowerShort}</th>
                  <th>{fr.equipment.activePowerShort}</th>
                  <th>{fr.equipment.fuel}</th>
                  <th>{fr.equipment.condition}</th>
                  <th>{fr.equipment.project}</th>
                  <th>{fr.equipment.locationShort}</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && result?.data.map((equipment) => (
                  <tr
                    key={equipment.id}
                    tabIndex={0}
                    onClick={() => onOpenEquipment(equipment.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onOpenEquipment(equipment.id)
                      }
                    }}
                  >
                    <td><strong>{equipment.display_id}</strong><span className="secondary-cell">{equipment.asset_code}</span></td>
                    <td>{equipment.brand ?? fr.common.notProvided}</td>
                    <td>{equipment.model ?? fr.common.notProvided}</td>
                    <td>{measurement(equipment.power?.apparent_kva, 'kVA')}</td>
                    <td>{measurement(equipment.power?.active_kw, 'kW')}</td>
                    <td>{equipment.fuel_type ? <span className="status-badge" style={catalogBadgeStyle(options?.catalogs, 'fuel_type', equipment.fuel_type)}>{catalogLabel(options?.catalogs, 'fuel_type', equipment.fuel_type)}</span> : fr.common.notProvided}</td>
                    <td>
                      <span className={`status-badge status-${equipment.condition ?? 'unknown'}`} style={catalogBadgeStyle(options?.catalogs, 'equipment_condition', equipment.condition)}>
                        {equipment.condition ? catalogLabel(options?.catalogs, 'equipment_condition', equipment.condition) : fr.common.notProvided}
                      </span>
                    </td>
                    <td>{equipment.current_project_assignment?.project.name ?? fr.common.notProvided}</td>
                    <td>{locationName(equipment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isLoading && <div className="table-state"><LoadingSpinner label={fr.common.loading} /></div>}
            {!isLoading && result?.data.length === 0 && <EmptyState title={fr.equipment.empty} description="Modifiez votre recherche ou vos filtres pour afficher d’autres générateurs." />}
          </div>

          {result && result.meta.last_page > 1 && (
            <nav className="pagination" aria-label={fr.equipment.pagination}>
              <span>
                {fr.equipment.results(result.meta.from, result.meta.to, result.meta.total)}
              </span>
              <div>
                <button
                  type="button"
                  disabled={result.meta.current_page === 1 || isLoading}
                  onClick={() => onChangePage(result.meta.current_page - 1)}
                >
                  {fr.common.previous}
                </button>
                <span>{fr.equipment.page(result.meta.current_page, result.meta.last_page)}</span>
                <button
                  type="button"
                  disabled={result.meta.current_page === result.meta.last_page || isLoading}
                  onClick={() => onChangePage(result.meta.current_page + 1)}
                >
                  {fr.common.next}
                </button>
              </div>
            </nav>
          )}
  </>
}
