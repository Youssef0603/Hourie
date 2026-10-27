import { useState } from "react";
import { fr } from "../../../i18n/fr";
import { ApiError } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { PaginatedDocumentList } from "../../../shared/components/PaginatedDocumentList";
import {
  deleteEquipmentGeneratorDocument,
  downloadEquipmentGeneratorDocument,
  previewEquipmentGeneratorDocument,
  uploadEquipmentGeneratorDocuments,
} from "../api";
import type { Equipment, EquipmentGeneratorDocument } from "../types";

type EquipmentGeneratorDocumentsProps = {
  equipment: Equipment;
  canManage: boolean;
  onChanged: () => Promise<void>;
};

export function EquipmentGeneratorDocuments({ equipment, canManage, onChanged }: EquipmentGeneratorDocumentsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: File[]) {
    if (!files.length) return;

    setError(null);
    setIsUploading(true);
    try {
      await uploadEquipmentGeneratorDocuments(equipment.id, files);
      await onChanged();
    } catch (caught) {
      setError(caught instanceof ApiError
        ? Object.values(caught.errors)[0]?.[0] ?? fr.generatorDocuments.uploadError
        : fr.generatorDocuments.uploadError);
    } finally {
      setIsUploading(false);
    }
  }

  async function remove(document: EquipmentGeneratorDocument) {
    if (!window.confirm(fr.generatorDocuments.deleteConfirmation)) return;

    setError(null);
    setDeletingId(document.id);
    try {
      await deleteEquipmentGeneratorDocument(equipment.id, document.id);
      await onChanged();
    } catch {
      setError(fr.generatorDocuments.deleteError);
    } finally {
      setDeletingId(null);
    }
  }

  async function download(document: EquipmentGeneratorDocument) {
    setError(null);
    setDownloadingId(document.id);
    try {
      await downloadEquipmentGeneratorDocument(document);
    } catch {
      setError(fr.generatorDocuments.downloadError);
    } finally {
      setDownloadingId(null);
    }
  }

  function openPreview(document: EquipmentGeneratorDocument) {
    setError(null);
    if (!previewEquipmentGeneratorDocument(document)) setError(fr.generatorDocuments.previewError);
  }

  return (
    <section className="equipment-vehicle-documents equipment-generator-documents">
      {canManage && (
        <DocumentUploadDropzone
          compact
          maxSizeMb={25}
          title={isUploading ? fr.generatorDocuments.uploading : fr.generatorDocuments.add}
          description={fr.generatorDocuments.formats}
          disabled={isUploading}
          onFiles={(files) => void upload(files)}
        />
      )}
      {error && <div className="form-alert" role="alert">{error}</div>}

      {equipment.generator_documents.length > 0 ? (
        <PaginatedDocumentList
          documents={equipment.generator_documents}
          emptyMessage={fr.generatorDocuments.empty}
          renderDocument={(document) => (
            <article key={document.id}>
              <button className="invoice-preview-button" type="button" onClick={() => openPreview(document)}>
                <span className="invoice-pdf-badge">PDF</span>
                <span>
                  <strong>{document.original_name}</strong>
                </span>
              </button>
              <button className="invoice-download-button" type="button" disabled={downloadingId === document.id} onClick={() => void download(document)}>
                {downloadingId === document.id
                  ? <LoadingSpinner compact label={fr.common.loading} />
                  : <><ActionIcon name="expand" />{fr.generatorDocuments.download}</>}
              </button>
              {canManage && (
                <button className="invoice-delete-button" type="button" disabled={deletingId === document.id} onClick={() => void remove(document)} aria-label={fr.common.delete}>
                  {deletingId === document.id
                    ? <LoadingSpinner compact label={fr.common.loading} />
                    : <ActionIcon name="delete" />}
                </button>
              )}
            </article>
          )}
        />
      ) : (
        <EmptyState
          compact
          icon="invoice"
          title={fr.generatorDocuments.empty}
          description={fr.generatorDocuments.emptyDescription}
        />
      )}
    </section>
  );
}
