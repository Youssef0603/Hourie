import { useState } from "react";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { formatDate } from "../../../shared/format";
import { localized, operationPhrase } from "../../../i18n/operations";
import { deleteValuationPayment, recordValuationPayment, type PaymentPayload } from "../api";
import { money, paymentMethodLabels } from "../display";
import type { PaymentMethod, SubcontractValuation } from "../types";

function emptyPayment(balance: string): PaymentPayload {
  return {
    amount: String(Number(balance)),
    paid_on: new Date().toISOString().slice(0, 10),
    method: "transfer",
    reference: "",
  };
}

/**
 * Money actually paid against an approved valuation. A valuation can be paid
 * in several transfers; what is still owed stays visible until it reaches zero.
 */
export function ValuationPayments({ valuation, currency, canManage, busy, run }: {
  valuation: SubcontractValuation;
  currency: string;
  canManage: boolean;
  busy: boolean;
  run: (task: () => Promise<SubcontractValuation>, failure: string) => Promise<boolean>;
}) {
  const [payment, setPayment] = useState<PaymentPayload>(() => emptyPayment(valuation.balance_due));
  const balance = Number(valuation.balance_due);
  const invoiceMatches = valuation.invoice?.matches ?? false;
  const canRecord = canManage && balance > 0 && (valuation.status === "approved" || valuation.status === "partially_paid");

  async function record() {
    const saved = await run(() => recordValuationPayment(valuation.id, payment), operationPhrase("Impossible d’enregistrer le paiement."));
    if (saved) setPayment((current) => ({ ...emptyPayment("0"), method: current.method }));
  }

  function remove(paymentId: number, amount: string) {
    if (!window.confirm(localized(`Supprimer le paiement de ${money(amount, currency)} ?`, `حذف الدفعة بقيمة ${money(amount, currency)}؟`))) return;
    void run(() => deleteValuationPayment(valuation.id, paymentId), operationPhrase("Impossible de supprimer le paiement."));
  }

  return (
    <>
      <div className="sc-calculation">
        <div><span />{operationPhrase("Net à payer")}<b>{money(valuation.calculation.net_due, currency)}</b></div>
        <div><span />{operationPhrase("Déjà payé")}<b>− {money(valuation.paid_amount, currency)}</b></div>
        <div className="total"><span />{operationPhrase("Reste à payer")}<b>{money(valuation.balance_due, currency)}</b></div>
      </div>

      {valuation.payments.length > 0 && (
        <div className="sc-table-wrap">
          <table className="sc-table">
            <thead><tr><th>{operationPhrase("Date")}</th><th>{operationPhrase("Mode")}</th><th>{operationPhrase("Référence")}</th><th className="num">{operationPhrase("Montant")}</th>{canManage && <th />}</tr></thead>
            <tbody>
              {valuation.payments.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.paid_on, { style: "medium" })}</td>
                  <td>{entry.method ? operationPhrase(paymentMethodLabels[entry.method]) : "—"}</td>
                  <td>{entry.reference || "—"}{entry.recorded_by && <div className="muted">{localized(`Saisi par ${entry.recorded_by}`, `أدخله ${entry.recorded_by}`)}</div>}</td>
                  <td className="num"><strong>{money(entry.amount, currency)}</strong></td>
                  {canManage && <td className="num"><button className="remove-line" type="button" disabled={busy} aria-label={operationPhrase("Supprimer le paiement")} onClick={() => remove(entry.id, entry.amount)}><ActionIcon name="delete" /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canRecord && !invoiceMatches && (
        <div className="notice info">{operationPhrase("Enregistrez d’abord une facture égale au net à payer pour saisir un paiement.")}</div>
      )}

      {canRecord && invoiceMatches && (
        <div className="invoice-entry">
          <div className="invoice-entry-fields">
            <label><span>{operationPhrase("Date du paiement")}</span><input type="date" value={payment.paid_on} onChange={(event) => setPayment((current) => ({ ...current, paid_on: event.target.value }))} /></label>
            <label><span>{operationPhrase("Montant payé (F CFA) *")}</span><input type="number" min="1" max={balance} step="1" value={payment.amount} onChange={(event) => setPayment((current) => ({ ...current, amount: event.target.value }))} /></label>
            <label><span>{operationPhrase("Mode")}</span>
              <SearchableSelect
                ariaLabel={operationPhrase("Mode")}
                value={payment.method}
                searchable={false}
                includeEmpty={false}
                placeholder={operationPhrase("Mode")}
                options={(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((method) => ({ value: method, label: operationPhrase(paymentMethodLabels[method]) }))}
                onChange={(method) => setPayment((current) => ({ ...current, method: (method || "transfer") as PaymentMethod }))}
              />
            </label>
            <label><span>{operationPhrase("Référence (n° de virement ou de chèque)")}</span><input value={payment.reference} onChange={(event) => setPayment((current) => ({ ...current, reference: event.target.value }))} /></label>
          </div>
          <div>
            <button className="primary-button" type="button" disabled={busy || !(Number(payment.amount) > 0)} onClick={() => void record()}>
              {operationPhrase(Number(payment.amount) < balance ? "Enregistrer un paiement partiel" : "Enregistrer le paiement")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
