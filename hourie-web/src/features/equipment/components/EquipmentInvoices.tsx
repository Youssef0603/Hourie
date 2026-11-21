import { useState } from 'react'
import { fr } from '../../../i18n/fr'
import { operationPhrase as t } from '../../../i18n/operations'
import { formatDate, formatFileSize } from '../../../shared/format'
import { ApiError } from '../../../shared/api/http'
import { DocumentUploadDropzone } from '../../../shared/components/DocumentUploadDropzone'
import { EmptyState } from '../../../shared/components/EmptyState'
import { PaginatedDocumentList } from '../../../shared/components/PaginatedDocumentList'
import { DocumentRow } from '../../../shared/components/DocumentRow'
import { deleteEquipmentInvoice, uploadEquipmentInvoices } from '../api'
import type { Equipment, EquipmentInvoice } from '../types'

type EquipmentInvoicesProps = {
  equipment: Equipment
  canManage: boolean
  onChanged: () => Promise<void>
  title?: string
  hideHeading?: boolean
  showDownload?: boolean
}


export function EquipmentInvoices({ equipment, canManage, onChanged, title = fr.invoices.title, hideHeading = false, showDownload = true }: EquipmentInvoicesProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return

    setError(null)
    setIsUploading(true)
    try {
      await uploadEquipmentInvoices(equipment.id, files)
      await onChanged()
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors)[0]?.[0] ?? fr.invoices.uploadError : fr.invoices.uploadError)
    } finally {
      setIsUploading(false)
    }
  }

  async function remove(invoice: EquipmentInvoice) {
    if (!window.confirm(fr.invoices.deleteConfirmation)) return

    setError(null)
    setDeletingId(invoice.id)
    try {
      await deleteEquipmentInvoice(equipment.id, invoice.id)
      await onChanged()
    } catch {
      setError(fr.invoices.deleteError)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="equipment-invoices-section">
      {!hideHeading && <div className="section-heading-row">
        <div><h3>{title}</h3><p>{fr.invoices.count(equipment.invoices.length)}</p></div>
      </div>}
      {canManage && <DocumentUploadDropzone compact title={isUploading ? fr.invoices.uploading : fr.invoices.add} description={fr.invoices.formats} disabled={isUploading} onFiles={(files) => void uploadFiles(files)} />}
      {error && <div className="form-alert" role="alert">{error}</div>}
      {equipment.invoices.length > 0 ? <PaginatedDocumentList documents={equipment.invoices} emptyMessage={fr.invoices.empty} renderDocument={(invoice) => <DocumentRow key={invoice.id} url={invoice.url} name={invoice.original_name} meta={`${formatFileSize(invoice.size_bytes)} · ${formatDate(invoice.created_at, { style: 'medium' })}${invoice.uploaded_by ? ` · ${fr.invoices.uploadedBy(invoice.uploaded_by.name)}` : ''}`} showDownload={showDownload} onError={setError} onDelete={canManage ? () => void remove(invoice) : undefined} deleting={deletingId === invoice.id} />} /> : <EmptyState compact icon="invoice" title={fr.invoices.empty} description={t('Les factures ajoutées à cet actif apparaîtront ici.')} />}
    </section>
  )
}
