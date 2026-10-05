import { render, screen, waitFor } from '@testing-library/react'
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
  email: index === 0 ? 'youssef@hourie.ci' : null,
  phone_number: index === 0 ? '+225 07 00 00 00 00' : null,
  passport_number: null,
  employment_date: '2026-01-15',
  birth_date: null,
  is_active: index !== 2,
  equipment_in_custody_count: 0,
  user: index === 0
    ? { id: 1, username: 'youssef', email: 'youssef@hourie.ci', role: 'manager' as const }
    : index === 1
      ? { id: 2, username: 'viewer', email: 'viewer@hourie.ci', role: 'viewer' as const }
      : null,
}))

describe('PeoplePage', () => {
  beforeEach(() => {
    getEmployees.mockResolvedValue(people)
    getEmployee.mockResolvedValue({
      ...people[0],
      equipment_in_custody: [],
      assigned_sites: [],
      health_insurance_policies: [],
    })
  })

  it('shows people in a paginated table and searches by e-mail', async () => {
    const user = userEvent.setup()
    render(<PeoplePage canAdd />)

    expect(await screen.findByText('Youssef Yassine')).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'E-mail' })).toBeVisible()
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
    render(<PeoplePage canAdd />)

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
    expect(await screen.findByText('Fiche personne')).toBeVisible()
    expect(getEmployee).toHaveBeenCalledWith(1)
  })
})
