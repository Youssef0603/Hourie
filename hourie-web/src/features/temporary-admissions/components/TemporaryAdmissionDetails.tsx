import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  apiRequest,
  getAuthenticatedFileObjectUrl,
} from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { PaginatedDocumentList } from "../../../shared/components/PaginatedDocumentList";
import {
  admissionError,
  fetchTemporaryAdmission,
  uploadAdmissionDocument,
} from "../api";
import type { AdmissionDocument, TemporaryAdmission } from "../types";

const labels = {
  active: "Active",
  renewed: "Renouvelée",
  returned: "Retournée",
  cleared: "Dédouanée",
  expired: "Expirée",
};

export function TemporaryAdmissionDetails({
  item,
  canManage,
  onClose,
  onEdit,
  onChanged,
  onDeleted,
  onOpenEquipment,
  nested = false,
}: {
  item: TemporaryAdmission;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onChanged: (item: TemporaryAdmission) => void;
  onDeleted: () => void;
  onOpenEquipment?: (equipmentId: number) => void;
  nested?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(
    null,
  );
  const [renewalDocument, setRenewalDocument] = useState<File | null>(null);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showClearanceForm, setShowClearanceForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipmentQuery, setEquipmentQuery] = useState("");
  const [equipmentPage, setEquipmentPage] = useState(0);
  const returnSectionRef = useRef<HTMLElement>(null);
  const clearanceSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (showReturnForm) {
      returnSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [showReturnForm]);

  useEffect(() => {
    if (showClearanceForm) {
      clearanceSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [showClearanceForm]);

  async function renew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renewalDocument) return;
    const form = new FormData(event.currentTarget);
    await perform(async () => {
      onChanged(
        await uploadAdmissionDocument(
          item.id,
          "renewal",
          renewalDocument,
          String(form.get("renewed_on")),
        ),
      );
      setRenewalDocument(null);
      event.currentTarget.reset();
    }, "Impossible d’ajouter ce renouvellement.");
  }

  async function addInvoice(file: File) {
    await perform(async () => {
      onChanged(await uploadAdmissionDocument(item.id, "invoice", file));
    }, "Impossible d’ajouter cette facture.");
  }

  async function addInitialDocument(file: File) {
    await perform(async () => {
      onChanged(
        await uploadAdmissionDocument(
          item.id,
          "initial",
          file,
          item.entered_on,
        ),
      );
    }, "Impossible d’ajouter le document initial.");
  }

  async function closeAdmission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await perform(async () => {
      const result = await apiRequest<{ data: TemporaryAdmission }>(
        `/api/v1/temporary-admissions/${item.id}/return`,
        {
          method: "POST",
          body: JSON.stringify({
            returned_on: form.get("returned_on"),
            closure_reason: form.get("closure_reason") || null,
          }),
        },
      );
      onChanged(result.data);
      setShowReturnForm(false);
    }, "Impossible de clôturer cette admission.");
  }

  async function clearCustoms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await perform(async () => {
      const result = await apiRequest<{ data: TemporaryAdmission }>(
        `/api/v1/temporary-admissions/${item.id}/clear-customs`,
        {
          method: "POST",
          body: JSON.stringify({
            cleared_on: form.get("cleared_on"),
            clearance_reference: form.get("clearance_reference") || null,
            customs_duty_amount: Number(
              String(form.get("customs_duty_amount") ?? "").replace(
                /[^\d]/g,
                "",
              ),
            ),
          }),
        },
      );
      onChanged(result.data);
      setShowClearanceForm(false);
    }, "Impossible d’enregistrer le dédouanement.");
  }

  async function preview(document: AdmissionDocument) {
    await perform(async () => {
      const url = await getAuthenticatedFileObjectUrl(
        `${document.url}?preview=1`,
      );
      window.open(url, "_blank", "noopener,noreferrer");
    }, "Impossible d’ouvrir ce document.");
  }

  async function removeDocument(document: AdmissionDocument) {
    if (!window.confirm(`Supprimer « ${document.original_name} » ?`)) return;
    setDeletingDocumentId(document.id);
    await perform(async () => {
      await apiRequest(
        `/api/v1/temporary-admissions/${item.id}/documents/${document.id}`,
        { method: "DELETE" },
      );
      onChanged(await fetchTemporaryAdmission(item.id));
    }, "Impossible de supprimer ce document.");
    setDeletingDocumentId(null);
  }

  async function removeAdmission() {
    if (!window.confirm(`Supprimer l’AT « ${item.customs_reference} » ?`))
      return;
    await perform(async () => {
      await apiRequest(`/api/v1/temporary-admissions/${item.id}`, {
        method: "DELETE",
      });
      onDeleted();
    }, "Impossible de supprimer cette admission.");
  }

  async function perform(action: () => Promise<void>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(admissionError(caught, fallback));
    } finally {
      setBusy(false);
    }
  }

  const initialDocuments = item.documents.filter(
    (document) => document.document_type === "initial",
  );
  const renewalDocuments = item.documents.filter(
    (document) => document.document_type === "renewal",
  );
  const invoiceDocuments = item.documents.filter(
    (document) => document.document_type === "invoice",
  );
  const coveredEquipment = useMemo(() => {
    const terms = normalizeSearch(equipmentQuery).split(/\s+/).filter(Boolean);
    return terms.length
      ? item.equipment.filter((equipment) => {
          const searchable = normalizeSearch(
            [equipment.name, equipment.asset_code, equipment.chassis_number]
              .filter(Boolean)
              .join(" "),
          );
          const compactSearchable = searchable.replace(/[^a-z0-9]/g, "");
          return terms.every(
            (term) =>
              searchable.includes(term) ||
              compactSearchable.includes(term.replace(/[^a-z0-9]/g, "")),
          );
        })
      : item.equipment;
  }, [equipmentQuery, item.equipment]);
  const equipmentPageCount = Math.max(
    1,
    Math.ceil(coveredEquipment.length / 3),
  );
  const currentEquipmentPage = Math.min(equipmentPage, equipmentPageCount - 1);
  const visibleEquipment = coveredEquipment.slice(
    currentEquipmentPage * 3,
    currentEquipmentPage * 3 + 3,
  );

  function documentList(documents: AdmissionDocument[], emptyMessage: string) {
    if (!documents.length) {
      return <p className="document-list-empty">{emptyMessage}</p>;
    }

    return (
      <PaginatedDocumentList
        documents={documents}
        emptyMessage={emptyMessage}
        renderDocument={(document) => (
          <article key={document.id}>
            <button
              type="button"
              className="invoice-preview-button"
              onClick={() => void preview(document)}
              disabled={busy}
            >
              <span className="invoice-pdf-badge">PDF</span>
              <span>
                <strong>{document.original_name}</strong>
                {document.document_date && (
                  <small>{formatDate(document.document_date)}</small>
                )}
              </span>
            </button>
            {canManage && (
              <button
                type="button"
                className="invoice-delete-button"
                aria-label={`Supprimer ${document.original_name}`}
                onClick={() => void removeDocument(document)}
                disabled={deletingDocumentId === document.id}
              >
                {deletingDocumentId === document.id ? (
                  <LoadingSpinner compact label="Suppression" />
                ) : (
                  <ActionIcon name="delete" />
                )}
              </button>
            )}
          </article>
        )}
      />
    );
  }

  return (
    <div
      className={`detail-backdrop${nested ? " nested-detail-backdrop" : ""}`}
      onMouseDown={onClose}
    >
      <aside
        className="detail-panel insurance-side-panel temporary-admission-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Détail de l’admission temporaire"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header">
          <div>
            <p className="section-label">Admission temporaire</p>
            <h2>{item.customs_reference}</h2>
            <p>Échéance actuelle : {formatDate(item.expires_on)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <ActionIcon name="close" />
          </button>
        </header>
        <div className="detail-content insurance-side-content">
          {canManage && (
            <div className="detail-primary-actions">
              <button
                className="equipment-edit-button detail-toolbar-button"
                type="button"
                onClick={onEdit}
                disabled={busy}
              >
                <ActionIcon name="edit" />
                Modifier
              </button>
              {!["returned", "cleared"].includes(item.status) && (
                <button
                  className="equipment-transfer-button detail-toolbar-button"
                  type="button"
                  onClick={() => setShowReturnForm(true)}
                  disabled={busy}
                >
                  <ActionIcon name="transfer" />
                  Retourner les équipements
                </button>
              )}
              {!["returned", "cleared"].includes(item.status) && (
                <button
                  className="equipment-transfer-button detail-toolbar-button"
                  type="button"
                  onClick={() => setShowClearanceForm(true)}
                  disabled={busy}
                >
                  <ActionIcon name="invoice" />
                  Dédouaner
                </button>
              )}
              <button
                type="button"
                className="danger-button detail-delete-button"
                onClick={() => void removeAdmission()}
                disabled={busy}
                aria-label="Supprimer"
              >
                <ActionIcon name="delete" />
              </button>
            </div>
          )}
          {error && (
            <div className="form-alert" role="alert">
              {error}
            </div>
          )}
          <section>
            <h3>
              <ActionIcon name="identification" />
              Informations principales
            </h3>
            <dl>
              <div>
                <dt>Référence douane</dt>
                <dd>{item.customs_reference}</dd>
              </div>
              <div>
                <dt>Équipements couverts</dt>
                <dd>
                  {item.equipment.length} équipement
                  {item.equipment.length !== 1 ? "s" : ""}
                </dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>
              <ActionIcon name="history" />
              Période et statut
            </h3>
            <dl>
              <div>
                <dt>Date d’entrée initiale</dt>
                <dd>{formatDate(item.entered_on)}</dd>
              </div>
              <div>
                <dt>Échéance actuelle</dt>
                <dd>{formatDate(item.expires_on)}</dd>
              </div>
              <div>
                <dt>Statut</dt>
                <dd>
                  <em
                    className={`insurance-status ${item.status === "renewed" ? "active" : item.status}`}
                  >
                    {labels[item.status]}
                  </em>
                </dd>
              </div>
              {item.returned_on && (
                <div>
                  <dt>Date de retour</dt>
                  <dd>{formatDate(item.returned_on)}</dd>
                </div>
              )}
              {item.closure_reason && (
                <div>
                  <dt>Motif de clôture</dt>
                  <dd>{item.closure_reason}</dd>
                </div>
              )}
              {item.cleared_on && (
                <div>
                  <dt>Date de dédouanement</dt>
                  <dd>{formatDate(item.cleared_on)}</dd>
                </div>
              )}
              {item.clearance_reference && (
                <div>
                  <dt>Référence de dédouanement</dt>
                  <dd>{item.clearance_reference}</dd>
                </div>
              )}
              {item.customs_duty_amount !== null && (
                <div>
                  <dt>Droits de douane payés</dt>
                  <dd>{formatMoney(item.customs_duty_amount)}</dd>
                </div>
              )}
            </dl>
          </section>
          <section>
            <h3>
              <ActionIcon name="specifications" />
              Équipements couverts
            </h3>
            <div className="insurance-covered-equipment">
              {item.equipment.length > 0 && (
                <label className="document-list-search">
                  <ActionIcon name="search" />
                  <input
                    type="search"
                    value={equipmentQuery}
                    onChange={(event) => {
                      setEquipmentQuery(event.target.value);
                      setEquipmentPage(0);
                    }}
                    placeholder="Rechercher un équipement"
                    aria-label="Rechercher un équipement couvert"
                  />
                </label>
              )}
              <ul>
                {visibleEquipment.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className="related-equipment-link"
                      onClick={() => onOpenEquipment?.(entry.id)}
                      disabled={!onOpenEquipment}
                    >
                      <strong>{entry.name}</strong>
                      <small>
                        {entry.chassis_number
                          ? `N° de châssis : ${entry.chassis_number}`
                          : "N° de châssis non renseigné"}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
              {item.equipment.length > 0 && visibleEquipment.length === 0 && (
                <p className="document-list-empty">
                  Aucun équipement ne correspond à cette recherche.
                </p>
              )}
              {equipmentPageCount > 1 && (
                <nav
                  className="document-list-pagination"
                  aria-label="Pagination des équipements couverts"
                >
                  <button
                    type="button"
                    disabled={currentEquipmentPage === 0}
                    onClick={() => setEquipmentPage((page) => page - 1)}
                  >
                    Précédent
                  </button>
                  <span>
                    {currentEquipmentPage + 1} / {equipmentPageCount}
                  </span>
                  <button
                    type="button"
                    disabled={currentEquipmentPage === equipmentPageCount - 1}
                    onClick={() => setEquipmentPage((page) => page + 1)}
                  >
                    Suivant
                  </button>
                </nav>
              )}
            </div>
          </section>
          <section className="insurance-documents-section">
            <h3>
              <ActionIcon name="invoice" />
              Documents
            </h3>
            <div className="temporary-admission-documents-group">
              <h4>Document initial</h4>
              {documentList(initialDocuments, "Aucun document initial.")}
              {canManage && initialDocuments.length === 0 && (
                <DocumentUploadDropzone
                  compact
                  disabled={busy}
                  title={
                    busy ? "Ajout en cours…" : "Ajouter le document initial"
                  }
                  description="Document initial PDF · 10 Mo maximum"
                  onFiles={(files) =>
                    files[0] && void addInitialDocument(files[0])
                  }
                />
              )}
            </div>
            <div className="temporary-admission-documents-group">
              <h4>Renouvellements</h4>
              {documentList(
                renewalDocuments,
                "Aucun renouvellement enregistré.",
              )}
              {canManage && !["returned", "cleared"].includes(item.status) && (
                <form
                  className="temporary-admission-renewal-form"
                  onSubmit={renew}
                >
                  <label>
                    Date du renouvellement
                    <input required type="date" name="renewed_on" />
                  </label>
                  <DocumentUploadDropzone
                    compact
                    disabled={busy}
                    title={
                      renewalDocument?.name ??
                      "Ajouter le document de renouvellement"
                    }
                    description="Document de renouvellement · PDF · 10 Mo maximum"
                    onFiles={(files) => setRenewalDocument(files[0] ?? null)}
                  />
                  <button
                    className="primary-button temporary-admission-document-action"
                    disabled={busy || !renewalDocument}
                  >
                    Renouveler
                  </button>
                </form>
              )}
            </div>
            <div className="temporary-admission-documents-group">
              <h4>Factures</h4>
              {documentList(invoiceDocuments, "Aucune facture ajoutée.")}
              {canManage && (
                <DocumentUploadDropzone
                  compact
                  disabled={busy}
                  title={busy ? "Ajout en cours…" : "Ajouter une facture"}
                  description="Facture PDF · 10 Mo maximum"
                  onFiles={(files) => files[0] && void addInvoice(files[0])}
                />
              )}
            </div>
          </section>
          <section>
            <h3>
              <ActionIcon name="note" />
              Observations
            </h3>
            <p className="observations">
              {item.notes || "Aucune observation."}
            </p>
          </section>
          {canManage && !["returned", "cleared"].includes(item.status) && (
            <>
              {showReturnForm && (
                <section
                  ref={returnSectionRef}
                  className="temporary-admission-action-section"
                >
                  <h3>
                    <ActionIcon name="transfer" />
                    Retour des équipements
                  </h3>
                  <p className="temporary-admission-action-hint">
                    Utilisez cette action lorsque les équipements quittent le
                    pays et ne sont plus couverts par cette admission.
                  </p>
                  <form onSubmit={closeAdmission}>
                    <div className="temporary-admission-form-grid">
                      <label>
                        Date de retour
                        <input required type="date" name="returned_on" />
                      </label>
                      <label>
                        Motif
                        <input
                          name="closure_reason"
                          placeholder="Fin du projet, réexportation…"
                        />
                      </label>
                    </div>
                    <div className="temporary-admission-form-actions">
                      <button
                        type="button"
                        className="secondary-button temporary-admission-form-action-button"
                        onClick={() => setShowReturnForm(false)}
                      >
                        Annuler
                      </button>
                      <button
                        className="primary-button temporary-admission-form-action-button"
                        disabled={busy}
                      >
                        Confirmer le retour
                      </button>
                    </div>
                  </form>
                </section>
              )}
              {showClearanceForm && (
                <section
                  ref={clearanceSectionRef}
                  className="temporary-admission-action-section"
                >
                  <h3>
                    <ActionIcon name="invoice" />
                    Dédouanement
                  </h3>
                  <p className="temporary-admission-action-hint">
                    Utilisez cette action quand les droits de douane sont payés
                    et que les équipements restent dans le pays.
                  </p>
                  <form onSubmit={clearCustoms}>
                    <div className="temporary-admission-form-grid">
                      <label>
                        Date de dédouanement
                        <input required type="date" name="cleared_on" />
                      </label>
                      <label>
                        Référence de dédouanement
                        <input
                          name="clearance_reference"
                          placeholder="N° de liquidation ou quittance"
                        />
                      </label>
                      <label className="field-wide">
                        Droits de douane payés (FCFA)
                        <input
                          required
                          inputMode="numeric"
                          name="customs_duty_amount"
                          placeholder="Ex. 12 500 000"
                        />
                      </label>
                    </div>
                    <div className="temporary-admission-form-actions">
                      <button
                        type="button"
                        className="secondary-button temporary-admission-form-action-button"
                        onClick={() => setShowClearanceForm(false)}
                      >
                        Annuler
                      </button>
                      <button
                        className="primary-button temporary-admission-form-action-button"
                        disabled={busy}
                      >
                        Confirmer le dédouanement
                      </button>
                    </div>
                  </form>
                </section>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T00:00:00`));
}

function formatMoney(value: string) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(Number(value))} FCFA`;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim();
}
