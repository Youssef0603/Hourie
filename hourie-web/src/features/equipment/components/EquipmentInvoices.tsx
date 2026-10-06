import { useRef, useState, type ChangeEvent } from 'react'
import { activeLanguage, fr } from '../../../i18n/fr'
import { ApiError } from '../../../shared/api/http'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { DocumentUploadDropzone } from '../../../shared/components/DocumentUploadDropzone'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { EmptyState } from '../../../shared/components/EmptyState'
import { PaginatedDocumentList } from '../../../shared/components/PaginatedDocumentList'
import { deleteEquipmentInvoice, downloadEquipmentInvoice, previewEquipmentInvoice, uploadEquipmentInvoices } from '../api'
import type { Equipment, EquipmentInvoice } from '../types'

type EquipmentInvoicesProps = {
  equipment: Equipment
  canManage: boolean
  onChanged: () => Promise<void>
  title?: string
  hideHeading?: boolean
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
    : `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(activeLanguage === 'ar' ? 'ar' : 'fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

export function EquipmentInvoices({ equipment, canManage, onChanged, title = fr.invoices.title, hideHeading = false }: EquipmentInvoicesProps) {
  const input = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
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
      if (input.current) input.current.value = ''
    }
  }

  function upload(event: ChangeEvent<HTMLInputElement>) {
    void uploadFiles(Array.from(event.target.files ?? []))
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

  async function download(invoice: EquipmentInvoice) {
    setError(null)
    setDownloadingId(invoice.id)
    try {
      await downloadEquipmentInvoice(invoice)
    } catch {
      setError(fr.invoices.downloadError)
    } finally {
      setDownloadingId(null)
    }
  }

  function openPreview(invoice: EquipmentInvoice) {
    setError(null)
    if (!previewEquipmentInvoice(invoice)) setError(fr.invoices.previewError)
  }

  return (
    <section className="equipment-invoices-section">
      {!hideHeading && <div className="section-heading-row">
        <div><h3>{title}</h3><p>{fr.invoices.count(equipment.invoices.length)}</p></div>
        {canManage && <><input ref={input} hidden multiple accept="application/pdf,.pdf" type="file" onChange={upload} /><button className="invoice-upload-button" type="button" disabled={isUploading} onClick={() => input.current?.click()}><ActionIcon name="upload" />{isUploading ? <LoadingSpinner compact label={fr.invoices.uploading} /> : fr.invoices.add}</button></>}
      </div>}
      {hideHeading && canManage && <input ref={input} hidden multiple accept="application/pdf,.pdf" type="file" onChange={upload} />}
      {hideHeading && equipment.invoices.length > 0 && canManage && <div className="detail-section-actions"><button className="detail-upload-button" type="button" disabled={isUploading} onClick={() => input.current?.click()}><ActionIcon name="add" />{isUploading ? <LoadingSpinner compact label={fr.invoices.uploading} /> : fr.invoices.addOne}</button></div>}
      {canManage && !hideHeading && <p className="invoice-format-hint">{fr.invoices.formats}</p>}
      {canManage && !hideHeading && equipment.invoices.length === 0 && <DocumentUploadDropzone title={isUploading ? fr.invoices.uploading : fr.invoices.add} description={fr.invoices.formats} disabled={isUploading} onFiles={(files) => void uploadFiles(files)} />}
      {error && <div className="form-alert" role="alert">{error}</div>}
      {equipment.invoices.length > 0 ? <PaginatedDocumentList documents={equipment.invoices} emptyMessage={fr.invoices.empty} renderDocument={(invoice) => <article key={invoice.id}><button className="invoice-preview-button" type="button" onClick={() => openPreview(invoice)}><span className="invoice-pdf-badge">PDF</span><span><strong>{invoice.original_name}</strong><small>{formatSize(invoice.size_bytes)} · {formatDate(invoice.created_at)}{invoice.uploaded_by ? ` · ${fr.invoices.uploadedBy(invoice.uploaded_by.name)}` : ''}</small></span></button><button className="invoice-download-button" type="button" disabled={downloadingId === invoice.id} onClick={() => download(invoice)}>{downloadingId === invoice.id ? <LoadingSpinner compact label={fr.common.loading} /> : <><ActionIcon name="expand" />{fr.invoices.download}</>}</button>{canManage && <button className="invoice-delete-button" type="button" disabled={deletingId === invoice.id} onClick={() => remove(invoice)} aria-label={fr.common.delete}>{deletingId === invoice.id ? <LoadingSpinner compact label={fr.common.loading} /> : <ActionIcon name="delete" />}</button>}</article>} /> : <EmptyState compact icon="invoice" title={fr.invoices.empty} description="Les factures ajoutées à cet actif apparaîtront ici." action={hideHeading && canManage && <button className="detail-upload-button" type="button" disabled={isUploading} onClick={() => input.current?.click()}><ActionIcon name="add" />{isUploading ? <LoadingSpinner compact label={fr.invoices.uploading} /> : fr.invoices.addOne}</button>} />}
    </section>
  )
}
