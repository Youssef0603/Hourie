import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataTable } from './DataTable'

describe('DataTable', () => {
  it('uses the shared table structure and forwards its accessible name', () => {
    render(<DataTable ariaLabel="Registre"><thead><tr><th>Nom</th></tr></thead><tbody><tr><td>Bassam</td></tr></tbody></DataTable>)

    expect(screen.getByRole('table', { name: 'Registre' })).toHaveClass('equipment-table')
    expect(screen.getByRole('columnheader', { name: 'Nom' })).toBeVisible()
    expect(screen.getByRole('cell', { name: 'Bassam' })).toBeVisible()
  })
})
