import { useEffect, useState } from "react";
import {
  apiRequest,
  getAuthenticatedFileObjectUrl,
} from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { PaginatedDocumentList } from "../../../shared/components/PaginatedDocumentList";
import {
  RecordHistory,
  type RecordHistoryEntry,
} from "../../../shared/components/RecordHistory";
import {
  bondStatusLabel,
  bondTypeLabel,
  formatBondAmount,
  formatBondDate,
  getBondStatus,
} from "../bondDisplay";
import type { Bond, BondDocument } from "../types";
import { activeLanguage } from "../../../i18n/fr";
import { operationPhrase } from "../../../i18n/operations";

export function BondDetails({
  bond,
  onClose,
  onEdit,
  onChanged,
  onDeleted,
}: {
  bond: Bond;
  onClose: () => void;
  onEdit: () => void;
  onChanged: (bond: Bond) => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [history, setHistory] = useState<RecordHistoryEntry[]>(
    bond.changes ?? [],
  );
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const state = getBondStatus(bond);
  async function refreshHistory() {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await apiRequest<{ data: Bond }>(
        `/api/v1/bonds/${bond.id}`,
      );
      setHistory(response.data.changes ?? []);
    } catch {
      setHistoryError(operationPhrase("Impossible de charger l’historique de cette caution."));
    } finally {
      setHistoryLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    apiRequest<{ data: Bond }>(`/api/v1/bonds/${bond.id}`)
      .then((response) => {
        if (active) setHistory(response.data.changes ?? []);
      })
      .catch(() => {
        if (active)
          setHistoryError(
            operationPhrase("Impossible de charger l’historique de cette caution."),
          );
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bond.id]);
  function openHistory() {
    const section = document.getElementById(
      `bond-history-${bond.id}`,
    ) as HTMLDetailsElement | null;
    if (section) {
      section.open = true;
      section.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    if (!historyLoading) void refreshHistory();
  }
  async function remove() {
    if (
      !window.confirm(
        activeLanguage === "ar" ? `هل تريد حذف الضمان المرتبط بالموقع ${bond.project.name}؟` : `Supprimer la caution liée au site ${bond.project.name} ?`,
      )
    )
      return;
    setDeleting(true);
    try {
      await apiRequest(`/api/v1/bonds/${bond.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }
  return (
    <div className="detail-backdrop" onMouseDown={onClose}>
      <aside
        className="detail-panel insurance-side-panel"
        role="dialog"
        aria-modal="true"
        aria-label={operationPhrase("Détail de la caution")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header">
          <div>
            <p className="section-label">{operationPhrase("Caution")}</p>
            <h2>{bond.project.name}</h2>
            <p>{bond.location?.name || operationPhrase("Localisation à compléter")}</p>
          </div>
          <button type="button" aria-label={operationPhrase("Fermer")} onClick={onClose}>
            <ActionIcon name="close" />
          </button>
        </header>
        <div className="detail-content insurance-side-content">
          <div className="detail-primary-actions">
            <button
              className="equipment-edit-button detail-toolbar-button"
              type="button"
              onClick={onEdit}
            >
              <ActionIcon name="edit" />
              {operationPhrase("Modifier")}
            </button>
            <button
              className="equipment-history-button detail-toolbar-button"
              type="button"
              onClick={() => void openHistory()}
            >
              <ActionIcon name="history" />
              {operationPhrase("Voir l’historique")}
            </button>
            <button
              className="danger-button detail-delete-button"
              type="button"
              disabled={deleting}
              onClick={() => void remove()}
              aria-label={operationPhrase("Supprimer")}
            >
              <ActionIcon name="delete" />
            </button>
          </div>
          <section>
            <h3>
              <ActionIcon name="identification" />
              {operationPhrase("Informations principales")}
            </h3>
            <dl>
              <div>
                <dt>{operationPhrase("Site / projet")}</dt>
                <dd>{bond.project.name}</dd>
              </div>
              <div>
                <dt>{operationPhrase("Localisation physique")}</dt>
                <dd>{bond.location?.name || operationPhrase("À compléter")}</dd>
              </div>
              <div>
                <dt>{operationPhrase("Type de caution")}</dt>
                <dd>{bondTypeLabel(bond.bond_type)}</dd>
              </div>
              <div>
                <dt>{operationPhrase("Banque / émetteur")}</dt>
                <dd>{bond.issuer || operationPhrase("À compléter")}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>
              <ActionIcon name="invoice" />
              {operationPhrase("Montant de la caution")}
            </h3>
            <dl>
              <div>
                <dt>{operationPhrase("Montant")}</dt>
                <dd>{formatBondAmount(bond.amount, bond.currency)}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>
              <ActionIcon name="history" />
              {operationPhrase("Période et statut")}
            </h3>
            <dl>
              <div>
                <dt>{operationPhrase("Date d’émission")}</dt>
                <dd>{formatBondDate(bond.issued_on)}</dd>
              </div>
              <div>
                <dt>{operationPhrase("Date d’expiration")}</dt>
                <dd>{formatBondDate(bond.expires_on)}</dd>
              </div>
              <div>
                <dt>{operationPhrase("Statut")}</dt>
                <dd>
                  <em className={`insurance-status ${state}`}>
                    {bondStatusLabel(state)}
                  </em>
                </dd>
              </div>
            </dl>
          </section>
          <BondDocuments
            bond={bond}
            onChanged={(documents) => onChanged({ ...bond, documents })}
          />
          <section>
            <h3>
              <ActionIcon name="note" />
              {operationPhrase("Observations")}
            </h3>
            <p className="observations">
              {bond.notes || operationPhrase("Aucune observation.")}
            </p>
          </section>
          <details id={`bond-history-${bond.id}`} className="detail-section">
            <summary>
              <h3>
                <ActionIcon name="history" />
                {operationPhrase("Historique")}
              </h3>
              <ActionIcon name="expand" />
            </summary>
            <div className="detail-section-body">
              <RecordHistory
                entries={history}
                loading={historyLoading}
                error={historyError}
                actionLabels={{
                  created: operationPhrase("Caution créée"),
                  updated: operationPhrase("Caution modifiée"),
                  document_added: operationPhrase("Document ajouté"),
                  document_deleted: operationPhrase("Document supprimé"),
                }}
                emptyDescription={operationPhrase("Les modifications de cette caution apparaîtront ici.")}
              />
            </div>
          </details>
        </div>
      </aside>
    </div>
  );
}

function BondDocuments({
  bond,
  onChanged,
}: {
  bond: Bond;
  onChanged: (documents: BondDocument[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function upload(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    let documents = bond.documents;
    try {
      for (const file of files) {
        const body = new FormData();
        body.append("documents[]", file);
        const response = await apiRequest<{ data: BondDocument[] }>(
          `/api/v1/bonds/${bond.id}/documents`,
          { method: "POST", body },
        );
        documents = [...documents, ...response.data];
        onChanged(documents);
      }
    } catch {
      setError(operationPhrase("Impossible d’ajouter les documents."));
    } finally {
      setUploading(false);
    }
  }
  async function remove(document: BondDocument) {
    if (
      !window.confirm(activeLanguage === "ar" ? `هل تريد حذف المستند « ${document.original_name} »؟` : `Supprimer le document « ${document.original_name} » ?`)
    )
      return;
    setDeletingId(document.id);
    setError(null);
    try {
      await apiRequest(`/api/v1/bonds/${bond.id}/documents/${document.id}`, {
        method: "DELETE",
      });
      onChanged(bond.documents.filter((item) => item.id !== document.id));
    } catch {
      setError(operationPhrase("Impossible de supprimer ce document."));
    } finally {
      setDeletingId(null);
    }
  }
  async function preview(document: BondDocument) {
    const url = await getAuthenticatedFileObjectUrl(
      `${document.url}?preview=1`,
    );
    window.open(url, "_blank", "noopener,noreferrer");
  }
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
      {bond.documents.length ? (
        <PaginatedDocumentList
          documents={bond.documents}
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
              <button
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
              </button>
            </article>
          )}
        />
      ) : (
        <EmptyState
          compact
          icon="invoice"
          title={operationPhrase("Aucun document ajouté")}
          description={operationPhrase("Les garanties et avenants associés apparaîtront ici.")}
        />
      )}
      <DocumentUploadDropzone
        compact
        disabled={uploading}
        title={operationPhrase(uploading ? "Ajout en cours…" : "Ajouter des documents")}
        onFiles={(files) => void upload(files)}
      />
    </section>
  );
}
