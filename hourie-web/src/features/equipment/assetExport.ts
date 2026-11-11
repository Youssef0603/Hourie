import type { Language } from '../../i18n/fr'
import { strToU8, zipSync } from 'fflate'
import { assetCategories, assetCategory, type AssetView } from './assetCategories'
import { catalogColor, catalogLabel } from './catalogs'
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
  if (view === 'car') return ['asset_code', 'brand', 'model', 'serial_number', 'registration_number']
  if (view === 'generator') return ['asset_code', 'display_id', 'brand', 'model', 'apparent_power_kva', 'active_power_kw', 'fuel_type', 'condition', 'usage_status', 'project', 'location']
  if (view === 'all') return ['asset_code', 'equipment_type', 'display_id', 'brand', 'model', 'serial_number', 'condition', 'usage_status', 'project', 'location']

  const category = assetCategory(view)
  const categoryColumns = (category?.columns ?? []).filter((field) => field !== 'equipment_type')
  const equipmentType = category?.fields.some((field) => field.key === 'equipment_type') ? ['equipment_type'] : []
  return ['asset_code', ...equipmentType, 'display_id', 'brand', 'model', 'serial_number', ...categoryColumns, 'condition', 'usage_status', 'project', 'location']
}

function orderedExportFields(
  availableFields: AssetExportField[],
  selectedFields: string[],
): AssetExportField[] {
  const fields = selectedFields
    .map((key) => availableFields.find((field) => field.key === key))
    .filter((field): field is AssetExportField => field !== undefined)
  const assetCode = fields.find((field) => field.key === 'asset_code')

  return assetCode ? [assetCode, ...fields.filter((field) => field.key !== 'asset_code')] : fields
}

export function assetExportFieldLabel(field: AssetExportField, language: Language): string {
  return language === 'ar' ? field.labelAr : field.labelFr
}

export function assetsGroupedByProject(items: EquipmentSummary[]): EquipmentSummary[] {
  return items
    .sort((left, right) => {
      const leftProject = left.current_project_assignment?.project.name?.trim() ?? ''
      const rightProject = right.current_project_assignment?.project.name?.trim() ?? ''

      if (!leftProject && rightProject) return 1
      if (leftProject && !rightProject) return -1

      const projectOrder = leftProject.localeCompare(rightProject, 'fr', { sensitivity: 'base' })

      if (projectOrder !== 0) return projectOrder

      return String(left.display_id).localeCompare(String(right.display_id), 'fr', {
        numeric: true,
        sensitivity: 'base',
      })
    })
}

export function generatorsGroupedByProject(items: EquipmentSummary[]): EquipmentSummary[] {
  return assetsGroupedByProject(items)
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
  const fields = orderedExportFields(availableFields, selectedFields)
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

function xmlCell(value: string | number | null | undefined, reference: string, style: number, numeric = false): string {
  if (numeric) return `<c r="${reference}" s="${style}"><v>${value}</v></c>`
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`
}

function xmlText(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function columnName(index: number): string {
  let result = ''
  let current = index + 1
  while (current > 0) {
    const remainder = (current - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    current = Math.floor((current - 1) / 26)
  }
  return result
}

function excelColor(color: string | undefined): string {
  const normalized = color?.match(/^#?([0-9a-f]{6})$/i)?.[1]
  return (normalized ?? '6B7280').toUpperCase()
}

function lightColor(color: string): string {
  const channels = color.match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16)) ?? [107, 114, 128]
  return channels.map((channel) => Math.round(255 - ((255 - channel) * 0.12)).toString(16).padStart(2, '0')).join('').toUpperCase()
}

function workbookStyles(conditionColors: string[]): string {
  const conditionFonts = conditionColors.map((color) => `<font><sz val="11"/><color rgb="FF${color}"/><name val="Aptos"/></font>`).join('')
  const conditionFills = conditionColors.map((color) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${lightColor(color)}"/><bgColor indexed="64"/></patternFill></fill>`).join('')
  const conditionFormats = conditionColors.map((_, index) => `<xf numFmtId="0" fontId="${index + 2}" fillId="${index + 3}" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>`).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="${conditionColors.length + 2}"><font><sz val="11"/><color theme="1"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>${conditionFonts}</fonts>
  <fills count="${conditionColors.length + 3}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF19243A"/><bgColor indexed="64"/></patternFill></fill>${conditionFills}</fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9DDE5"/></left><right style="thin"><color rgb="FFD9DDE5"/></right><top style="thin"><color rgb="FFD9DDE5"/></top><bottom style="thin"><color rgb="FFD9DDE5"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="${conditionColors.length + 4}"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>${conditionFormats}</cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`
}

function excelSheetName(title: string): string {
  const cleaned = title.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31)
  return cleaned || 'Inventaire'
}

function excelFormulaSheetName(name: string): string {
  return `'${name.replaceAll("'", "''")}'`
}

