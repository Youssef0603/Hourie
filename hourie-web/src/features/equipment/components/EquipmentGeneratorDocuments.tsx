import { useState } from "react";
import { fr } from "../../../i18n/fr";
import { ApiError } from "../../../shared/api/http";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { EmptyState } from "../../../shared/components/EmptyState";
import { PaginatedDocumentList } from "../../../shared/components/PaginatedDocumentList";
import { DocumentRow } from "../../../shared/components/DocumentRow";
import {
  deleteEquipmentGeneratorDocument,
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
          title={fr.generatorDocuments.empty}
          description={fr.generatorDocuments.emptyDescription}
        />
      )}
    </section>
  );
}
