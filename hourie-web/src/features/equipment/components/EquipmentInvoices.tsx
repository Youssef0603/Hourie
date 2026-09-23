import { useRef, useState, type ChangeEvent } from 'react'
import { activeLanguage, fr } from '../../../i18n/fr'
import { ApiError } from '../../../shared/api/http'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { deleteEquipmentInvoice, downloadEquipmentInvoice, uploadEquipmentInvoices } from '../api'
import type { Equipment, EquipmentInvoice } from '../types'

type EquipmentInvoicesProps = {
  equipment: Equipment
  canManage: boolean
  onChanged: () => Promise<void>
  title?: string
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
    : `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(activeLanguage === 'ar' ? 'ar' : 'fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

export function EquipmentInvoices({ equipment, canManage, onChanged, title = fr.invoices.title }: EquipmentInvoicesProps) {
  const input = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
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

  return (
    <section className="equipment-invoices-section">
      <div className="section-heading-row">
        <div><h3>{title}</h3><p>{fr.invoices.count(equipment.invoices.length)}</p></div>
        {canManage && <><input ref={input} hidden multiple accept="application/pdf,.pdf" type="file" onChange={upload} /><button className="invoice-upload-button" type="button" disabled={isUploading} onClick={() => input.current?.click()}><ActionIcon name="upload" />{isUploading ? <LoadingSpinner compact label={fr.invoices.uploading} /> : fr.invoices.add}</button></>}
      </div>
      {canManage && <p className="invoice-format-hint">{fr.invoices.formats}</p>}
      {error && <div className="form-alert" role="alert">{error}</div>}
      {equipment.invoices.length > 0 ? <div className="invoice-list">{equipment.invoices.map((invoice) => <article key={invoice.id}><span className="invoice-pdf-badge">PDF</span><div><strong>{invoice.original_name}</strong><p>{formatSize(invoice.size_bytes)} · {formatDate(invoice.created_at)}{invoice.uploaded_by ? ` · ${fr.invoices.uploadedBy(invoice.uploaded_by.name)}` : ''}</p></div><button className="invoice-download-button" type="button" disabled={downloadingId === invoice.id} onClick={() => download(invoice)}>{downloadingId === invoice.id ? <LoadingSpinner compact label={fr.common.loading} /> : <><ActionIcon name="expand" />{fr.invoices.download}</>}</button>{canManage && <button className="invoice-delete-button" type="button" disabled={deletingId === invoice.id} onClick={() => remove(invoice)} aria-label={fr.common.delete}>{deletingId === invoice.id ? <LoadingSpinner compact label={fr.common.loading} /> : <ActionIcon name="delete" />}</button>}</article>)}</div> : <p className="equipment-images-empty">{fr.invoices.empty}</p>}
    </section>
  )
}
