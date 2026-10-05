import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InsurancePage } from './InsurancePage'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('../../../shared/api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/api/http')>()),
  apiRequest,
}))

const policies = [
  {
    id: 1, insurance_type: 'trc_rc', policy_number: 'TRC-2027', source: 'GNA-CI',
    starts_on: '2027-01-01', ends_on: '2027-12-31', total_amount: '1000000',
    net_premium: null, accessories_amount: null, tax_amount: null, territory: null,
    insured_situation: null, notes: null, project: { id: 1, name: 'Bassam' }, documents: [],
  },
  {
    id: 2, insurance_type: 'equipment', policy_number: 'EQ-2027', source: 'NSIA',
    starts_on: '2027-01-01', ends_on: '2027-12-31', total_amount: '2000000',
    net_premium: null, accessories_amount: null, tax_amount: null, territory: null,
    insured_situation: null, notes: null, documents: [],
    equipment: [{ id: 5, asset_code: 'GEN-005', brand: 'Perkins', model: '250 KVA' }],
  },
]

describe('InsurancePage', () => {
  beforeEach(() => {
    apiRequest.mockImplementation((path: string) => Promise.resolve({
      data: path === '/api/v1/insurance-policies' ? policies : path === '/api/v1/sites' ? [{ id: 1, name: 'Bassam' }] : [],
    }))
  })

  it('filters policies by category and searches covered equipment', async () => {
    const user = userEvent.setup()
    render(<InsurancePage />)

    expect(await screen.findByText('TRC-2027')).toBeVisible()
    expect(screen.getByText('EQ-2027')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /Équipements1/ }))
    await waitFor(() => {
      expect(screen.getByText('EQ-2027')).toBeVisible()
      expect(screen.queryByText('TRC-2027')).not.toBeInTheDocument()
    })

    await user.type(screen.getByRole('searchbox', { name: 'Rechercher' }), 'Perkins')
    expect(screen.getByText('EQ-2027')).toBeVisible()

    await user.clear(screen.getByRole('searchbox', { name: 'Rechercher' }))
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher' }), 'inexistant')
    expect(await screen.findByText('Aucune police trouvée')).toBeVisible()
  })
})
