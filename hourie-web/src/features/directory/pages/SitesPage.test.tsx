import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SitesPage } from './SitesPage'

const { getSites } = vi.hoisted(() => ({ getSites: vi.fn() }))

vi.mock('../api', () => ({
  getSites,
  getSite: vi.fn(),
  createSite: vi.fn(),
  updateSite: vi.fn(),
  deleteSite: vi.fn(),
}))

const sites = Array.from({ length: 11 }, (_, index) => ({
  id: index + 1,
  name: index === 0 ? 'Bassam' : `Site ${index + 1}`,
  status: 'active',
  address: index === 0 ? 'Bassam, Lot 1' : null,
  start_date: '2026-01-01',
  expected_end_date: '2026-12-31',
  notes: null,
  responsible: index === 0 ? { id: 1, name: 'Youssef Yassine' } : null,
  is_active: true,
  active_equipment_count: index,
  locations: [],
  changes: [],
}))

describe('SitesPage', () => {
  beforeEach(() => getSites.mockResolvedValue(sites))

  it('lists sites in a table, searches them, and paginates the result', async () => {
    const user = userEvent.setup()
    render(<SitesPage canAdd />)

    expect(await screen.findByText('Bassam')).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Site / projet' })).toBeVisible()
    expect(screen.queryByText('Site 11')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(await screen.findByText('Site 11')).toBeVisible()

    await user.clear(screen.getByRole('searchbox', { name: 'Recherche' }))
    await user.type(screen.getByRole('searchbox', { name: 'Recherche' }), 'Lot 1')
    await waitFor(() => {
      expect(screen.getByText('Bassam')).toBeVisible()
      expect(screen.queryByText('Site 11')).not.toBeInTheDocument()
    })
  })

  it('keeps the add-site action in the table toolbar', async () => {
    render(<SitesPage canAdd />)
    await screen.findByText('Bassam')

    expect(screen.getByRole('button', { name: 'Ajouter un site' })).toBeVisible()
  })
})
