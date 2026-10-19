import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  apiRequest,
  getAuthenticatedFileObjectUrl,
} from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { PaginatedDocumentList } from "../../../shared/components/PaginatedDocumentList";
import { RecordHistory } from "../../../shared/components/RecordHistory";
import { activeLanguage } from "../../../i18n/fr";
import { operationPhrase, operationsLocale, operationsText } from "../../../i18n/operations";
import {
  admissionError,
  fetchTemporaryAdmission,
  uploadAdmissionDocument,
} from "../api";
import type { AdmissionDocument, TemporaryAdmission } from "../types";

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
  const text = operationsText().admissions;
  const [busy, setBusy] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(
    null,
  );
  const [admissionDocuments, setAdmissionDocuments] = useState<File[]>([]);
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

  async function addAdmissionDocuments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!admissionDocuments.length) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await perform(async () => {
      let saved = item;
      for (const file of admissionDocuments) {
        saved = await uploadAdmissionDocument(
          item.id,
          "admission",
          file,
          String(form.get("document_date")),
          Number(form.get("validity_months")),
        );
        onChanged(saved);
        setAdmissionDocuments((current) => current.filter((entry) => entry !== file));
      }
      setAdmissionDocuments([]);
      formElement.reset();
    }, operationPhrase("Impossible d’ajouter ce document AT."));
  }

  async function addInvoices(files: File[]) {
    await perform(async () => {
      let saved = item;
      for (const file of files) {
        saved = await uploadAdmissionDocument(item.id, "invoice", file);
      }
      onChanged(saved);
    }, operationPhrase("Impossible d’ajouter cette facture."));
  }

  async function addInitialDocuments(files: File[]) {
    await perform(async () => {
      let saved = item;
      for (const file of files) {
        saved = await uploadAdmissionDocument(
          item.id,
          "initial",
          file,
          item.entered_on,
        );
      }
      onChanged(saved);
    }, operationPhrase("Impossible d’ajouter la déclaration."));
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
    }, operationPhrase("Impossible de clôturer cette admission."));
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
    }, operationPhrase("Impossible d’enregistrer le dédouanement."));
  }

  async function preview(document: AdmissionDocument) {
    await perform(async () => {
      const url = await getAuthenticatedFileObjectUrl(
        `${document.url}?preview=1`,
      );
      window.open(url, "_blank", "noopener,noreferrer");
    }, operationPhrase("Impossible d’ouvrir ce document."));
  }

  async function removeDocument(document: AdmissionDocument) {
    if (!window.confirm(activeLanguage === "ar" ? `هل تريد حذف « ${document.original_name} »؟` : `Supprimer « ${document.original_name} » ?`)) return;
    setDeletingDocumentId(document.id);
    await perform(async () => {
      await apiRequest(
        `/api/v1/temporary-admissions/${item.id}/documents/${document.id}`,
        { method: "DELETE" },
      );
      onChanged(await fetchTemporaryAdmission(item.id));
    }, operationPhrase("Impossible de supprimer ce document."));
    setDeletingDocumentId(null);
  }

  async function removeAdmission() {
    if (!window.confirm(activeLanguage === "ar" ? `هل تريد حذف الإدخال المؤقت « ${item.customs_reference} »؟` : `Supprimer l’AT « ${item.customs_reference} » ?`))
      return;
    await perform(async () => {
      await apiRequest(`/api/v1/temporary-admissions/${item.id}`, {
        method: "DELETE",
      });
      onDeleted();
    }, operationPhrase("Impossible de supprimer cette admission."));
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
  const atDocuments = item.documents
    .filter((document) => document.document_type === "admission")
    .sort((left, right) =>
      String(left.document_date).localeCompare(String(right.document_date)) ||
      left.id - right.id,
    );
  const latestAtDocument = [...atDocuments]
    .filter((document) => document.document_date)
    .sort((left, right) =>
      String(left.document_date).localeCompare(String(right.document_date)) ||
      left.id - right.id,
    )
    .at(-1);
  const currentValidityMonths = latestAtDocument?.validity_months ?? 12;
  const invoiceDocuments = item.documents.filter(
    (document) => document.document_type === "invoice",
  );
  const coveredEquipment = useMemo(() => {
    const terms = normalizeSearch(equipmentQuery).split(/\s+/).filter(Boolean);
    return terms.length
      ? item.equipment.filter((equipment) => {
          const searchable = normalizeSearch(
            [equipment.name, equipment.asset_code, equipment.serial_number]
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
                aria-label={`${operationPhrase("Supprimer")} ${document.original_name}`}
                onClick={() => void removeDocument(document)}
                disabled={deletingDocumentId === document.id}
              >
                {deletingDocumentId === document.id ? (
                  <LoadingSpinner compact label={operationPhrase("Suppression")} />
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
        aria-label={operationPhrase("Détail de l’admission temporaire")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header">
          <div>
            <p className="section-label">{operationPhrase("Admission temporaire")}</p>
            <h2>{item.customs_reference}</h2>
            <p>{operationPhrase("Échéance actuelle")} : {formatDate(item.expires_on)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={operationPhrase("Fermer")}>
            <ActionIcon name="close" />
          </button>
        </header>
        <div className="detail-content insurance-side-content">
          <div className="detail-primary-actions">
            {canManage && (
              <>
              <button
                className="equipment-edit-button detail-toolbar-button"
                type="button"
                onClick={onEdit}
                disabled={busy}
              >
                <ActionIcon name="edit" />
                {operationPhrase("Modifier")}
              </button>
              {!["returned", "cleared"].includes(item.status) && (
                <button
                  className="equipment-transfer-button detail-toolbar-button"
                  type="button"
                  onClick={() => setShowReturnForm(true)}
                  disabled={busy}
                >
                  <ActionIcon name="transfer" />
                  {operationPhrase("Retourner")}
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
                  {operationPhrase("Dédouaner")}
                </button>
              )}
              </>
            )}
            <button
              className="equipment-history-button detail-toolbar-button temporary-admission-history-button"
              type="button"
              aria-label={operationPhrase("Voir l’historique")}
              title={operationPhrase("Voir l’historique")}
              onClick={() => {
                const history = document.getElementById(
                  `temporary-admission-history-${item.id}`,
                ) as HTMLDetailsElement | null;
                if (history) {
                  history.open = true;
                  history.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            >
              <ActionIcon name="history" />
            </button>
            {canManage && (
              <button
                type="button"
                className="danger-button detail-delete-button"
                onClick={() => void removeAdmission()}
                disabled={busy}
                aria-label={operationPhrase("Supprimer")}
                title={operationPhrase("Supprimer")}
              >
                <ActionIcon name="delete" />
              </button>
            )}
          </div>
          {error && (
            <div className="form-alert temporary-admission-detail-alert" role="alert">
              {error}
            </div>
          )}
          <section>
            <h3>
              <ActionIcon name="identification" />
              {operationPhrase("Informations principales")}
            </h3>
            <dl>
              <div>
                <dt>{operationPhrase("Référence douane")}</dt>
                <dd>{item.customs_reference}</dd>
              </div>
              <div>
                <dt>{operationPhrase("Fournisseur")}</dt>
                <dd>{item.supplier_name || operationPhrase("À compléter")}</dd>
              </div>
              <div>
                <dt>{operationPhrase("Équipements couverts")}</dt>
                <dd>
                  {activeLanguage === "ar" ? `${item.equipment.length} معدات` : `${item.equipment.length} équipement${item.equipment.length !== 1 ? "s" : ""}`}
                </dd>
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
                <dt>{operationPhrase("Date d’entrée initiale")}</dt>
                <dd>{formatDate(item.entered_on)}</dd>
              </div>
              <div>
                <dt>{operationPhrase("Durée de la période actuelle")}</dt>
                <dd>{currentValidityMonths} {activeLanguage === "ar" ? "شهر" : "mois"}</dd>
              </div>
              <div>
                <dt>{operationPhrase("Échéance actuelle")}</dt>
                <dd>{formatDate(item.expires_on)}</dd>
              </div>
              <div>
                <dt>{operationPhrase("État")}</dt>
                <dd>
                  <em
                    className={`insurance-status ${item.status}`}
                  >
                    {text.statuses[item.status]}
                  </em>
                </dd>
              </div>
              {item.returned_on && (
                <div>
                  <dt>{operationPhrase("Date de retour")}</dt>
                  <dd>{formatDate(item.returned_on)}</dd>
                </div>
              )}
              {item.closure_reason && (
                <div>
                  <dt>{operationPhrase("Motif de clôture")}</dt>
                  <dd>{item.closure_reason}</dd>
                </div>
              )}
              {item.cleared_on && (
                <div>
                  <dt>{operationPhrase("Date de dédouanement")}</dt>
                  <dd>{formatDate(item.cleared_on)}</dd>
                </div>
              )}
              {item.clearance_reference && (
                <div>
                  <dt>{operationPhrase("Référence de dédouanement")}</dt>
                  <dd>{item.clearance_reference}</dd>
                </div>
              )}
              {item.customs_duty_amount !== null && (
                <div>
                  <dt>{operationPhrase("Droits de douane payés")}</dt>
                  <dd>{formatMoney(item.customs_duty_amount)}</dd>
                </div>
              )}
            </dl>
          </section>
          <section>
            <h3>
              <ActionIcon name="specifications" />
              {operationPhrase("Équipements couverts")}
            </h3>
            <div className="insurance-covered-equipment">
              {item.equipment.length === 0 && (
                <EmptyState
                  compact
                  icon="specifications"
                  title={operationPhrase("Aucun équipement couvert")}
                  description={operationPhrase(
                    "Aucun équipement de l’inventaire n’est associé à cette admission temporaire.",
                  )}
                />
              )}
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
                    placeholder={operationPhrase("Rechercher un équipement")}
                    aria-label={operationPhrase("Rechercher un équipement couvert")}
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
                        {entry.serial_number
                          ? `${activeLanguage === "ar" ? "رقم التسلسل" : "N° de série"} : ${entry.serial_number}`
                          : operationPhrase("N° de série non renseigné")}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
              {item.equipment.length > 0 && visibleEquipment.length === 0 && (
                <p className="document-list-empty">
                  {operationPhrase("Aucun équipement ne correspond à cette recherche.")}
                </p>
              )}
              {equipmentPageCount > 1 && (
                <nav
                  className="document-list-pagination"
                  aria-label={operationPhrase("Pagination des équipements couverts")}
                >
                  <button
                    type="button"
                    disabled={currentEquipmentPage === 0}
                    onClick={() => setEquipmentPage((page) => page - 1)}
                  >
                    {operationPhrase("Précédent")}
                  </button>
                  <span>
                    {currentEquipmentPage + 1} / {equipmentPageCount}
                  </span>
                  <button
                    type="button"
                    disabled={currentEquipmentPage === equipmentPageCount - 1}
                    onClick={() => setEquipmentPage((page) => page + 1)}
                  >
                    {operationPhrase("Suivant")}
                  </button>
                </nav>
              )}
            </div>
          </section>
          <section className="insurance-documents-section">
            <h3>
              <ActionIcon name="invoice" />
              {operationPhrase("Documents")}
            </h3>
            <div className="temporary-admission-documents-group">
              <h4>{operationPhrase("Déclaration")}</h4>
              {documentList(
                initialDocuments,
                operationPhrase("Aucune déclaration enregistrée."),
              )}
              {canManage && (
                <DocumentUploadDropzone
                  compact
                  disabled={busy || !item.entered_on}
                  title={
                    operationPhrase(!item.entered_on ? "Renseignez d’abord la date d’entrée" : busy ? "Ajout en cours…" : "Ajouter la déclaration")
                  }
                  description={operationPhrase(item.entered_on ? "Un ou plusieurs documents de déclaration · PDF · 10 Mo maximum par fichier" : "Modifiez la fiche pour renseigner la date figurant sur la déclaration.")}
                  onFiles={(files) => void addInitialDocuments(files)}
                />
              )}
            </div>
            <div className="temporary-admission-documents-group">
              <h4>{operationPhrase("Documents AT")}</h4>
              {documentList(atDocuments, operationPhrase("Aucun document AT enregistré."))}
              {canManage && !["returned", "cleared"].includes(item.status) && (
                <form
                  className="temporary-admission-document-form"
                  onSubmit={addAdmissionDocuments}
                >
                  <p className="temporary-admission-action-hint">
                    {operationPhrase("L’échéance reste calculée depuis la date d’entrée de la déclaration. La durée de cet AT prolonge la période actuelle.")}
                  </p>
                  <label>
                    {operationPhrase("Date de l’AT")}
                    <input required type="date" name="document_date" />
                  </label>
                  <label>
                    {operationPhrase("Durée de validité (mois)")}
                    <input
                      required
                      type="number"
                      name="validity_months"
                      min={1}
                      max={120}
                      step={1}
                      defaultValue={currentValidityMonths}
                    />
                  </label>
                  <DocumentUploadDropzone
                    compact
                    disabled={busy}
                    title={selectedAtDocumentsTitle(admissionDocuments)}
                    description={operationPhrase("Un ou plusieurs documents AT · PDF · 10 Mo maximum par fichier")}
                    onFiles={(files) =>
                      setAdmissionDocuments((current) => [
                        ...current,
                        ...files,
                      ])
                    }
                  />
                  {admissionDocuments.length > 0 && (
                    <ul className="temporary-admission-selected-files">
                      {admissionDocuments.map((file, index) => (
                        <li key={`${file.name}-${file.lastModified}-${index}`}>
                          <span>{file.name}</span>
                          <button
                            type="button"
                            aria-label={`Retirer ${file.name}`}
                            onClick={() =>
                              setAdmissionDocuments((current) =>
                                current.filter(
                                  (_, candidate) => candidate !== index,
                                ),
                              )
                            }
                          >
                            <ActionIcon name="delete" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    className="primary-button temporary-admission-document-action"
                    disabled={busy || !admissionDocuments.length}
                  >
                    {operationPhrase("Ajouter l’AT")}
                  </button>
                </form>
              )}
            </div>
            <div className="temporary-admission-documents-group">
              <h4>{operationPhrase("Factures")}</h4>
              {documentList(invoiceDocuments, operationPhrase("Aucune facture ajoutée."))}
              {canManage && (
                <DocumentUploadDropzone
                  compact
                  disabled={busy}
                  title={operationPhrase(busy ? "Ajout en cours…" : "Ajouter une facture")}
                  description={operationPhrase("Une ou plusieurs factures · PDF · 10 Mo maximum par fichier")}
                  onFiles={(files) => void addInvoices(files)}
                />
              )}
            </div>
          </section>
          <section>
            <h3>
              <ActionIcon name="note" />
              {operationPhrase("Observations")}
            </h3>
            <p className="observations">
              {item.notes || operationPhrase("Aucune observation.")}
            </p>
          </section>
          <details
            id={`temporary-admission-history-${item.id}`}
            className="detail-section"
          >
            <summary>
              <h3>
                <ActionIcon name="history" />
                {operationPhrase("Historique")}
              </h3>
              <ActionIcon name="expand" />
            </summary>
            <div className="detail-section-body">
              <RecordHistory
                entries={item.changes ?? []}
                actionLabels={{
                  created: operationPhrase("Admission créée"),
                  updated: operationPhrase("Admission modifiée"),
                  renewed: operationPhrase("Document AT ajouté"),
                  document_added: operationPhrase("Document ajouté"),
                  document_deleted: operationPhrase("Document supprimé"),
                  returned: operationPhrase("Équipements retournés"),
                  customs_cleared: operationPhrase("Admission dédouanée"),
                }}
                emptyDescription={operationPhrase("Les modifications de cette admission apparaîtront ici.")}
              />
            </div>
          </details>
          {canManage && !["returned", "cleared"].includes(item.status) && (
            <>
              {showReturnForm && (
                <section
                  ref={returnSectionRef}
                  className="temporary-admission-action-section"
                >
                  <h3>
                    <ActionIcon name="transfer" />
                    {operationPhrase("Retour des équipements")}
                  </h3>
                  <p className="temporary-admission-action-hint">
                    {operationPhrase("Utilisez cette action lorsque les équipements quittent le pays et ne sont plus couverts par cette admission.")}
                  </p>
                  <form onSubmit={closeAdmission}>
                    <div className="temporary-admission-form-grid">
                      <label>
                        {operationPhrase("Date de retour")}
                        <input required type="date" name="returned_on" />
                      </label>
                      <label>
                        {operationPhrase("Motif")}
                        <input
                          name="closure_reason"
                          placeholder={operationPhrase("Fin du projet, réexportation…")}
                        />
                      </label>
                    </div>
                    <div className="temporary-admission-form-actions">
                      <button
                        type="button"
                        className="secondary-button temporary-admission-form-action-button"
                        onClick={() => setShowReturnForm(false)}
                      >
                        {operationPhrase("Annuler")}
                      </button>
                      <button
                        className="primary-button temporary-admission-form-action-button"
                        disabled={busy}
                      >
                        {operationPhrase("Confirmer le retour")}
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
                    {operationPhrase("Dédouanement")}
                  </h3>
                  <p className="temporary-admission-action-hint">
                    {operationPhrase("Utilisez cette action quand les droits de douane sont payés et que les équipements restent dans le pays.")}
                  </p>
                  <form onSubmit={clearCustoms}>
                    <div className="temporary-admission-form-grid">
                      <label>
                        {operationPhrase("Date de dédouanement")}
                        <input required type="date" name="cleared_on" />
                      </label>
                      <label>
                        {operationPhrase("Référence de dédouanement")}
                        <input
                          name="clearance_reference"
                          placeholder={operationPhrase("N° de liquidation ou quittance")}
                        />
                      </label>
                      <label className="field-wide">
                        {operationPhrase("Droits de douane payés (FCFA)")}
                        <input
                          required
                          inputMode="numeric"
                          name="customs_duty_amount"
                          placeholder={operationPhrase("Ex. 12 500 000")}
                        />
                      </label>
                    </div>
                    <div className="temporary-admission-form-actions">
                      <button
                        type="button"
                        className="secondary-button temporary-admission-form-action-button"
                        onClick={() => setShowClearanceForm(false)}
                      >
                        {operationPhrase("Annuler")}
                      </button>
                      <button
                        className="primary-button temporary-admission-form-action-button"
                        disabled={busy}
                      >
                        {operationPhrase("Confirmer le dédouanement")}
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

function formatDate(value: string | null) {
  if (!value) return operationPhrase("À compléter");
  return new Intl.DateTimeFormat(operationsLocale()).format(new Date(`${value}T00:00:00`));
}

function formatMoney(value: string) {
  return `${new Intl.NumberFormat(operationsLocale(), {
    maximumFractionDigits: 0,
  }).format(Number(value))} FCFA`;
}

function selectedAtDocumentsTitle(files: File[]) {
  if (!files.length) return operationPhrase("Ajouter des documents AT");
  return activeLanguage === "ar" ? `${files.length} مستند إدخال مؤقت محدد` : `${files.length} document${files.length > 1 ? "s" : ""} AT sélectionné${files.length > 1 ? "s" : ""}`;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim();
}
