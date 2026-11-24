import { AmountInput } from "../../../shared/components/AmountInput";
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
import { openDocument } from "../../../shared/documents";
import {
  deleteValuation,
  getValuation,
  runValuationAction,
  saveValuation,
  saveValuationInvoice,
  uploadValuationDocuments,
  valuationPdfUrl,
  type ValuationAction,
} from "../api";
import { localized, operationPhrase } from "../../../i18n/operations";
import { money, quantity, valuationStatusLabel, valuationTitle } from "../display";
import { ValuationPayments } from "./ValuationPayments";
import type { Subcontract, SubcontractValuation, ValuationPayload } from "../types";

type Draft = Omit<ValuationPayload, "lines"> & { quantities: Record<number, string>; locations: Record<number, string> };

/** Rounds to the 3 decimals quantities are stored with, without float noise. */
function round3(value: number) {
  return String(Math.round(value * 1000) / 1000);
}

function draftFrom(valuation: SubcontractValuation | null, subcontract: Subcontract): Draft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    valuation_date: valuation?.valuation_date ?? today,
    period_end: valuation?.period_end ?? today,
    materials_deduction: String(Number(valuation?.materials_deduction ?? 0)),
    // A new situation starts with the contract's fixed deduction (e.g. "Coupe pavé").
    backcharges: String(Number(valuation?.backcharges ?? subcontract.recurring_deduction_amount ?? 0)),
    cash_percent: String(Number(valuation?.cash_percent ?? subcontract.cash_percent)),
    comment: valuation?.comment ?? (Number(subcontract.recurring_deduction_amount) > 0 && subcontract.recurring_deduction_label
      ? localized(`Retenue fixe : ${subcontract.recurring_deduction_label}`, `خصم ثابت: ${subcontract.recurring_deduction_label}`)
      : ""),
    quantities: Object.fromEntries(
      valuation
        ? valuation.lines.map((line) => [line.subcontract_item_id, String(Number(line.cumulative_quantity))])
        : subcontract.items.map((item) => [item.id, String(Number(item.executed_quantity))]),
    ),
    locations: Object.fromEntries((valuation?.lines ?? []).map((line) => [line.subcontract_item_id, line.location ?? ""])),
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
  /** What the engineer typed in "this period", kept as typed while the cumulative follows. */
  const [periodInputs, setPeriodInputs] = useState<Record<number, string>>({});

  const applyValuation = useCallback((loaded: SubcontractValuation) => {
    setValuation(loaded);
    setDraft(draftFrom(loaded, subcontract));
    setPeriodInputs({});
  }, [subcontract]);

  useEffect(() => {
    if (valuationId === null) return;
    getValuation(valuationId)
      .then(applyValuation)
      .catch(() => setError(operationPhrase("Impossible de charger la situation.")))
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
    location: null,
    period_amount: "0",
    cumulative_amount: "0",
  }));
  const hasLocations = editable || lines.some((line) => line.location);
  const cumulativeOf = (line: { subcontract_item_id: number; cumulative_quantity: string }) => Number(draft.quantities[line.subcontract_item_id] ?? line.cumulative_quantity);
  const periodTotal = lines.reduce((total, line) => total + (cumulativeOf(line) - Number(line.previous_quantity)) * Number(line.unit_price), 0);
  const cumulativeTotal = lines.reduce((total, line) => total + cumulativeOf(line) * Number(line.unit_price), 0);

  function setQuantity(itemId: number, cumulative: string) {
    setDraft((current) => ({ ...current, quantities: { ...current.quantities, [itemId]: cumulative } }));
  }

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
      cash_percent: draft.cash_percent || "0",
      comment: draft.comment,
      lines: Object.entries(draft.quantities).map(([itemId, value]) => ({
        subcontract_item_id: Number(itemId),
        cumulative_quantity: value || "0",
        location: draft.locations[Number(itemId)] || undefined,
      })),
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
    }, operationPhrase("Impossible d’enregistrer la situation."));
  }

  function action(name: ValuationAction, failure: string) {
    if (!valuation) return;
    return run(async () => {
      if (name === "submit") await saveValuation(payload(), { valuationId: valuation.id });
      return runValuationAction(valuation.id, name);
    }, failure);
  }

  function remove() {
    if (!valuation || !window.confirm(localized(`Supprimer la situation ${valuation.reference} ?`, `حذف كشف الأعمال ${valuation.reference}؟`))) return;
    void run(async () => {
      await deleteValuation(valuation.id);
      onClose();
    }, operationPhrase("Impossible de supprimer la situation."));
  }

  const calculation = valuation?.calculation;
  /** The latest invoice PDF belongs to the invoice card; older ones stay in Documents. */
  const invoicePdf = valuation?.documents.find((document) => document.type === "invoice") ?? null;
  const statementDocuments = valuation?.documents.filter((document) => document !== invoicePdf) ?? [];
  const currency = subcontract.currency;
  const isAdvance = valuation?.kind === "advance";
  const isOpening = valuation?.kind === "opening";
  const isRegular = !isAdvance && !isOpening;
  const cashPercent = Number(valuation?.cash_percent ?? 0);
  const vatRate = Number(subcontract.vat_rate);

  return (
    <EquipmentCreationPanel
      eyebrow={`${subcontract.reference} · ${subcontract.subcontractor.name}`}
      title={valuation ? (isRegular ? localized(`Situation ${valuation.reference}`, `كشف الأعمال ${valuation.reference}`) : valuationTitle(valuation)) : operationPhrase("Nouvelle situation")}
      subtitle={editable ? undefined : isAdvance
        ? operationPhrase("Avance versée au démarrage du contrat, récupérée sur chaque situation.")
        : isOpening
          ? localized(`Tout ce qui a été certifié avant Hourie, jusqu’à la situation n° ${valuation?.sequence}.`, `كل ما تم اعتماده قبل Hourie، حتى الكشف رقم ${valuation?.sequence}.`)
          : operationPhrase(valuation?.status === "paid" ? "Situation payée : consultation uniquement." : "Situation verrouillée : consultation et suivi de l’approbation.")}
      action={editable ? <button className="primary-button" type="submit" form="valuation-form" disabled={busy}>{operationPhrase(busy ? "Enregistrement…" : "Enregistrer")}</button> : undefined}
      onClose={onClose}
    >
      {loading ? <LoadingSpinner label={operationPhrase("Chargement de la situation…")} /> : (
        <form id="valuation-form" className="generator-create-form asset-form subcontract-editor valuation-editor" onSubmit={(event) => void save(event)}>
          {error && <div className="form-alert" role="alert">{error}</div>}
          {valuation && (
            <div className="sc-status-row">
              <em className={`valuation-status ${valuation.status}`}>{valuationStatusLabel(valuation.status)}</em>
              {valuation.approved_by && <span>{valuation.approved_at
                ? localized(`Approuvée par ${valuation.approved_by} le ${formatDate(valuation.approved_at, { style: "medium" })}`, `اعتمده ${valuation.approved_by} بتاريخ ${formatDate(valuation.approved_at, { style: "medium" })}`)
                : localized(`Approuvée par ${valuation.approved_by}`, `اعتمده ${valuation.approved_by}`)}</span>}
            </div>
          )}
          <div className="asset-form-layout">
            {!isAdvance && <InventoryFormSection title={operationPhrase("Période")} icon="identification">
              <div className="maintenance-form-grid asset-form-grid-2">
                <label><span>{operationPhrase("Date de la situation")}</span><input required type="date" disabled={!editable} value={draft.valuation_date} onChange={(event) => setDraft((current) => ({ ...current, valuation_date: event.target.value }))} /></label>
                <label><span>{operationPhrase("Travaux exécutés jusqu’au")}</span><input required type="date" disabled={!editable} value={draft.period_end} onChange={(event) => setDraft((current) => ({ ...current, period_end: event.target.value }))} /></label>
              </div>
            </InventoryFormSection>}

            {!isAdvance && <InventoryFormSection title={operationPhrase("Travaux exécutés")} icon="specifications">
              {editable && <p className="sc-hint">{operationPhrase("Saisissez la quantité réalisée pendant la période : le cumul se calcule tout seul. Vous pouvez aussi corriger directement le cumul.")}</p>}
              <div className="sc-table-wrap">
                <table className="sc-table sc-quantity-table">
                  <thead><tr>
                    <th>{operationPhrase("Article")}</th>
                    {hasLocations && <th>{operationPhrase("Profil / lieu")}</th>}
                    <th className="num">{operationPhrase("Précédent")}</th>
                    <th className="num">{operationPhrase("Cette période")}</th>
                    <th className="num">{operationPhrase("Cumul à ce jour")}</th>
                    <th className="num">{operationPhrase("Montant période")}</th>
                  </tr></thead>
                  <tbody>
                    {lines.map((line) => {
                      const itemId = line.subcontract_item_id;
                      const previous = Number(line.previous_quantity);
                      const cumulative = cumulativeOf(line);
                      const isOver = cumulative > Number(line.authorized_quantity);
                      return (
                        <tr key={itemId} className={isOver ? "over" : undefined}>
                          <td>
                            <strong>{line.description}</strong>
                            <div className="muted">{line.code ?? operationPhrase("Sans code")} · {money(line.unit_price, currency)} / {line.unit} · {localized(`autorisé ${quantity(line.authorized_quantity)}`, `المعتمد ${quantity(line.authorized_quantity)}`)}</div>
                            {isOver && <div className="muted">{operationPhrase("Dépasse l’autorisé : un avenant est nécessaire.")}</div>}
                          </td>
                          {hasLocations && <td>{editable
                            ? <input className="text" aria-label={localized(`Profil pour ${line.description}`, `الموقع لـ ${line.description}`)} placeholder={operationPhrase("Ex. P40 - P59")} value={draft.locations[itemId] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, locations: { ...current.locations, [itemId]: event.target.value } }))} />
                            : line.location || "—"}</td>}
                          <td className="num">{quantity(previous)}</td>
                          <td className={editable ? undefined : "num"}>{editable
                            ? <input type="number" step="0.001" aria-label={localized(`Quantité de la période pour ${line.description}`, `كمية الفترة لـ ${line.description}`)} value={periodInputs[itemId] ?? round3(cumulative - previous)} onChange={(event) => {
                              const typed = event.target.value;
                              setPeriodInputs((current) => ({ ...current, [itemId]: typed }));
                              setQuantity(itemId, round3(previous + Number(typed || 0)));
                            }} />
                            : <strong>{quantity(cumulative - previous)}</strong>}</td>
                          <td className={editable ? undefined : "num"}>{editable
                            ? <input type="number" min="0" step="0.001" aria-label={localized(`Cumul pour ${line.description}`, `الكمية التراكمية لـ ${line.description}`)} value={draft.quantities[itemId] ?? ""} onChange={(event) => {
                              setPeriodInputs((current) => { const { [itemId]: _removed, ...rest } = current; return rest; });
                              setQuantity(itemId, event.target.value);
                            }} />
                            : quantity(cumulative)}</td>
                          <td className="num"><strong>{money((cumulative - previous) * Number(line.unit_price), currency)}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="sc-total-row">
                      <td colSpan={hasLocations ? 5 : 4}><strong>{operationPhrase("Travaux de la période")}</strong>{calculation && Number(calculation.historical_works) > 0 && <div className="muted">{localized(`Cumul total, travaux antérieurs non détaillés compris : ${money(cumulativeTotal + Number(calculation.historical_works), currency)}`, `المجموع التراكمي مع الأعمال السابقة غير المفصّلة: ${money(cumulativeTotal + Number(calculation.historical_works), currency)}`)}</div>}</td>
                      <td className="num"><strong>{money(periodTotal, currency)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </InventoryFormSection>}

            {isRegular && <InventoryFormSection title={operationPhrase("Déductions et règlement")} icon="note">
              <div className="maintenance-form-grid asset-form-grid-2">
                <label><span>{operationPhrase("Matériaux fournis par ARH (HT)")}</span><AmountInput disabled={!editable} value={draft.materials_deduction} onChange={(amount) => setDraft((current) => ({ ...current, materials_deduction: amount }))} /></label>
                <label><span>{operationPhrase("Pénalités et retenues diverses")}</span><AmountInput disabled={!editable} value={draft.backcharges} onChange={(amount) => setDraft((current) => ({ ...current, backcharges: amount }))} /></label>
                <label><span>{operationPhrase("Part payée en espèces (%)")}</span><input type="number" min="0" max="100" step="0.01" disabled={!editable} value={draft.cash_percent} onChange={(event) => setDraft((current) => ({ ...current, cash_percent: event.target.value }))} /></label>
                <label><span>{operationPhrase("Commentaire")}</span><input disabled={!editable} value={draft.comment ?? ""} onChange={(event) => setDraft((current) => ({ ...current, comment: event.target.value }))} /></label>
              </div>
            </InventoryFormSection>}

            <InventoryFormSection title={operationPhrase(isAdvance ? "Montant de l’avance" : "Calcul de la situation")} icon="invoice">
              {!calculation ? <div className="notice info">{operationPhrase("Enregistrez la situation pour calculer le net à payer.")}</div> : isAdvance ? (
                <div className="sc-calculation">
                  <div className="subtotal"><span>01</span>{operationPhrase("Avance de démarrage (HT)")}<b>{money(calculation.net_before_vat, currency)}</b></div>
                  <div><span>02</span>{localized(`dont espèces (${cashPercent} %)`, `منها نقدًا (${cashPercent} %)`)}<b>{money(calculation.cash_amount, currency)}</b></div>
                  <div><span>03</span>{operationPhrase("dont chèque ou virement")}<b>{money(calculation.cheque_amount, currency)}</b></div>
                  <div><span>04</span>{localized(`TVA (${vatRate} % sur 03)`, `ضريبة القيمة المضافة (${vatRate} % على 03)`)}<b>{money(calculation.vat_amount, currency)}</b></div>
                  <div className="total"><span>05</span>{operationPhrase("NET À PAYER [01 + 04]")}<b>{money(calculation.net_due, currency)}</b></div>
                </div>
              ) : (
                <div className="sc-calculation">
                  <div><span>01</span>{operationPhrase("Travaux exécutés (cumul)")}<b>{money(calculation.works_cumulative, currency)}</b></div>
                  {Number(calculation.historical_works) > 0 && <div className="muted"><span /> {operationPhrase("dont travaux antérieurs à Hourie non détaillés")}<b>{money(calculation.historical_works, currency)}</b></div>}
                  {isRegular && <>
                    <div><span>02</span>{operationPhrase("Moins travaux des situations précédentes")}<b>− {money(calculation.works_previous, currency)}</b></div>
                    <div className="subtotal"><span>03</span>{operationPhrase("Travaux de la période")}<b>{money(calculation.works_this_period, currency)}</b></div>
                  </>}
                  <div><span>04</span>{localized(`Récupération de l’avance (${Number(subcontract.advance_recovery_rate)} %, cumul)`, `استرداد الدفعة المقدمة (${Number(subcontract.advance_recovery_rate)} %، تراكميًا)`)}<b>− {money(calculation.advance_recovery_cumulative, currency)}</b></div>
                  <div><span>05</span>{localized(`Retenue de garantie (${Number(subcontract.retention_rate)} %, cumul)`, `محتجز الضمان (${Number(subcontract.retention_rate)} %، تراكميًا)`)}<b>− {money(calculation.retention_cumulative, currency)}</b></div>
                  <div className="subtotal"><span>06</span>{operationPhrase("Montant certifié cumulé [01 − 04 − 05]")}<b>{money(calculation.certified_cumulative, currency)}</b></div>
                  {isRegular && <>
                    <div><span>07</span>{operationPhrase("Moins déjà certifié")}<b>− {money(calculation.previously_certified, currency)}</b></div>
                    <div className="subtotal"><span>08</span>{operationPhrase("Montant de la situation [06 − 07]")}<b>{money(calculation.this_valuation_before_vat, currency)}</b></div>
                    <div><span>09</span>{operationPhrase("Moins matériaux fournis")}<b>− {money(calculation.materials_deduction, currency)}</b></div>
                    <div><span>10</span>{operationPhrase("Moins pénalités et retenues")}<b>− {money(calculation.backcharges, currency)}</b></div>
                  </>}
                  <div className="subtotal"><span>11</span>{operationPhrase(isRegular ? "NET HT [08 − 09 − 10]" : "NET HT")}<b>{money(calculation.net_before_vat, currency)}</b></div>
                  <div><span>12</span>{localized(`dont espèces (${cashPercent} %)`, `منها نقدًا (${cashPercent} %)`)}<b>{money(calculation.cash_amount, currency)}</b></div>
                  <div><span>13</span>{operationPhrase("dont chèque ou virement")}<b>{money(calculation.cheque_amount, currency)}</b></div>
                  <div><span>14</span>{localized(`TVA (${vatRate} % sur 13)`, `ضريبة القيمة المضافة (${vatRate} % على 13)`)}<b>{money(calculation.vat_amount, currency)}</b></div>
                  <div className="total"><span>15</span>{operationPhrase("NET À PAYER [11 + 14]")}<b>{money(calculation.net_due, currency)}</b></div>
                </div>
              )}
              {calculation && !isAdvance && (
                <div className="sc-calculation">
                  <div><span /> {operationPhrase("Avance restant à récupérer")}<b>{money(calculation.advance_remaining, currency)}</b></div>
                  <div><span /> {operationPhrase("Retenue de garantie détenue")}<b>{money(calculation.retention_cumulative, currency)}</b></div>
                </div>
              )}
            </InventoryFormSection>

            {valuation && isRegular && valuation.status !== "draft" && (
              <InventoryFormSection title={operationPhrase("Facture du sous-traitant")} icon="invoice">
                {valuation.invoice && (() => {
                  const invoice = valuation.invoice;
                  const badge = invoice.matches
                    ? <em className="valuation-status paid">{operationPhrase("Conforme")}</em>
                    : <em className="valuation-status warning">{localized(`Écart de ${money(invoice.difference, currency)}`, `فرق ${money(invoice.difference, currency)}`)}</em>;
                  const details = <>{badge} {money(invoice.amount, currency)} · {formatDate(invoice.date, { style: "medium" })}{invoicePdf ? ` · ${invoicePdf.original_name}` : ""}</>;
                  const title = localized(`Facture n° ${invoice.number}`, `الفاتورة رقم ${invoice.number}`);
                  return (
                    <>
                      {invoicePdf
                        ? <DocumentRow url={invoicePdf.url} name={title} fileName={invoicePdf.original_name} meta={details} onError={setError} />
                        : <article className="document-row"><span className="document-row-open"><span className="document-row-text"><strong>{title}</strong><small>{details}</small></span></span></article>}
                      {!invoice.matches && <div className="notice warning sc-invoice-note">{localized(
                        `Le montant facturé doit être égal à la part chèque ou virement, TVA comprise (${money(valuation.invoice_expected, currency)}) : demandez une facture corrigée au sous-traitant.`,
                        `يجب أن يساوي المبلغ المفوتر جزء الشيك أو التحويل شاملًا الضريبة (${money(valuation.invoice_expected, currency)}): اطلب فاتورة مصححة من المقاول الفرعي.`,
                      )}</div>}
                    </>
                  );
                })()}
                {canManage && (valuation.status === "submitted" || valuation.status === "approved") && valuation.payments.length === 0 && (
                  <InvoiceEntryForm
                    key={valuation.invoice?.number ?? "new"}
                    initial={{
                      number: valuation.invoice?.number,
                      date: valuation.invoice?.date,
                      amount: String(Number(valuation.invoice?.amount ?? valuation.invoice_expected)),
                    }}
                    amountLabel={operationPhrase("Montant facturé (F CFA)")}
                    busy={busy}
                    onSubmit={(invoice) => run(() => saveValuationInvoice(valuation.id, invoice), operationPhrase("Impossible d’enregistrer la facture."))}
                  />
                )}
              </InventoryFormSection>
            )}

            {valuation && (
              <InventoryFormSection title={operationPhrase("Paiements")} icon="invoice">
                {["approved", "partially_paid", "paid"].includes(valuation.status)
                  ? <ValuationPayments key={`${valuation.id}-${valuation.payments.length}`} valuation={valuation} currency={currency} canManage={canManage} busy={busy} run={run} />
                  : <div className="notice info">{operationPhrase(valuation.status === "draft"
                    ? "Les paiements se saisissent après l’approbation : soumettez la situation, faites-la approuver, puis enregistrez la facture du sous-traitant."
                    : "Les paiements se saisissent après l’approbation de la situation et l’enregistrement de la facture.")}</div>}
              </InventoryFormSection>
            )}

            {(valuation || editable) && !isAdvance && (
              <InventoryFormSection title={operationPhrase("Documents")} icon="photo">
                {canManage && (
                  <DocumentUploadDropzone
                    compact
                    title={operationPhrase("Ajouter l’attachement signé")}
                    description={operationPhrase(valuation ? "PDF uniquement · 10 Mo maximum" : "PDF uniquement · 10 Mo maximum · envoyé à l’enregistrement")}
                    disabled={busy}
                    onFiles={(files) => valuation
                      ? void run(async () => { await uploadValuationDocuments(valuation.id, files); return getValuation(valuation.id); }, operationPhrase("Impossible d’ajouter le document."))
                      : setPendingDocuments((current) => [...current, ...files])}
                  />
                )}
                {pendingDocuments.map((file, index) => (
                  <div className="pending-file" key={`${file.name}-${file.lastModified}-${index}`}>
                    <span className="invoice-pdf-badge">PDF</span>
                    <span>{file.name}</span>
                    <button type="button" aria-label={localized(`Retirer ${file.name}`, `إزالة ${file.name}`)} onClick={() => setPendingDocuments((current) => current.filter((_, candidate) => candidate !== index))}><ActionIcon name="close" /></button>
                  </div>
                ))}
                {statementDocuments.length > 0 && (
                  <PaginatedDocumentList
                    documents={statementDocuments}
                    emptyMessage={operationPhrase("Aucun document")}
                    renderDocument={(document) => (
                      <DocumentRow key={document.id} url={document.url} name={document.original_name} meta={`${operationPhrase(document.type === "invoice" ? "Facture" : "Attachement")} · ${formatFileSize(document.size_bytes)} · ${formatDate(document.created_at, { style: "medium" })}`} onError={setError} />
                    )}
                  />
                )}
              </InventoryFormSection>
            )}
          </div>

          {valuation && (
            <div className="sc-actions">
              <button className="secondary-button" type="button" onClick={() => openDocument(valuationPdfUrl(valuation.id))}><ActionIcon name="download" /> {operationPhrase("PDF de la situation")}</button>
            </div>
          )}
          {canManage && valuation && (
            <div className="sc-actions">
              {valuation.status === "draft" && <button className="primary-button" type="button" disabled={busy} onClick={() => void action("submit", operationPhrase("Impossible de soumettre la situation."))}>{operationPhrase("Soumettre pour approbation")}</button>}
              {(valuation.status === "draft" || (isOpening && valuation.payments.length === 0)) && <button className="danger-button" type="button" disabled={busy} onClick={remove}><ActionIcon name="delete" /> {operationPhrase("Supprimer")}</button>}
              {valuation.status === "submitted" && <button className="primary-button" type="button" disabled={busy} onClick={() => void action("approve", operationPhrase("Impossible d’approuver la situation."))}>{operationPhrase("Approuver")}</button>}
              {valuation.status === "submitted" && <button className="secondary-button" type="button" disabled={busy} onClick={() => void action("return-to-draft", operationPhrase("Impossible de renvoyer la situation."))}>{operationPhrase("Renvoyer en brouillon")}</button>}
            </div>
          )}
        </form>
      )}
    </EquipmentCreationPanel>
  );
}
