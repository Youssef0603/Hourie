import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RenewInsuranceDialog } from './RenewInsuranceDialog'
import { nextInsurancePeriod } from '../renewalPeriod'
import type { InsurancePolicy } from '../types'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('../../../shared/api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/api/http')>()),
  apiRequest,
}))

const policy: InsurancePolicy = {
  id: 7, insurance_type: 'equipment', policy_number: 'EQ-2026', source: 'NSIA',
  starts_on: '2026-01-01', ends_on: '2026-12-31', net_premium: '900000', accessories_amount: '5000',
  tax_amount: '130000', total_amount: '1035000', territory: null, insured_situation: null, notes: null,
  documents: [],
}

describe('nextInsurancePeriod', () => {
  it('starts the day after the old period and lasts one year', () => {
    expect(nextInsurancePeriod('2026-12-31')).toEqual({ startsOn: '2027-01-01', endsOn: '2027-12-31' })
    expect(nextInsurancePeriod('2027-02-28')).toEqual({ startsOn: '2027-03-01', endsOn: '2028-02-29' })
  })

  it('starts today when the old period had no end date', () => {
    expect(nextInsurancePeriod(null, '2026-11-27')).toEqual({ startsOn: '2026-11-27', endsOn: '2027-11-26' })
  })
})

describe('RenewInsuranceDialog', () => {
  it('saves the new period and premium, then uploads the new attestation', async () => {
    apiRequest.mockImplementation((_path: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return Promise.resolve({ data: { ...policy, ...JSON.parse(String(init.body)) } })
      return Promise.resolve({ data: [{ id: 3, original_name: 'attestation-2027.pdf', mime_type: 'application/pdf', size_bytes: 10, url: '/f' }] })
    })
    const onRenewed = vi.fn()
    render(<RenewInsuranceDialog policy={policy} onClose={vi.fn()} onRenewed={onRenewed} />)

    expect(screen.getByLabelText('Nouvelle date de début')).toHaveValue('2027-01-01')
    expect(screen.getByLabelText('Nouvelle date d’expiration')).toHaveValue('2027-12-31')

    const premium = screen.getByLabelText('Prime nette (FCFA)')
    await userEvent.clear(premium)
    await userEvent.type(premium, '950000')
    const file = new File(['%PDF'], 'attestation-2027.pdf', { type: 'application/pdf' })
    await userEvent.upload(document.body.querySelector('input[type="file"]') as HTMLInputElement, file)
    await userEvent.click(screen.getByRole('button', { name: 'Renouveler' }))

    await waitFor(() => expect(onRenewed).toHaveBeenCalled())
    const [, update] = apiRequest.mock.calls[0]
    expect(apiRequest.mock.calls[0][0]).toBe('/api/v1/insurance-policies/7')
    expect(JSON.parse(update.body)).toMatchObject({ starts_on: '2027-01-01', ends_on: '2027-12-31', policy_number: 'EQ-2026', net_premium: 950000 })
    expect(apiRequest.mock.calls[1][0]).toBe('/api/v1/insurance-policies/7/documents')
    expect(onRenewed.mock.calls[0][0].documents).toHaveLength(1)
  })
})
