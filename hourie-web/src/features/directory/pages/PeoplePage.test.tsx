import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PeoplePage } from './PeoplePage'

const { getEmployees, getEmployee } = vi.hoisted(() => ({
  getEmployees: vi.fn(),
  getEmployee: vi.fn(),
}))

vi.mock('../api', () => ({
  getEmployees,
  getEmployee,
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
}))

const people = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  name: index === 0 ? 'Youssef Yassine' : `Employé ${index + 1}`,
  job_title: index === 0 ? 'software_engineer' : 'civil_engineer',
  email: index === 0 ? 'youssef@hourie.ci' : null,
  phone_number: index === 0 ? '+225 07 00 00 00 00' : null,
  passport_number: null,
  employment_date: '2026-01-15',
  birth_date: null,
  is_active: index !== 2,
  equipment_in_custody_count: 0,
  current_project: index === 0 ? { id: 1, name: 'Abidjan Tower' } : null,
  current_company_location: index === 1 ? { id: 16, name: 'BUREAU' } : null,
  user: index === 0
    ? { id: 1, username: 'youssef', email: 'youssef@hourie.ci', role: 'manager' as const }
    : index === 1
      ? { id: 2, username: 'viewer', email: 'viewer@hourie.ci', role: 'viewer' as const }
      : null,
}))

const catalogs = [
  { id: 1, group: 'employee_job_title' as const, code: 'software_engineer', label_fr: 'Ingénieur logiciel', label_ar: null, color: null, sort_order: 1, is_active: true },
  { id: 2, group: 'employee_job_title' as const, code: 'civil_engineer', label_fr: 'Ingénieur civil', label_ar: null, color: null, sort_order: 2, is_active: true },
]

