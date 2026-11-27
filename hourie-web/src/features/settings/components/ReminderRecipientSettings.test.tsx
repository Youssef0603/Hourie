import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { ReminderRecipientSettings } from './ReminderRecipientSettings'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('../../../shared/api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/api/http')>()),
  apiRequest,
}))

const settings = {
  recipients: [
    { employee_id: 1, name: 'Awa Koné', email: 'awa@example.test', topics: ['insurance', 'bond', 'temporary_admission', 'car_inspection'] },
    { employee_id: 2, name: 'Rizk Sahyoun', email: 'rizk@example.test', topics: ['temporary_admission'] },
  ],
}

beforeEach(() => {
  apiRequest.mockReset()
  apiRequest.mockImplementation((path: string, init?: RequestInit) => {
    if (path === '/api/v1/notification-settings' && init?.method === 'PUT') {
      const body = JSON.parse(String(init.body))
      return Promise.resolve({ data: { recipients: body.recipients.map((recipient: { employee_id: number; topics: string[] }) => ({ ...settings.recipients.find((value) => value.employee_id === recipient.employee_id), topics: recipient.topics })) } })
    }
    if (path === '/api/v1/notification-settings') return Promise.resolve({ data: settings })
    return Promise.resolve({ data: [] })
  })
})

it('shows which reminders each person receives and saves a change at once', async () => {
  const user = userEvent.setup()
  render(<ReminderRecipientSettings isAdding={false} onCloseAdd={vi.fn()} />)

  const rizkAt = (await screen.findAllByRole('button', { name: 'AT' }))[1]
  expect(rizkAt).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getAllByRole('button', { name: 'Assurances' })[1]).toHaveAttribute('aria-pressed', 'false')

  await user.click(screen.getAllByRole('button', { name: 'Visite technique' })[1])

  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/v1/notification-settings', expect.objectContaining({ method: 'PUT' })))
  const put = apiRequest.mock.calls.find(([, init]) => init?.method === 'PUT')!
  expect(JSON.parse(put[1].body).recipients).toEqual([
    { employee_id: 1, topics: ['insurance', 'bond', 'temporary_admission', 'car_inspection'] },
    { employee_id: 2, topics: ['temporary_admission', 'car_inspection'] },
  ])
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Visite technique' })[1]).toHaveAttribute('aria-pressed', 'true'))
})
