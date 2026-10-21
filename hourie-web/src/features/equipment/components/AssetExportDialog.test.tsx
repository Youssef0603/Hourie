import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { assetExportFields, defaultAssetExportFields } from '../assetExport'
import { AssetExportDialog } from './AssetExportDialog'

it('lets the user choose the fields included in an asset export', async () => {
  const user = userEvent.setup()
  const onExport = vi.fn()
  render(<AssetExportDialog
    title="Voitures"
    language="fr"
    fields={assetExportFields('car')}
    defaultFields={defaultAssetExportFields('car')}
    isExporting={false}
    error={null}
    onClose={vi.fn()}
    onExport={onExport}
  />)

  expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(4)
  expect(screen.queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Tout désélectionner' }))
  expect(screen.getByRole('button', { name: 'Télécharger le fichier' })).toBeDisabled()

  await user.click(screen.getByRole('checkbox', { name: 'Marque' }))
  await user.click(screen.getByRole('button', { name: 'Télécharger le fichier' }))

  expect(onExport).toHaveBeenCalledWith(['brand'])
})

it('offers an optional export scope inside the dialog', async () => {
  const user = userEvent.setup()
  const onScopeChange = vi.fn()

  render(<AssetExportDialog
    title="Générateurs"
    language="fr"
    fields={assetExportFields('generator')}
    defaultFields={defaultAssetExportFields('generator')}
    isExporting={false}
    error={null}
    scopeOption={{
      label: 'Uniquement les générateurs sans facture',
      checked: false,
      onChange: onScopeChange,
    }}
    onClose={vi.fn()}
    onExport={vi.fn()}
  />)

  await user.click(screen.getByRole('checkbox', { name: 'Uniquement les générateurs sans facture' }))

  expect(onScopeChange).toHaveBeenCalledWith(true)
})
