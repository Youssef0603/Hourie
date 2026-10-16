import { describe, expect, it } from 'vitest'
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
  asset_details: { fuel_type: 'Diesel', odometer_km: 12000 },
  condition: null,
  operational_situation: null,
  current_location: null,
  current_project_assignment: null,
  custodian: { id: 2, name: 'Iyad Mroueh' },
  responsible: null,
  responsible_source: null,
  power: null,
  fuel_type: null,
} satisfies EquipmentSummary

describe('asset inventory export', () => {
  it('keeps the four requested car columns selected by default', () => {
    const fields = assetExportFields('car')
    const csv = buildAssetInventoryCsv([car], fields, defaultAssetExportFields('car'))

    expect(csv).toBe('\uFEFF"Marque";"Modèle";"Numéro de série";"Immatriculation"\r\n"Renault";"Duster";"VF1HJD202PA301098";"AB 123 CD"')
  })

  it('offers category-specific technical fields', () => {
    const fields = assetExportFields('truck_dumper')
    expect(fields.map((field) => field.key)).toEqual(expect.arrayContaining(['vehicle_type', 'payload_tonnes', 'odometer_km']))
  })

  it('offers generator power fields', () => {
    const fields = assetExportFields('generator')
    expect(fields.map((field) => field.key)).toEqual(expect.arrayContaining(['apparent_power_kva', 'active_power_kw', 'fuel_type']))
  })
})
