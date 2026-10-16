import { useState, type FormEvent } from 'react'
import { fr, type Language } from '../../../i18n/fr'
import { Modal } from '../../../shared/components/Modal'
import { assetExportFieldLabel, type AssetExportField } from '../assetExport'

export function AssetExportDialog({
  title,
  language,
  fields,
  defaultFields,
  isExporting,
  error,
  onClose,
  onExport,
}: {
  title: string
  language: Language
  fields: AssetExportField[]
  defaultFields: string[]
  isExporting: boolean
  error: string | null
  onClose: () => void
  onExport: (fields: string[]) => void
}) {
  const [selectedFields, setSelectedFields] = useState<string[]>(defaultFields)

  function toggleField(field: string) {
    setSelectedFields((current) => current.includes(field)
      ? current.filter((item) => item !== field)
      : [...current, field])
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedFields.length > 0) onExport(selectedFields)
  }

  return <Modal title={fr.assets.exportTitle(title)} onClose={onClose} size="compact">
    <form className="asset-export-form" onSubmit={submit}>
      <p>{fr.assets.exportDescription}</p>
      {error && <p className="form-alert" role="alert">{error}</p>}
      <div className="asset-export-selection-actions">
        <button type="button" onClick={() => setSelectedFields(fields.map((field) => field.key))}>{fr.assets.exportSelectAll}</button>
        <button type="button" onClick={() => setSelectedFields([])}>{fr.assets.exportClear}</button>
      </div>
      <div className="asset-export-fields">
        {fields.map((field) => <label key={field.key}>
          <input type="checkbox" checked={selectedFields.includes(field.key)} onChange={() => toggleField(field.key)} />
          <span>{assetExportFieldLabel(field, language)}</span>
        </label>)}
      </div>
      {selectedFields.length === 0 && <p className="asset-export-required">{fr.assets.exportFieldRequired}</p>}
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onClose}>{fr.common.cancel}</button>
        <button type="submit" className="primary-button" disabled={isExporting || selectedFields.length === 0}>
          {isExporting ? fr.assets.exporting : fr.assets.exportDownload}
        </button>
      </div>
    </form>
  </Modal>
}
