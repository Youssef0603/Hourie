import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RenewBondDialog } from './RenewBondDialog'
import { nextBondExpiry } from '../bondDisplay'
import type { Bond } from '../types'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('../../../shared/api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/api/http')>()),
  apiRequest,
}))

const bond: Bond = {
  id: 4, bond_type: 'performance', issuer: 'SGCI', amount: '25000000.00', currency: 'XOF',
  issued_on: '2025-03-01', expires_on: '2026-02-28', notes: 'Marché lot 2',
  project: { id: 2, name: 'Bassam', locations: [] }, location: { id: 9, name: 'Lot 2' },
  documents: [], created_at: null,
}

describe('nextBondExpiry', () => {
  it('pushes the expiry one year further, or one year from today without one', () => {
    expect(nextBondExpiry('2026-02-28')).toBe('2027-02-28')
    expect(nextBondExpiry(null, '2026-11-27')).toBe('2027-11-27')
  })
})

describe('RenewBondDialog', () => {
  it('keeps the bond as it is, saves the new expiry and amount, then uploads the bank letter', async () => {
    apiRequest.mockImplementation((_path: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') return Promise.resolve({ data: { ...bond, ...JSON.parse(String(init.body)) } })
      return Promise.resolve({ data: [{ id: 1, original_name: 'prorogation.pdf', mime_type: 'application/pdf', size_bytes: 10, url: '/f' }] })
    })
    const onRenewed = vi.fn()
    render(<RenewBondDialog bond={bond} onClose={vi.fn()} onRenewed={onRenewed} />)

    expect(screen.getByLabelText('Nouvelle date d’expiration')).toHaveValue('2027-02-28')
    const amount = screen.getByLabelText('Montant (XOF)')
    await userEvent.clear(amount)
    await userEvent.type(amount, '20000000')
    await userEvent.upload(document.body.querySelector('input[type="file"]') as HTMLInputElement, new File(['%PDF'], 'prorogation.pdf', { type: 'application/pdf' }))
    await userEvent.click(screen.getByRole('button', { name: 'Renouveler' }))

    await waitFor(() => expect(onRenewed).toHaveBeenCalled())
    expect(apiRequest.mock.calls[0][0]).toBe('/api/v1/bonds/4')
    expect(JSON.parse(apiRequest.mock.calls[0][1].body)).toEqual({
      project_id: 2, location_id: 9, bond_type: 'performance', issuer: 'SGCI', amount: 20000000,
      currency: 'XOF', issued_on: '2025-03-01', expires_on: '2027-02-28', notes: 'Marché lot 2',
    })
    expect(apiRequest.mock.calls[1][0]).toBe('/api/v1/bonds/4/documents')
    expect(onRenewed.mock.calls[0][0].documents).toHaveLength(1)
  })
})
