import { useState } from "react";
import { fr } from "../../../i18n/fr";
import { ApiError } from "../../../shared/api/http";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { EmptyState } from "../../../shared/components/EmptyState";
import { PaginatedDocumentList } from "../../../shared/components/PaginatedDocumentList";
import { DocumentRow } from "../../../shared/components/DocumentRow";
import {
  deleteEquipmentVehicleDocument,
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
            <DocumentRow
              key={document.id}
              url={document.url}
              name={document.original_name}
              onError={setError}
              onDelete={canManage ? () => void remove(document) : undefined}
              deleting={deletingId === document.id}
            />
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
