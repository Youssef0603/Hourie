import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders its icon, explanatory text, and optional action accessibly', () => {
    render(
      <EmptyState
        icon="inbox"
        title="Aucun résultat"
        description="Modifiez votre recherche."
        action={<button type="button">Réessayer</button>}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Aucun résultat')
    expect(screen.getByRole('status')).toHaveTextContent('Modifiez votre recherche.')
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })
})
