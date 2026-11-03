import { fr } from '../../../i18n/fr'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import type { EquipmentFilters } from '../types'

type DataQualityFilterChipsProps = {
  filters: EquipmentFilters
  onChange: (name: keyof EquipmentFilters, value: string) => void
}

const qualityFilters: Array<{
  key: keyof EquipmentFilters
  label: () => string
}> = [
  { key: 'without_invoice', label: () => fr.equipment.missingInvoice },
  { key: 'missing_serial', label: () => fr.equipment.missingSerial },
  { key: 'unassigned', label: () => fr.equipment.missingProject },
  { key: 'missing_usage_status', label: () => fr.equipment.missingUsageStatus },
]

export function DataQualityFilterChips({ filters, onChange }: DataQualityFilterChipsProps) {
  const activeFilters = qualityFilters.filter(({ key }) => filters[key] !== '')

  if (activeFilters.length === 0) return null

  return <div className="data-quality-filter-chips">
    <span>{fr.equipment.activeFilter}</span>
    <div>{activeFilters.map(({ key, label }) => <button key={key} type="button" onClick={() => onChange(key, '')}>
      {label()}
      <ActionIcon name="close" />
    </button>)}</div>
  </div>
}
