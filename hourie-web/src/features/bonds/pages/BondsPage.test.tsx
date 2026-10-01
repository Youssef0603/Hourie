import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BondsPage } from './BondsPage'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('../../../shared/api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/api/http')>()),
  apiRequest,
}))

const bonds = [
  {
    id: 1,
    bond_type: 'advance_payment',
    issuer: 'SGCI',
    amount: '562141072',
    currency: 'XOF',
    issued_on: '2026-03-06',
    expires_on: '2026-12-31',
    notes: null,
    project: { id: 1, name: 'Bassam', locations: [] },
    location: { id: 10, name: 'Lot 1' },
    documents: [],
    created_at: '2026-03-06T00:00:00Z',
  },
  {
    id: 2,
    bond_type: 'performance',
    issuer: 'BICICI',
    amount: '148271419',
    currency: 'XOF',
    issued_on: '2026-03-06',
    expires_on: '2026-12-31',
    notes: null,
    project: { id: 2, name: 'Yopougon', locations: [] },
    location: { id: 20, name: 'Centrale' },
    documents: [],
    created_at: '2026-03-06T00:00:00Z',
  },
]

describe('BondsPage', () => {
  beforeEach(() => {
    apiRequest.mockImplementation((path: string) =>
      Promise.resolve({ data: path === '/api/v1/bonds' ? bonds : [] }),
    )
  })

  it('loads guarantees and filters the table without losing their site or physical location', async () => {
    const user = userEvent.setup()
    render(<BondsPage />)

    expect(await screen.findByText('Bassam')).toBeVisible()
    expect(screen.getByText('Lot 1')).toBeVisible()
    expect(screen.getByText('Yopougon')).toBeVisible()

    await user.type(screen.getByRole('searchbox', { name: 'Rechercher' }), 'Centrale')

    await waitFor(() => {
      expect(screen.queryByText('Bassam')).not.toBeInTheDocument()
      expect(screen.getByText('Yopougon')).toBeVisible()
      expect(screen.getByText('Centrale')).toBeVisible()
    })
  })
})
