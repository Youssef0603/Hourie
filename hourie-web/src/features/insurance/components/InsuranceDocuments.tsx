import { useState } from "react";
import {
  ApiError,
  apiRequest,
  getAuthenticatedFileObjectUrl,
} from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { PaginatedDocumentList } from "../../../shared/components/PaginatedDocumentList";
import { activeLanguage } from "../../../i18n/fr";
import { operationPhrase } from "../../../i18n/operations";
import type {
  InsurancePolicy as Policy,
  InsurancePolicyDocument as PolicyDocument,
} from "../types";

export function InsuranceDocuments({
  policy,
  onChanged,
  readOnly = false,
}: {
  policy: Policy;
  onChanged: (documents: PolicyDocument[]) => void;
  readOnly?: boolean;
}) {
  const documents = policy.documents ?? [];
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function preview(document: PolicyDocument) {
    const url = await getAuthenticatedFileObjectUrl(
      `${document.url}?preview=1`,
    );
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function upload(files: File[]) {
    if (!files.length) return;
    setError(null);
    setUploading(true);
    try {
      let updatedDocuments = documents;
      // Upload separately so a large selection is not rejected by the server's total request-size limit.
      for (const [index, file] of files.entries()) {
        setUploadProgress({ current: index + 1, total: files.length });
        const form = new FormData();
        form.append("documents[]", file);
        const response = await apiRequest<{ data: PolicyDocument[] }>(
          `/api/v1/insurance-policies/${policy.id}/documents`,
          { method: "POST", body: form },
        );
        updatedDocuments = [...updatedDocuments, ...response.data];
        onChanged(updatedDocuments);
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (Object.values(caught.errors)[0]?.[0] ?? caught.message)
          : operationPhrase("Impossible d’ajouter les documents."),
      );
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  async function remove(document: PolicyDocument) {
    if (
      !window.confirm(activeLanguage === "ar" ? `هل تريد حذف المستند « ${document.original_name} »؟` : `Supprimer le document « ${document.original_name} » ?`)
    )
      return;
    setError(null);
    setDeletingId(document.id);
    try {
      await apiRequest(
        `/api/v1/insurance-policies/${policy.id}/documents/${document.id}`,
        { method: "DELETE" },
      );
      onChanged(documents.filter((item) => item.id !== document.id));
    } catch {
      setError(operationPhrase("Impossible de supprimer ce document."));
    } finally {
      setDeletingId(null);
    }
  }

  const uploadLabel = uploadProgress
    ? activeLanguage === "ar" ? `إضافة ${uploadProgress.current}/${uploadProgress.total}…` : `Ajout ${uploadProgress.current}/${uploadProgress.total}…`
    : operationPhrase("Ajouter des documents");

  return (
    <section className="insurance-documents-section">
      <h3>
        <ActionIcon name="invoice" />
        {operationPhrase("Documents")}
      </h3>
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      {!readOnly && (
        <DocumentUploadDropzone
          compact
          disabled={uploading}
          title={uploading ? uploadLabel : operationPhrase("Ajouter des documents")}
          description={operationPhrase("Contrats ou attestations · PDF uniquement · 10 Mo maximum par fichier")}
          onFiles={(files) => void upload(files)}
        />
      )}
      {documents.length ? (
        <PaginatedDocumentList
          documents={documents}
          emptyMessage={operationPhrase("Aucun document ajouté.")}
          renderDocument={(document) => (
            <article key={document.id}>
              <button
                className="invoice-preview-button"
                type="button"
                onClick={() => void preview(document)}
              >
                <span className="invoice-pdf-badge">PDF</span>
                <span>
                  <strong>{document.original_name}</strong>
                  <small>
                    {Math.max(1, Math.round(document.size_bytes / 1024))} Ko
                  </small>
                </span>
              </button>
              {!readOnly && <button
                className="invoice-delete-button"
                type="button"
                disabled={deletingId === document.id}
                onClick={() => void remove(document)}
                aria-label={`${operationPhrase("Supprimer")} ${document.original_name}`}
              >
                {deletingId === document.id ? (
                  <LoadingSpinner compact label={operationPhrase("Suppression")} />
                ) : (
                  <ActionIcon name="delete" />
                )}
              </button>}
            </article>
          )}
        />
      ) : (
        <EmptyState
          compact
          icon="invoice"
          title={operationPhrase("Aucun document ajouté")}
          description={operationPhrase("Les contrats et attestations associés apparaîtront ici.")}
        />
      )}
    </section>
  );
}
