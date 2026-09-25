import { useState, type FormEvent } from 'react'
import { fr } from '../../../i18n/fr'
import { ApiError } from '../../../shared/api/http'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { importAssetInventory } from '../api'
import type { EquipmentImportResult } from '../types'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'

type ImportAssetInventoryFormProps = {
  onImported: (result: EquipmentImportResult) => void
  onClose: () => void
}

export function ImportAssetInventoryForm({ onImported, onClose }: ImportAssetInventoryFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<EquipmentImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) return

    setIsImporting(true)
    setError(null)
    try {
      const imported = await importAssetInventory(file)
      setResult(imported)
      onImported(imported)
    } catch (caught) {
      setError(caught instanceof ApiError
        ? Object.values(caught.errors)[0]?.[0] ?? fr.equipment.importError
        : fr.equipment.importError)
    } finally {
      setIsImporting(false)
    }
  }

  if (result) {
    return <div className="equipment-import-result">
      <span className="equipment-import-success" aria-hidden="true">✓</span>
      <h3>{fr.assets.importSuccess(result.summary.imported_rows)}</h3>
      {(result.summary.skipped_rows ?? 0) > 0 && <p>{fr.assets.importSkipped(result.summary.skipped_rows ?? 0)}</p>}
      <small>{result.original_filename}</small>
      <button className="primary-button compact-action" type="button" onClick={onClose}>{fr.common.close}</button>
    </div>
  }

  return <form className="equipment-import-form" onSubmit={submit}>
    <p>{fr.assets.importDescription}</p>
    {error && <div className="form-alert" role="alert">{error}</div>}
    <label className="equipment-file-picker">
      <ActionIcon name="upload" />
      <span>{file?.name ?? fr.equipment.importFile}</span>
      <input required type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
    </label>
    <div className="maintenance-form-actions">
      <button className="primary-button import-excel-action" type="submit" disabled={!file || isImporting}>{isImporting ? <LoadingSpinner compact label={fr.equipment.importing} /> : fr.equipment.importSubmit}</button>
    </div>
  </form>
}
