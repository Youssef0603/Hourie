import { describe, expect, it } from 'vitest'
import { generalEquipmentCategoryCodes } from './assetCategories'
import { assetExportFields, buildAssetInventoryCsv, defaultAssetExportFields } from './assetExport'
import type { EquipmentSummary } from './types'

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
