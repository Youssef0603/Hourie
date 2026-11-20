import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiErrorMessage } from "../../../shared/api/errors";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentRow } from "../../../shared/components/DocumentRow";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { InvoiceEntryForm } from "../../../shared/components/InvoiceEntryForm";
import { PaginatedDocumentList } from "../../../shared/components/PaginatedDocumentList";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { formatDate, formatFileSize } from "../../../shared/format";
import { InventoryFormSection } from "../../equipment/components/AssetForm";
import { EquipmentCreationPanel } from "../../equipment/components/EquipmentCreationPanel";
import {
  deleteValuation,
  getValuation,
  runValuationAction,
  saveValuation,
  saveValuationInvoice,
  uploadValuationDocuments,
  type ValuationAction,
} from "../api";
import { money, quantity, valuationStatusLabels } from "../display";
import type { Subcontract, SubcontractValuation, ValuationPayload } from "../types";

type Draft = Omit<ValuationPayload, "lines"> & { quantities: Record<number, string> };

function draftFrom(valuation: SubcontractValuation | null, subcontract: Subcontract): Draft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    valuation_date: valuation?.valuation_date ?? today,
    period_end: valuation?.period_end ?? today,
    materials_deduction: String(Number(valuation?.materials_deduction ?? 0)),
    backcharges: String(Number(valuation?.backcharges ?? 0)),
    comment: valuation?.comment ?? "",
    quantities: Object.fromEntries(
      valuation
        ? valuation.lines.map((line) => [line.subcontract_item_id, String(Number(line.cumulative_quantity))])
        : subcontract.items.map((item) => [item.id, String(Number(item.executed_quantity))]),
    ),
  };
}

/**
 * Monthly valuation (situation de travaux): the site engineer enters the
 * cumulative quantity executed per work item; the server calculates every
 * amount down to the net due, following the subcontractor valuation form.
 */
