import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SitesPage } from './SitesPage'

const { getSites, getSite } = vi.hoisted(() => ({ getSites: vi.fn(), getSite: vi.fn() }))

vi.mock('../api', () => ({
  getSites,
  getSite,
  createSite: vi.fn(),
  updateSite: vi.fn(),
  deleteSite: vi.fn(),
}))

const sites = Array.from({ length: 11 }, (_, index) => ({
  id: index + 1,
  name: index === 0 ? 'Bassam' : `Site ${index + 1}`,
  code: index === 0 ? '815' : null,
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
  beforeEach(() => {
    getSite.mockResolvedValue(sites[0])
    getSites.mockImplementation((page: number, search: string) => {
      const filtered = search
        ? sites.filter((site) => `${site.name} ${site.address ?? ''}`.toLowerCase().includes(search.toLowerCase()))
        : sites
      const perPage = 10
      const data = filtered.slice((page - 1) * perPage, page * perPage)
      return Promise.resolve({
        data,
        meta: {
          current_page: page,
          from: data.length ? (page - 1) * perPage + 1 : null,
          last_page: Math.max(1, Math.ceil(filtered.length / perPage)),
          per_page: perPage,
          to: data.length ? (page - 1) * perPage + data.length : null,
          total: filtered.length,
        },
      })
    })
  })

  it('lists sites in a table, searches them, and paginates the result', async () => {
    const user = userEvent.setup()
    render(<SitesPage canAdd />)

    expect(await screen.findByText('Bassam')).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Site / projet' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Code analytique' })).toBeVisible()
    expect(screen.getByText('815')).toBeVisible()
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

  it('opens site details in a side panel and returns there after closing the editor', async () => {
    const user = userEvent.setup()
    render(<SitesPage canAdd />)

    await user.click(await screen.findByText('Bassam'))
    const detailPanel = await screen.findByRole('dialog', { name: 'Détail du site' })
    expect(detailPanel).toHaveClass('directory-site-detail-panel')

    await user.click(within(detailPanel).getByRole('button', { name: 'Modifier' }))
    const editor = screen.getByRole('dialog', { name: 'Modifier le site' })
    await user.click(within(editor).getByRole('button', { name: 'Fermer' }))

    expect(await screen.findByRole('dialog', { name: 'Détail du site' })).toBeVisible()
  })
})