describe('PeoplePage', () => {
  beforeEach(() => {
    getEmployees.mockImplementation((page: number, filters: Record<string, string>) => {
      let filtered = people
      if (filters.search) {
        const term = filters.search.toLowerCase()
        filtered = filtered.filter((person) => `${person.name} ${person.email ?? ''}`.toLowerCase().includes(term))
      }
      if (filters.access === 'with_access') filtered = filtered.filter((person) => person.user !== null)
      if (filters.access === 'without_access') filtered = filtered.filter((person) => person.user === null)
      if (filters.project_id) filtered = filtered.filter((person) => String(person.current_project?.id) === filters.project_id)
      if (filters.company_location_id) filtered = filtered.filter((person) => String(person.current_company_location?.id) === filters.company_location_id)
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
    getEmployee.mockResolvedValue({
      ...people[0],
      equipment_in_custody: [],
      assigned_sites: [],
      project_assignments: [],
      health_insurance_policies: [],
    })
  })

  it('shows people in a paginated table and searches by e-mail', async () => {
    const user = userEvent.setup()
    render(<PeoplePage canAdd catalogs={catalogs} />)

    expect(await screen.findByText('Youssef Yassine')).toBeVisible()
    expect(screen.getByText('12 personnes enregistrées')).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Affectation' })).toBeVisible()
    expect(screen.queryByRole('columnheader', { name: 'E-mail' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Accès' })).not.toBeInTheDocument()
    expect(screen.getByText('Abidjan Tower')).toBeVisible()
    expect(screen.getByText('Ingénieur logiciel')).toBeVisible()
    expect(screen.queryByText('Employé 12')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(await screen.findByText('Employé 12')).toBeVisible()

    await user.clear(screen.getByRole('searchbox', { name: 'Recherche' }))
    await user.type(screen.getByRole('searchbox', { name: 'Recherche' }), 'youssef@hourie.ci')
    await waitFor(() => expect(screen.getByText('Youssef Yassine')).toBeVisible())
    expect(screen.queryByText('Employé 12')).not.toBeInTheDocument()
  })

  it('filters people by system access and opens a selected person', async () => {
    const user = userEvent.setup()
    render(<PeoplePage canAdd catalogs={catalogs} />)

    await screen.findByText('Youssef Yassine')
    await user.click(screen.getByRole('button', { name: 'Filtres' }))
    await user.click(screen.getByLabelText('Accès au système'))
    await user.click(screen.getByText('Avec accès'))

    await waitFor(() => {
      expect(screen.getByText('Youssef Yassine')).toBeVisible()
      expect(screen.getByText('Employé 2')).toBeVisible()
      expect(screen.queryByText('Employé 3')).not.toBeInTheDocument()
    })

    await user.click(screen.getByText('Youssef Yassine'))
    const detailPanel = await screen.findByRole('dialog', { name: 'Fiche personne' })
    expect(detailPanel).toBeVisible()
    expect(detailPanel).toHaveClass('directory-person-detail-panel')
    expect(within(detailPanel).getByText('Équipements attribués')).toBeVisible()
    expect(within(detailPanel).getByText('Aucun équipement attribué.')).toBeVisible()
    expect(within(detailPanel).queryByText('Voir les actifs assignés')).not.toBeInTheDocument()
    expect(getEmployee).toHaveBeenCalledWith(1)
  })

  it('filters people by site and company location', async () => {
    const user = userEvent.setup()
    render(
      <PeoplePage
        canAdd
        catalogs={catalogs}
        projects={[{ id: 1, name: 'Abidjan Tower' }]}
        companyLocations={[{ id: 16, name: 'BUREAU' }]}
      />,
    )

    await screen.findByText('Youssef Yassine')
    await user.click(screen.getByRole('button', { name: 'Filtres' }))
    await user.click(screen.getByLabelText('Site / projet'))
    await user.click(screen.getByRole('option', { name: 'Abidjan Tower' }))

    await waitFor(() => expect(getEmployees).toHaveBeenLastCalledWith(1, { project_id: '1' }))

    await user.click(screen.getByLabelText('Localisation physique'))
    await user.click(screen.getByRole('option', { name: 'BUREAU' }))

    await waitFor(() => expect(getEmployees).toHaveBeenLastCalledWith(1, { company_location_id: '16' }))
  })

  it('returns to person details when editing is cancelled', async () => {
    const user = userEvent.setup()
    render(
      <PeoplePage
        canAdd
        canManageManagerAccounts
        catalogs={catalogs}
      />,
    )

    await user.click(await screen.findByText('Youssef Yassine'))
    const details = await screen.findByRole('dialog', { name: 'Fiche personne' })
    await user.click(within(details).getByRole('button', { name: 'Modifier' }))

    const editor = screen.getByRole('dialog', { name: 'Modifier la personne' })
    await user.click(within(editor).getByRole('button', { name: 'Fermer' }))

    expect(await screen.findByRole('dialog', { name: 'Fiche personne' })).toBeVisible()
  })

  it('shows assigned equipment as compact clickable rows instead of a nested table', async () => {
    getEmployee.mockResolvedValueOnce({
      ...people[0],
      equipment_in_custody: [{
        id: 74,
        display_id: '074',
        asset_code: 'A.H-VOI-074',
        category: { id: 1, code: 'car', name: 'Voiture' },
        brand: 'Toyota',
        model: 'Land cruiser',
        serial_number: null,
        registration_number: '4846 GF 01',
        manufacture_year: 2007,
        purchase_date: null,
        asset_details: null,
        condition: 'very_good',
        current_location: null,
        current_project_assignment: null,
        custodian: { id: 1, name: 'Youssef Yassine' },
        responsible: { id: 1, name: 'Youssef Yassine' },
        responsible_source: 'asset',
        power: null,
        fuel_type: null,
      }],
      assigned_sites: [],
      project_assignments: [],
      health_insurance_policies: [],
    })

    const user = userEvent.setup()
    render(<PeoplePage canAdd catalogs={catalogs} />)
    await user.click(await screen.findByText('Youssef Yassine'))

    const detailPanel = await screen.findByRole('dialog', { name: 'Fiche personne' })
    expect(within(detailPanel).getByText('Toyota Land cruiser')).toBeVisible()
    expect(within(detailPanel).getByText('A.H-VOI-074')).toBeVisible()
    expect(within(detailPanel).getByRole('button', { name: 'Toyota Land cruiser — A.H-VOI-074' })).toBeVisible()
    expect(within(detailPanel).queryByText('Projet affecté')).not.toBeInTheDocument()
    expect(within(detailPanel).queryByText('Loc.')).not.toBeInTheDocument()
    expect(within(detailPanel).queryByRole('table')).not.toBeInTheDocument()
  })
})