export function ValuationPanel({ subcontract, valuationId, canManage, onClose, onChanged }: {
  subcontract: Subcontract;
  valuationId: number | null;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [valuation, setValuation] = useState<SubcontractValuation | null>(null);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(null, subcontract));
  const [loading, setLoading] = useState(valuationId !== null);
  const [busy, setBusy] = useState(false);
  /** Documents picked before the situation exists; uploaded on the first save. */
  const [pendingDocuments, setPendingDocuments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const applyValuation = useCallback((loaded: SubcontractValuation) => {
    setValuation(loaded);
    setDraft(draftFrom(loaded, subcontract));
  }, [subcontract]);

  useEffect(() => {
    if (valuationId === null) return;
    getValuation(valuationId)
      .then(applyValuation)
      .catch(() => setError("Impossible de charger la situation."))
      .finally(() => setLoading(false));
  }, [valuationId, applyValuation]);

  const editable = canManage && (valuation === null || valuation.status === "draft");
  const lines = valuation?.lines ?? subcontract.items.map((item) => ({
    subcontract_item_id: item.id,
    code: item.code,
    description: item.description,
    unit: item.unit,
    unit_price: item.unit_price,
    authorized_quantity: item.authorized_quantity,
    previous_quantity: item.executed_quantity,
    cumulative_quantity: item.executed_quantity,
    period_quantity: "0",
    cumulative_amount: "0",
  }));

  /** Runs an action, refreshes the valuation and reports whether it succeeded. */
  async function run(task: () => Promise<SubcontractValuation | void>, failure: string): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const result = await task();
      if (result) applyValuation(result);
      onChanged();
      return true;
    } catch (exception) {
      setError(apiErrorMessage(exception, failure));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function payload(): ValuationPayload {
    return {
      valuation_date: draft.valuation_date,
      period_end: draft.period_end,
      materials_deduction: draft.materials_deduction || "0",
      backcharges: draft.backcharges || "0",
      comment: draft.comment,
      lines: Object.entries(draft.quantities).map(([itemId, value]) => ({ subcontract_item_id: Number(itemId), cumulative_quantity: value || "0" })),
    };
  }

  function save(event?: FormEvent) {
    event?.preventDefault();
    return run(async () => {
      const saved = await saveValuation(payload(), valuation ? { valuationId: valuation.id } : { subcontractId: subcontract.id });
      if (!pendingDocuments.length) return saved;
      // Keep the saved situation even if the upload below fails, so a retry updates it instead of creating another.
      applyValuation(saved);
      await uploadValuationDocuments(saved.id, pendingDocuments);
      setPendingDocuments([]);
      return getValuation(saved.id);
    }, "Impossible d’enregistrer la situation.");
  }

  function action(name: ValuationAction, failure: string) {
    if (!valuation) return;
    return run(async () => {
      if (name === "submit") await saveValuation(payload(), { valuationId: valuation.id });
      return runValuationAction(valuation.id, name);
    }, failure);
  }

  function remove() {
    if (!valuation || !window.confirm(`Supprimer la situation ${valuation.reference} ?`)) return;
    void run(async () => {
      await deleteValuation(valuation.id);
      onClose();
    }, "Impossible de supprimer la situation.");
  }

  const calculation = valuation?.calculation;
  const currency = subcontract.currency;

  return (
    <EquipmentCreationPanel
      eyebrow={`${subcontract.reference} · ${subcontract.subcontractor.name}`}
      title={valuation ? `Situation ${valuation.reference}` : "Nouvelle situation"}
      subtitle={editable ? undefined : valuation?.status === "paid" ? "Situation payée : consultation uniquement." : "Situation verrouillée : consultation et suivi de l’approbation."}
      action={editable ? <button className="primary-button" type="submit" form="valuation-form" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button> : undefined}
      onClose={onClose}
    >
      {loading ? <LoadingSpinner label="Chargement de la situation…" /> : (
        <form id="valuation-form" className="generator-create-form asset-form subcontract-editor valuation-editor" onSubmit={(event) => void save(event)}>
          {error && <div className="form-alert" role="alert">{error}</div>}
          {valuation && (
            <div className="sc-status-row">
              <em className={`valuation-status ${valuation.status}`}>{valuationStatusLabels[valuation.status]}</em>
              {valuation.approved_by && <span>Approuvée par {valuation.approved_by}{valuation.approved_at ? ` le ${formatDate(valuation.approved_at, { style: "medium" })}` : ""}</span>}
            </div>
          )}
          <div className="asset-form-layout">
            <InventoryFormSection title="Période" icon="identification">
              <div className="maintenance-form-grid asset-form-grid-2">
                <label><span>Date de la situation</span><input required type="date" disabled={!editable} value={draft.valuation_date} onChange={(event) => setDraft((current) => ({ ...current, valuation_date: event.target.value }))} /></label>
                <label><span>Travaux exécutés jusqu’au</span><input required type="date" disabled={!editable} value={draft.period_end} onChange={(event) => setDraft((current) => ({ ...current, period_end: event.target.value }))} /></label>
              </div>
            </InventoryFormSection>

            <InventoryFormSection title="Quantités exécutées (cumul)" icon="specifications">
              <div className="sc-table-wrap">
                <table className="sc-table">
                  <thead><tr><th>Article</th><th className="num">Autorisé</th><th className="num">Précédent</th><th className="num">Cumul à ce jour</th><th className="num">Période</th><th className="num">Montant cumulé</th></tr></thead>
                  <tbody>
                    {lines.map((line) => {
                      const cumulative = Number(draft.quantities[line.subcontract_item_id] ?? line.cumulative_quantity);
                      const isOver = cumulative > Number(line.authorized_quantity);
                      return (
                        <tr key={line.subcontract_item_id} className={isOver ? "over" : undefined}>
                          <td><strong>{line.description}</strong><div className="muted">{line.code ?? "Sans code"} · {money(line.unit_price, currency)} / {line.unit}</div>{isOver && <div className="muted">Dépasse l’autorisé : un avenant est nécessaire.</div>}</td>
                          <td className="num">{quantity(line.authorized_quantity)}</td>
                          <td className="num">{quantity(line.previous_quantity)}</td>
                          <td className={editable ? undefined : "num"}>{editable
                            ? <input type="number" min="0" step="0.001" aria-label={`Cumul pour ${line.description}`} value={draft.quantities[line.subcontract_item_id] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, quantities: { ...current.quantities, [line.subcontract_item_id]: event.target.value } }))} />
                            : <strong>{quantity(cumulative)}</strong>}</td>
                          <td className="num">{quantity(cumulative - Number(line.previous_quantity))}</td>
                          <td className="num">{money(cumulative * Number(line.unit_price), currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </InventoryFormSection>

            <InventoryFormSection title="Déductions" icon="note">
              <div className="maintenance-form-grid asset-form-grid-2">
                <label><span>Matériaux fournis par ARH (HT)</span><input type="number" min="0" step="1" disabled={!editable} value={draft.materials_deduction} onChange={(event) => setDraft((current) => ({ ...current, materials_deduction: event.target.value }))} /></label>
                <label><span>Pénalités et retenues diverses</span><input type="number" min="0" step="1" disabled={!editable} value={draft.backcharges} onChange={(event) => setDraft((current) => ({ ...current, backcharges: event.target.value }))} /></label>
                <label className="field-wide"><span>Commentaire</span><input disabled={!editable} value={draft.comment ?? ""} onChange={(event) => setDraft((current) => ({ ...current, comment: event.target.value }))} /></label>
              </div>
            </InventoryFormSection>

            <InventoryFormSection title="Calcul de la situation" icon="invoice">
              {!calculation ? <div className="notice info">Enregistrez la situation pour calculer le net à payer.</div> : (
                <div className="sc-calculation">
                  <div><span>01</span>Travaux exécutés (cumul)<b>{money(calculation.works_cumulative, currency)}</b></div>
                  <div><span>02</span>Moins travaux des situations précédentes<b>− {money(calculation.works_previous, currency)}</b></div>
                  <div className="subtotal"><span>03</span>Travaux de la période<b>{money(calculation.works_this_period, currency)}</b></div>
                  <div><span>04</span>Récupération de l’avance ({Number(subcontract.advance_recovery_rate)} %, cumul)<b>− {money(calculation.advance_recovery_cumulative, currency)}</b></div>
                  <div><span>05</span>Retenue de garantie ({Number(subcontract.retention_rate)} %, cumul)<b>− {money(calculation.retention_cumulative, currency)}</b></div>
                  <div className="subtotal"><span>06</span>Montant certifié cumulé [01 − 04 − 05]<b>{money(calculation.certified_cumulative, currency)}</b></div>
                  <div><span>07</span>Moins déjà certifié<b>− {money(calculation.previously_certified, currency)}</b></div>
                  <div className="subtotal"><span>08</span>Montant de la situation HT [06 − 07]<b>{money(calculation.this_valuation_before_vat, currency)}</b></div>
                  <div><span>09</span>TVA ({Number(subcontract.vat_rate)} %)<b>{money(calculation.vat_amount, currency)}</b></div>
                  <div><span>10</span>Moins matériaux fournis<b>− {money(calculation.materials_deduction, currency)}</b></div>
                  <div><span>11</span>Moins pénalités et retenues<b>− {money(calculation.backcharges, currency)}</b></div>
                  <div className="total"><span>12</span>NET À PAYER [08 + 09 − 10 − 11]<b>{money(calculation.net_due, currency)}</b></div>
                </div>
              )}
              {calculation && (
                <div className="sc-calculation">
                  <div><span /> Avance restant à récupérer<b>{money(calculation.advance_remaining, currency)}</b></div>
                  <div><span /> Retenue de garantie détenue<b>{money(calculation.retention_cumulative, currency)}</b></div>
                </div>
              )}
            </InventoryFormSection>

            {valuation && valuation.status !== "draft" && (
              <InventoryFormSection title="Facture du sous-traitant" icon="invoice">
                {valuation.invoice && (
                  valuation.invoice.matches
                    ? <div className="notice ok">Facture {valuation.invoice.number} conforme : {money(valuation.invoice.amount, currency)} = net à payer.</div>
                    : <div className="notice warning">Facture {valuation.invoice.number} : {money(valuation.invoice.amount, currency)}, écart de {money(valuation.invoice.difference, currency)} avec le net à payer.</div>
                )}
                {canManage && valuation.status !== "paid" && (
                  <InvoiceEntryForm
                    key={valuation.invoice?.number ?? "new"}
                    initial={{
                      number: valuation.invoice?.number,
                      date: valuation.invoice?.date,
                      amount: String(Number(valuation.invoice?.amount ?? valuation.calculation.net_due)),
                    }}
                    amountLabel="Montant facturé (F CFA)"
                    busy={busy}
                    onSubmit={(invoice) => run(() => saveValuationInvoice(valuation.id, invoice), "Impossible d’enregistrer la facture.")}
                  />
                )}
              </InventoryFormSection>
            )}

            {(valuation || editable) && (
              <InventoryFormSection title="Documents" icon="photo">
                {canManage && (
                  <DocumentUploadDropzone
                    compact
                    title="Ajouter l’attachement signé"
                    description={valuation ? "PDF uniquement · 10 Mo maximum" : "PDF uniquement · 10 Mo maximum · envoyé à l’enregistrement"}
                    disabled={busy}
                    onFiles={(files) => valuation
                      ? void run(async () => { await uploadValuationDocuments(valuation.id, files); return getValuation(valuation.id); }, "Impossible d’ajouter le document.")
                      : setPendingDocuments((current) => [...current, ...files])}
                  />
                )}
                {pendingDocuments.map((file, index) => (
                  <div className="pending-file" key={`${file.name}-${file.lastModified}-${index}`}>
                    <span className="invoice-pdf-badge">PDF</span>
                    <span>{file.name}</span>
                    <button type="button" aria-label={`Retirer ${file.name}`} onClick={() => setPendingDocuments((current) => current.filter((_, candidate) => candidate !== index))}><ActionIcon name="close" /></button>
                  </div>
                ))}
                {valuation && valuation.documents.length > 0 && (
                  <PaginatedDocumentList
                    documents={valuation.documents}
                    emptyMessage="Aucun document"
                    renderDocument={(document) => (
                      <DocumentRow key={document.id} url={document.url} name={document.original_name} meta={`${document.type === "invoice" ? "Facture" : "Attachement"} · ${formatFileSize(document.size_bytes)} · ${formatDate(document.created_at, { style: "medium" })}`} onError={setError} />
                    )}
                  />
                )}
              </InventoryFormSection>
            )}
          </div>

          {canManage && valuation && (
            <div className="sc-actions">
              {valuation.status === "draft" && <button className="primary-button" type="button" disabled={busy} onClick={() => void action("submit", "Impossible de soumettre la situation.")}>Soumettre pour approbation</button>}
              {valuation.status === "draft" && <button className="danger-button" type="button" disabled={busy} onClick={remove}><ActionIcon name="delete" /> Supprimer</button>}
              {valuation.status === "submitted" && <button className="primary-button" type="button" disabled={busy} onClick={() => void action("approve", "Impossible d’approuver la situation.")}>Approuver</button>}
              {valuation.status === "submitted" && <button className="secondary-button" type="button" disabled={busy} onClick={() => void action("return-to-draft", "Impossible de renvoyer la situation.")}>Renvoyer en brouillon</button>}
              {valuation.status === "approved" && <button className="primary-button" type="button" disabled={busy || !valuation.invoice?.matches} title={valuation.invoice?.matches ? undefined : "La facture doit être égale au net à payer"} onClick={() => void action("pay", "Impossible de marquer la situation comme payée.")}>Marquer comme payée</button>}
            </div>
          )}
        </form>
      )}
    </EquipmentCreationPanel>
  );
}
