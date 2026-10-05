import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AddGeneratorForm } from './AddGeneratorForm'

vi.mock('../api', () => ({
  createEquipment: vi.fn(),
  uploadEquipmentImages: vi.fn(),
  uploadEquipmentInvoices: vi.fn(),
}))

describe('AddGeneratorForm', () => {
  it('shows the required buyer field when the configured condition is Vendu', () => {
    render(<AddGeneratorForm onCreated={vi.fn()} options={{
      categories: [], projects: [], locations: [], employees: [], fuel_types: [], asset_filter_values: {},
      catalogs: [{ id: 1, group: 'equipment_condition', code: 'custom_sale', label_fr: 'Vendu', label_ar: null, color: '#A41831', sort_order: 1, is_active: true }],
    }} />)

    expect(screen.getByLabelText('Acheteur *')).toBeRequired()
    expect(screen.getByPlaceholderText('Nom de l’acheteur')).toBeVisible()
  })
})
