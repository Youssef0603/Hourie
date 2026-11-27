import { useEffect, useState } from "react";
import { DetailIconButton } from "../../../shared/components/DetailIconButton";
import { DocumentRow } from "../../../shared/components/DocumentRow";
import { formatFileSize } from "../../../shared/format";
import {
  apiRequest,
} from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { RenewButton } from "../../../shared/components/RenewButton";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { EmptyState } from "../../../shared/components/EmptyState";
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
  onRenew,
  readOnly = false,
  onChanged,
  onDeleted,
}: {
  bond: Bond;
  onClose: () => void;
  onEdit: () => void;
  /** Opens the one-step renewal (new expiry, bank letter, amount). */
  onRenew: () => void;
  readOnly?: boolean;
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
    // Reloads after an edit or a renewal too, so the new change shows at once.
  }, [bond]);
  async function remove() {
    if (
      !window.confirm(
        activeLanguage === "ar" ? `هل تريد حذف الضمان المرتبط بورشة العمل ${bond.project.name}؟` : `Supprimer la caution liée au chantier ${bond.project.name} ?`,
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
        className="detail-panel insurance-side-panel bond-detail-panel"
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
          {!readOnly && (
            <div className="detail-primary-actions bond-detail-actions">
              <RenewButton due={state !== "active"} onClick={onRenew} />
              <DetailIconButton icon="edit" label={operationPhrase("Modifier")} onClick={onEdit} />
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
          )}
          <section>
            <h3>
              <ActionIcon name="identification" />
              {operationPhrase("Informations principales")}
            </h3>
            <dl>
              <div>
                <dt>{operationPhrase("Chantier")}</dt>
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
              {operationPhrase("Période et état")}
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
                <dt>{operationPhrase("État")}</dt>
                <dd>
                  <em className={`insurance-status ${state}`}>
                    {bondStatusLabel(state)}
                  </em>
                </dd>
              </div>
            </dl>
          </section>
          <BondDocuments
            readOnly={readOnly}
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
  readOnly,
  onChanged,
}: {
  bond: Bond;
  readOnly: boolean;
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
            <DocumentRow
              key={document.id}
              url={document.url}
              name={document.original_name}
              meta={formatFileSize(document.size_bytes)}
              onError={setError}
              onDelete={readOnly ? undefined : () => void remove(document)}
              deleting={deletingId === document.id}
            />
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
      {!readOnly && (
        <DocumentUploadDropzone
          compact
          disabled={uploading}
          title={operationPhrase(uploading ? "Ajout en cours…" : "Ajouter des documents")}
          onFiles={(files) => void upload(files)}
        />
      )}
    </section>
  );
}
