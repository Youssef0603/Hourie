import type { Language } from '../../i18n/fr'
import { assetCategories, assetCategory, type AssetView } from './assetCategories'
import { catalogLabel } from './catalogs'
import type { CatalogOption, EquipmentSummary } from './types'

export type AssetExportField = {
  key: string
  labelFr: string
  labelAr: string
  value: (item: EquipmentSummary, catalogs: CatalogOption[]) => string | number | null | undefined
}

function physicalLocation(item: EquipmentSummary): string {
  if (!item.current_location) return ''

  return item.current_location.parent
    ? `${item.current_location.parent.name} / ${item.current_location.name}`
    : item.current_location.name
}

const commonFields: AssetExportField[] = [
  { key: 'display_id', labelFr: 'N°', labelAr: 'الرقم', value: (item) => item.display_id },
  { key: 'asset_code', labelFr: 'Code actif', labelAr: 'رمز الأصل', value: (item) => item.asset_code },
  { key: 'brand', labelFr: 'Marque', labelAr: 'العلامة التجارية', value: (item) => item.brand },
  { key: 'model', labelFr: 'Modèle', labelAr: 'الطراز', value: (item) => item.model },
  { key: 'serial_number', labelFr: 'Numéro de série', labelAr: 'الرقم التسلسلي', value: (item) => item.serial_number },
  { key: 'registration_number', labelFr: 'Immatriculation', labelAr: 'رقم التسجيل', value: (item) => item.registration_number },
  { key: 'manufacture_year', labelFr: 'Année de fabrication', labelAr: 'سنة الصنع', value: (item) => item.manufacture_year },
  { key: 'purchase_date', labelFr: 'Date d’achat', labelAr: 'تاريخ الشراء', value: (item) => item.purchase_date },
  { key: 'supplier', labelFr: 'Fournisseur', labelAr: 'المورّد', value: (item) => item.supplier },
  { key: 'origin', labelFr: 'Origine', labelAr: 'المنشأ', value: (item) => item.origin },
  { key: 'condition', labelFr: 'État', labelAr: 'الحالة', value: (item, catalogs) => catalogLabel(catalogs, 'equipment_condition', item.condition) },
  { key: 'usage_status', labelFr: 'Utilisation actuelle', labelAr: 'الاستخدام الحالي', value: (item) => item.usage_status === 'in_use' ? 'En utilisation' : item.usage_status === 'not_in_use' ? 'Non utilisé' : '' },
  { key: 'project', labelFr: 'Chantier', labelAr: 'الموقع / المشروع', value: (item) => item.current_project_assignment?.project.name },
  { key: 'location', labelFr: 'Localisation physique', labelAr: 'الموقع الفعلي', value: (item) => physicalLocation(item) },
  { key: 'custodian', labelFr: 'Responsable / conducteur', labelAr: 'المسؤول / السائق', value: (item) => item.custodian?.name },
]

const generatorFields: AssetExportField[] = [
  { key: 'apparent_power_kva', labelFr: 'Puissance apparente (kVA)', labelAr: 'القدرة الظاهرية (ك.ف.أ)', value: (item) => item.power?.apparent_kva },
  { key: 'active_power_kw', labelFr: 'Puissance active (kW)', labelAr: 'القدرة الفعلية (ك.و)', value: (item) => item.power?.active_kw },
  { key: 'fuel_type', labelFr: 'Carburant', labelAr: 'الوقود', value: (item, catalogs) => catalogLabel(catalogs, 'fuel_type', item.fuel_type) },
]

function technicalFields(view: AssetView): AssetExportField[] {
  const definitions = view === 'all'
    ? assetCategories.flatMap((category) => category.fields)
    : view === 'generator'
      ? []
      : assetCategory(view)?.fields ?? []

  const unique = new Map<string, AssetExportField>()
  definitions.forEach((field) => {
    if (unique.has(field.key)) return
    unique.set(field.key, {
      key: field.key,
      labelFr: field.labelFr,
      labelAr: field.labelAr,
      value: (item, catalogs) => field.key === 'fuel_type'
        ? catalogLabel(catalogs, 'fuel_type', (item.asset_details?.[field.key] as string | null | undefined) ?? null)
        : item.asset_details?.[field.key],
    })
  })
  return [...unique.values()]
}

export function assetExportFields(view: AssetView): AssetExportField[] {
  const commonExportFields = view === 'car'
    ? commonFields.filter((field) => field.key !== 'responsible')
    : commonFields
  const categoryTechnicalFields = technicalFields(view)
  const equipmentTypeField = categoryTechnicalFields.find((field) => field.key === 'equipment_type')
  const orderedCommonFields = commonExportFields.flatMap((field) => field.key === 'asset_code' && equipmentTypeField
    ? [field, equipmentTypeField]
    : [field])
  const fields = [
    ...orderedCommonFields,
    ...(view === 'all' || view === 'generator' ? generatorFields : []),
    ...categoryTechnicalFields.filter((field) => field.key !== 'equipment_type'),
  ]
  const unique = new Map(fields.map((field) => [field.key, field]))
  return [...unique.values()]
}

export function defaultAssetExportFields(view: AssetView): string[] {
  if (view === 'car') return ['brand', 'model', 'serial_number', 'registration_number']
  if (view === 'generator') return ['display_id', 'asset_code', 'brand', 'model', 'apparent_power_kva', 'active_power_kw', 'fuel_type', 'condition', 'usage_status', 'project', 'location']
  if (view === 'all') return ['display_id', 'asset_code', 'equipment_type', 'brand', 'model', 'serial_number', 'condition', 'usage_status', 'project', 'location']

  const category = assetCategory(view)
  const categoryColumns = (category?.columns ?? []).filter((field) => field !== 'equipment_type')
  const equipmentType = category?.fields.some((field) => field.key === 'equipment_type') ? ['equipment_type'] : []
  return ['display_id', 'asset_code', ...equipmentType, 'brand', 'model', 'serial_number', ...categoryColumns, 'condition', 'usage_status', 'project', 'location']
}

export function assetExportFieldLabel(field: AssetExportField, language: Language): string {
  return language === 'ar' ? field.labelAr : field.labelFr
}

function csvCell(value: string | number | null | undefined): string {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

export function buildAssetInventoryCsv(
  items: EquipmentSummary[],
  availableFields: AssetExportField[],
  selectedFields: string[],
  language: Language = 'fr',
  catalogs: CatalogOption[] = [],
): string {
  const fields = selectedFields
    .map((key) => availableFields.find((field) => field.key === key))
    .filter((field): field is AssetExportField => field !== undefined)
  const rows = items.map((item) => fields.map((field) => field.value(item, catalogs)))

  return `\uFEFF${[
    fields.map((field) => assetExportFieldLabel(field, language)),
    ...rows,
  ].map((row) => row.map(csvCell).join(';')).join('\r\n')}`
}

export function downloadAssetInventoryCsv(
  items: EquipmentSummary[],
  availableFields: AssetExportField[],
  selectedFields: string[],
  language: Language,
  filename: string,
  catalogs: CatalogOption[] = [],
): void {
  const blob = new Blob([buildAssetInventoryCsv(items, availableFields, selectedFields, language, catalogs)], { type: 'text/csv;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0)
}
