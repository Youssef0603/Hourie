import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react'
import { fr } from '../../../i18n/fr'
import { ApiError } from '../../../shared/api/http'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { Modal } from '../../../shared/components/Modal'
import { deleteEquipmentImage, uploadEquipmentImages } from '../api'
import type { Equipment, EquipmentImage } from '../types'

type EquipmentImagesProps = {
  equipment: Equipment
  canManage: boolean
  onChanged: () => Promise<void>
}

export function EquipmentImages({ equipment, canManage, onChanged }: EquipmentImagesProps) {
  const input = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [preview, setPreview] = useState<EquipmentImage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return

    setError(null)
    setIsUploading(true)
    try {
      await uploadEquipmentImages(equipment.id, files)
      await onChanged()
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors)[0]?.[0] ?? fr.images.uploadError : fr.images.uploadError)
    } finally {
      setIsUploading(false)
      if (input.current) input.current.value = ''
    }
  }

  function upload(event: ChangeEvent<HTMLInputElement>) {
    void uploadFiles(Array.from(event.target.files ?? []))
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    if (!isUploading) void uploadFiles(Array.from(event.dataTransfer.files))
  }

  function openPicker(event?: KeyboardEvent<HTMLDivElement>) {
    if (event && event.key !== 'Enter' && event.key !== ' ') return
    event?.preventDefault()
    if (!isUploading) input.current?.click()
  }

  async function remove(image: EquipmentImage) {
    if (!window.confirm(fr.images.deleteConfirmation)) return
    setError(null)
    setDeletingId(image.id)
    try {
      await deleteEquipmentImage(equipment.id, image.id)
      if (preview?.id === image.id) setPreview(null)
      await onChanged()
    } catch {
      setError(fr.images.deleteError)
    } finally {
      setDeletingId(null)
    }
  }

  return <section className="equipment-images-section">
    <div className="section-heading-row"><div><h3>{fr.images.title}</h3><p>{fr.images.count(equipment.images.length)}</p></div></div>
    {error && <div className="form-alert" role="alert">{error}</div>}
    {canManage && <><input ref={input} hidden multiple accept="image/jpeg,image/png,image/webp" type="file" onChange={upload} /><div className={`equipment-image-dropzone${isDragging ? ' is-dragging' : ''}${isUploading ? ' is-uploading' : ''}`} role="button" tabIndex={0} aria-disabled={isUploading} onClick={() => openPicker()} onKeyDown={openPicker} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false) }} onDrop={drop}>{isUploading ? <LoadingSpinner label={fr.images.uploading} /> : <><span className="equipment-dropzone-icon"><ActionIcon name="upload" /></span><strong>{fr.images.dropPrompt}</strong><span>{fr.images.formats}</span><button type="button" onClick={(event) => { event.stopPropagation(); input.current?.click() }}>{fr.images.browse}</button></>}</div></>}
    {equipment.images.length > 0 ? <div className="equipment-image-grid">{equipment.images.map((image) => <article key={image.id}><button className="equipment-image-preview" type="button" onClick={() => setPreview(image)}><img src={image.url} alt={image.original_name} loading="lazy" /></button>{canManage && <button className="equipment-image-delete" type="button" disabled={deletingId === image.id} onClick={() => remove(image)} aria-label={fr.common.delete}>{deletingId === image.id ? <LoadingSpinner compact label={fr.common.loading} /> : <ActionIcon name="close" />}</button>}</article>)}</div> : !canManage && <p className="equipment-images-empty">{fr.images.empty}</p>}
    {preview && <Modal title={preview.original_name} size="wide" onClose={() => setPreview(null)}><img className="equipment-image-full" src={preview.url} alt={preview.original_name} /></Modal>}
  </section>
}
