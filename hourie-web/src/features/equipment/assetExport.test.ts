import { describe, expect, it } from 'vitest'
import { strFromU8, unzipSync } from 'fflate'
import { generalEquipmentCategoryCodes } from './assetCategories'
import { assetExportFields, buildAssetInventoryCsv, buildGeneratorInventoryWorkbook, defaultAssetExportFields, generatorsGroupedByProject } from './assetExport'
import type { CatalogOption, EquipmentSummary } from './types'

const car = {
  id: 1,
  display_id: '112',
  asset_code: 'A.H-VOI-112',
  category: { id: 1, code: 'car', name: 'Voitures' },
  brand: 'Renault',
  model: 'Duster',
  serial_number: 'VF1HJD202PA301098',
  registration_number: 'AB 123 CD',
  manufacture_year: 2023,
  purchase_date: null,
  supplier: 'SOCIDA',
  origin: 'Roumanie',
  asset_details: { fuel_type: 'Diesel', odometer_km: 12000 },
  condition: null,
  usage_status: null,
  current_location: null,
  current_project_assignment: null,
  custodian: { id: 2, name: 'Iyad Mroueh' },
  power: null,
  fuel_type: null,
} satisfies EquipmentSummary

describe('asset inventory export', () => {
  it('removes category and places equipment type immediately after the asset code', () => {
    const allFields = assetExportFields('all').map((field) => field.key)
    const pumpDefaults = defaultAssetExportFields('pumps_dewatering')

    expect(allFields).not.toContain('category')
    expect(allFields.indexOf('equipment_type')).toBe(allFields.indexOf('asset_code') + 1)
    expect(pumpDefaults).not.toContain('category')
    expect(pumpDefaults.indexOf('equipment_type')).toBe(pumpDefaults.indexOf('asset_code') + 1)
  })

  it('keeps the four requested car columns selected by default', () => {
    const fields = assetExportFields('car')
    const csv = buildAssetInventoryCsv([car], fields, defaultAssetExportFields('car'))

    expect(csv).toBe('\uFEFF"Marque";"Modèle";"Numéro de série";"Immatriculation"\r\n"Renault";"Duster";"VF1HJD202PA301098";"AB 123 CD"')
  })

  it('does not offer a duplicate responsible column for cars', () => {
    const fieldKeys = assetExportFields('car').map((field) => field.key)

    expect(fieldKeys).toContain('custodian')
    expect(fieldKeys).not.toContain('responsible')
  })

  it('offers category-specific technical fields', () => {
    const fields = assetExportFields('truck_dumper')
    expect(fields.map((field) => field.key)).toEqual(expect.arrayContaining(['vehicle_type', 'payload_tonnes', 'odometer_km']))
  })

  it.each(generalEquipmentCategoryCodes)('exports the shared technical details for %s', (categoryCode) => {
    const fields = assetExportFields(categoryCode)
    const keys = fields.map((field) => field.key)

    expect(keys).toEqual(expect.arrayContaining(['equipment_type', 'sub_category', 'counter_at_purchase', 'purchase_price', 'shipping_cost']))
    expect(defaultAssetExportFields(categoryCode)).toEqual(expect.arrayContaining(['equipment_type', 'sub_category']))

    const item = {
      ...car,
      category: { id: 10, code: categoryCode, name: categoryCode },
      asset_details: { equipment_type: 'Excavator', sub_category: 'Earth Moving' },
    } satisfies EquipmentSummary
    const csv = buildAssetInventoryCsv([item], fields, ['asset_code', 'equipment_type', 'sub_category'])

    expect(csv).toContain('"Excavator";"Earth Moving"')
  })

  it('offers generator power fields', () => {
    const fields = assetExportFields('generator')
    expect(fields.map((field) => field.key)).toEqual(expect.arrayContaining(['apparent_power_kva', 'active_power_kw', 'fuel_type']))
  })

  it('excludes unassigned generators and groups the others by project', () => {
    const generator = (displayId: string, project: string | null): EquipmentSummary => ({
      ...car,
      id: Number(displayId),
      display_id: displayId,
      asset_code: `A.H-GEN-${displayId}`,
      category: { id: 2, code: 'generator', name: 'Générateurs' },
      current_project_assignment: project
        ? { id: Number(displayId), project: { id: Number(displayId), name: project } }
        : null,
    })

    const grouped = generatorsGroupedByProject([
      generator('30', 'Vridi'),
      generator('20', null),
      generator('10', 'Bassam'),
      generator('2', 'Bassam'),
    ])

    expect(grouped.map((item) => [item.current_project_assignment?.project.name, item.display_id])).toEqual([
      ['Bassam', '2'],
      ['Bassam', '10'],
      ['Vridi', '30'],
    ])
  })

  it('builds a numbered generator workbook and colors condition cells', () => {
    const generator = (displayId: string, project: string | null, condition: string): EquipmentSummary => ({
      ...car,
      id: Number(displayId),
      display_id: displayId,
      asset_code: `A.H-GEN-${displayId}`,
      category: { id: 2, code: 'generator', name: 'Générateurs' },
      condition,
      current_project_assignment: project
        ? { id: Number(displayId), project: { id: Number(displayId), name: project } }
        : null,
    })
    const catalogs = [
      { id: 1, group: 'equipment_condition', code: 'good', label_fr: 'Bon', label_ar: 'جيد', color: '#4b8f68', is_active: true, sort_order: 1 },
      { id: 2, group: 'equipment_condition', code: 'defective', label_fr: 'Défectueux', label_ar: 'معطل', color: '#c27012', is_active: true, sort_order: 2 },
    ] satisfies CatalogOption[]
    const workbook = buildGeneratorInventoryWorkbook(
      [generator('10', 'Bassam', 'good'), generator('20', 'Vridi', 'defective'), generator('30', null, 'good')],
      assetExportFields('generator'),
      ['display_id', 'asset_code', 'condition', 'project'],
      'fr',
      catalogs,
    )
    const archive = unzipSync(workbook)
    const sheet = strFromU8(archive['xl/worksheets/sheet1.xml'])
    const styles = strFromU8(archive['xl/styles.xml'])
    const workbookDefinition = strFromU8(archive['xl/workbook.xml'])

    expect(sheet).toContain('<t xml:space="preserve">N°</t>')
    expect(sheet).toContain('<t xml:space="preserve">N° actif</t>')
    expect(sheet).toContain('<c r="A2" s="2"><v>1</v></c>')
    expect(sheet).toContain('<c r="A3" s="2"><v>2</v></c>')
    expect(sheet).not.toContain('A.H-GEN-30')
    expect(styles).toContain('FF4B8F68')
    expect(styles).toContain('FFC27012')
    expect(sheet).toContain('orientation="landscape" scale="75"')
    expect(sheet).toContain('<pageMargins left="0.25" right="0.25"')
    expect(workbookDefinition).toContain('_xlnm.Print_Area')
    expect(workbookDefinition).toContain('_xlnm.Print_Titles')
  })

  it('offers the shared supplier field for every asset category', () => {
    expect(assetExportFields('generator').map((field) => field.key)).toContain('supplier')
    expect(assetExportFields('car').map((field) => field.key)).toContain('supplier')
    expect(assetExportFields('equipment').map((field) => field.key)).toContain('supplier')
  })

  it('offers the shared origin field for every asset category', () => {
    expect(assetExportFields('generator').map((field) => field.key)).toContain('origin')
    expect(assetExportFields('car').map((field) => field.key)).toContain('origin')
    expect(assetExportFields('equipment').map((field) => field.key)).toContain('origin')
  })
})