export function buildAssetInventoryWorkbook(
  items: EquipmentSummary[],
  availableFields: AssetExportField[],
  selectedFields: string[],
  language: Language = 'fr',
  title = language === 'ar' ? 'جرد المعدات' : 'Inventaire des équipements',
  catalogs: CatalogOption[] = [],
): Uint8Array {
  const groupedAssets = assetsGroupedByProject(items)
  const fields = orderedExportFields(availableFields, selectedFields)
  const conditionCodes = [...new Set(groupedAssets.map((item) => item.condition).filter((condition): condition is string => Boolean(condition)))]
  const conditionColors = conditionCodes.map((code) => excelColor(catalogColor(catalogs, 'equipment_condition', code)))
  const conditionStyles = new Map(conditionCodes.map((code, index) => [code, index + 4]))
  const headers = [language === 'ar' ? 'م' : 'N°', ...fields.map((field) => field.key === 'display_id'
    ? (language === 'ar' ? 'رقم الأصل' : 'N° actif')
    : assetExportFieldLabel(field, language))]
  const values = groupedAssets.map((item) => fields.map((field) => field.value(item, catalogs)))
  const widths = headers.map((header, columnIndex) => {
    const maxLength = Math.max(header.length, ...values.map((row) => String(row[columnIndex - 1] ?? '').length))
    const field = fields[columnIndex - 1]
    const minimumWidth = columnIndex === 0 ? 6 : field?.key === 'serial_number' ? 32 : 12
    const padding = field?.key === 'serial_number' ? 6 : 2
    return Math.min(Math.max(maxLength + padding, minimumWidth), field?.key === 'serial_number' ? 50 : 38)
  })
  const columns = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')
  const headerCells = headers.map((header, index) => xmlCell(header, `${columnName(index)}2`, 1)).join('')
  const rows = groupedAssets.map((item, rowIndex) => {
    const excelRow = rowIndex + 3
    const cells = fields.map((field, fieldIndex) => {
      const style = field.key === 'condition' && item.condition ? conditionStyles.get(item.condition) ?? 3 : 3
      return xmlCell(field.value(item, catalogs), `${columnName(fieldIndex + 1)}${excelRow}`, style)
    }).join('')
    return `<row r="${excelRow}" ht="22" customHeight="1">${xmlCell(rowIndex + 1, `A${excelRow}`, 2, true)}${cells}</row>`
  }).join('')
  const lastColumn = columnName(headers.length - 1)
  const lastRow = groupedAssets.length + 2
  const sheetName = excelSheetName(title)
  const formulaSheetName = excelFormulaSheetName(sheetName)
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${columns}</cols><sheetData><row r="1" ht="30" customHeight="1">${xmlCell(title, 'A1', 1)}</row><row r="2" ht="24" customHeight="1">${headerCells}</row>${rows}</sheetData><mergeCells count="1"><mergeCell ref="A1:${lastColumn}1"/></mergeCells><autoFilter ref="A2:${lastColumn}${lastRow}"/><printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.35" bottom="0.35" header="0.15" footer="0.15"/><pageSetup paperSize="9" orientation="landscape" scale="75" fitToWidth="0" fitToHeight="0" horizontalDpi="300" verticalDpi="300"/></worksheet>`
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlText(sheetName)}" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">${formulaSheetName}!$A$1:$${lastColumn}$${lastRow}</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">${formulaSheetName}!$1:$2</definedName></definedNames></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    'xl/styles.xml': strToU8(workbookStyles(conditionColors)),
    'xl/worksheets/sheet1.xml': strToU8(sheet),
  }
  return zipSync(files, { level: 6 })
}

export function buildGeneratorInventoryWorkbook(
  items: EquipmentSummary[],
  availableFields: AssetExportField[],
  selectedFields: string[],
  language: Language = 'fr',
  catalogs: CatalogOption[] = [],
): Uint8Array {
  return buildAssetInventoryWorkbook(
    items,
    availableFields,
    selectedFields,
    language,
    language === 'ar' ? 'المولدات' : 'Générateurs',
    catalogs,
  )
}

export function downloadAssetInventoryExcel(
  items: EquipmentSummary[],
  availableFields: AssetExportField[],
  selectedFields: string[],
  language: Language,
  filename: string,
  title: string,
  catalogs: CatalogOption[] = [],
): void {
  const workbook = buildAssetInventoryWorkbook(items, availableFields, selectedFields, language, title, catalogs)
  const blob = new Blob([workbook as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0)
}

export function downloadGeneratorInventoryExcel(
  items: EquipmentSummary[],
  availableFields: AssetExportField[],
  selectedFields: string[],
  language: Language,
  filename: string,
  catalogs: CatalogOption[] = [],
): void {
  downloadAssetInventoryExcel(
    items,
    availableFields,
    selectedFields,
    language,
    filename,
    language === 'ar' ? 'المولدات' : 'Générateurs',
    catalogs,
  )
}
