import { useState } from "react";
import { fr } from "../../../i18n/fr";
import { ApiError } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { PaginatedDocumentList } from "../../../shared/components/PaginatedDocumentList";
import {
  deleteEquipmentVehicleDocument,
  downloadEquipmentVehicleDocument,
  previewEquipmentVehicleDocument,
  uploadEquipmentVehicleDocument,
} from "../api";
import type { Equipment, EquipmentVehicleDocument } from "../types";

type EquipmentVehicleDocumentsProps = {
  equipment: Equipment;
  canManage: boolean;
  onChanged: () => Promise<void>;
};

export function EquipmentVehicleDocuments({ equipment, canManage, onChanged }: EquipmentVehicleDocumentsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: File[]) {
    if (!files.length) return;

    setError(null);
    setIsUploading(true);
    try {
      await Promise.all(files.map((document) => uploadEquipmentVehicleDocument(equipment.id, document)));
      await onChanged();
    } catch (caught) {
      setError(caught instanceof ApiError
        ? Object.values(caught.errors)[0]?.[0] ?? fr.vehicleDocuments.uploadError
        : fr.vehicleDocuments.uploadError);
    } finally {
      setIsUploading(false);
    }
  }

  async function remove(document: EquipmentVehicleDocument) {
    if (!window.confirm(fr.vehicleDocuments.deleteConfirmation)) return;

    setError(null);
    setDeletingId(document.id);
    try {
      await deleteEquipmentVehicleDocument(equipment.id, document.id);
      await onChanged();
    } catch {
      setError(fr.vehicleDocuments.deleteError);
    } finally {
      setDeletingId(null);
    }
  }

  async function download(document: EquipmentVehicleDocument) {
    setError(null);
    setDownloadingId(document.id);
    try {
      await downloadEquipmentVehicleDocument(document);
    } catch {
      setError(fr.vehicleDocuments.downloadError);
    } finally {
      setDownloadingId(null);
    }
  }

  function openPreview(document: EquipmentVehicleDocument) {
    setError(null);
    if (!previewEquipmentVehicleDocument(document)) setError(fr.vehicleDocuments.previewError);
  }

  return (
    <section className="equipment-vehicle-documents">
      {canManage && (
        <DocumentUploadDropzone
          compact
          title={isUploading ? fr.vehicleDocuments.uploading : fr.vehicleDocuments.add}
          description={fr.vehicleDocuments.formats}
          disabled={isUploading}
          onFiles={(files) => void upload(files)}
        />
      )}
      {error && <div className="form-alert" role="alert">{error}</div>}

      {equipment.vehicle_documents.length > 0 ? (
        <PaginatedDocumentList
          documents={equipment.vehicle_documents}
          emptyMessage={fr.vehicleDocuments.empty}
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
                  : <><ActionIcon name="expand" />{fr.vehicleDocuments.download}</>}
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
          title={fr.vehicleDocuments.empty}
          description={fr.vehicleDocuments.emptyDescription}
        />
      )}
    </section>
  );
}
