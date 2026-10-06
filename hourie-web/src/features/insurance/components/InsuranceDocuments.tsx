import { useState, type FormEvent } from "react";
import {
  ApiError,
  apiRequest,
  getAuthenticatedFileObjectUrl,
} from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { PaginatedDocumentList } from "../../../shared/components/PaginatedDocumentList";
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

  async function upload(event: FormEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    if (!files.length) return;
    const input = event.currentTarget;
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
          : "Impossible d’ajouter les documents.",
      );
    } finally {
      setUploading(false);
      setUploadProgress(null);
      input.value = "";
    }
  }

  async function remove(document: PolicyDocument) {
    if (
      !window.confirm(`Supprimer le document « ${document.original_name} » ?`)
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
      setError("Impossible de supprimer ce document.");
    } finally {
      setDeletingId(null);
    }
  }

  const uploadLabel = uploadProgress
    ? `Ajout ${uploadProgress.current}/${uploadProgress.total}…`
    : "Ajouter des documents";

  return (
    <section className="insurance-documents-section">
      <h3>
        <ActionIcon name="invoice" />
        Documents
      </h3>
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      {documents.length ? (
        <PaginatedDocumentList
          documents={documents}
          emptyMessage="Aucun document ajouté."
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
                aria-label={`Supprimer ${document.original_name}`}
              >
                {deletingId === document.id ? (
                  <LoadingSpinner compact label="Suppression" />
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
          title="Aucun document ajouté"
          description="Les contrats et attestations associés apparaîtront ici."
        />
      )}
      {!readOnly && <label className="detail-upload-button insurance-document-upload">
        <ActionIcon name="add" />
        <span>{uploading ? uploadLabel : "Ajouter des documents"}</span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          multiple
          disabled={uploading}
          onChange={(event) => void upload(event)}
        />
      </label>}
    </section>
  );
}
