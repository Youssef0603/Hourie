import { AmountInput } from "../../../shared/components/AmountInput";
import { useState } from "react";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { formatDate } from "../../../shared/format";
import { localized, operationPhrase } from "../../../i18n/operations";
import { deleteValuationPayment, recordValuationPayment, type PaymentPayload } from "../api";
import { money, paymentChannelLabels, paymentMethodLabels } from "../display";
import type { PaymentChannel, PaymentMethod, SubcontractValuation } from "../types";

const channels: PaymentChannel[] = ["cash", "cheque", "vat"];

/**
 * Default amounts for a payment method: cash pays the cash part; a cheque or
 * transfer pays the cheque part and its VAT.
 */
function defaultsFor(method: PaymentMethod, valuation: SubcontractValuation): Pick<PaymentPayload, "amount" | "vat_amount"> {
  const balance = (channel: PaymentChannel) => Number(valuation.channels[channel].balance);
  return method === "cash"
    ? { amount: String(balance("cash")), vat_amount: "0" }
    : { amount: String(balance("cheque") + balance("vat")), vat_amount: String(balance("vat")) };
}

/** VAT included in a cheque or transfer, in proportion to what is still owed. */
function proportionalVat(amount: string, valuation: SubcontractValuation) {
  const cheque = Number(valuation.channels.cheque.balance);
  const vat = Number(valuation.channels.vat.balance);
  return cheque + vat > 0 ? String(Math.round((Number(amount) * vat) / (cheque + vat))) : "0";
}

function emptyPayment(valuation: SubcontractValuation, method?: PaymentMethod): PaymentPayload {
  const onlyCashLeft = Number(valuation.channels.cash.balance) > 0 && Number(valuation.channels.cheque.balance) + Number(valuation.channels.vat.balance) === 0;
  const chosen = method ?? (onlyCashLeft ? "cash" : "transfer");
  return { ...defaultsFor(chosen, valuation), paid_on: new Date().toISOString().slice(0, 10), method: chosen, reference: "" };
}

/**
 * Money actually paid against an approved entry. Each channel is followed on
 * its own (cash, cheque or transfer before VAT, and VAT), like the PM's
 * tracker, and what is still owed stays visible until it reaches zero.
 */
export function ValuationPayments({ valuation, currency, canManage, busy, run }: {
  valuation: SubcontractValuation;
  currency: string;
  canManage: boolean;
  busy: boolean;
  run: (task: () => Promise<SubcontractValuation>, failure: string) => Promise<boolean>;
}) {
  const [payment, setPayment] = useState<PaymentPayload>(() => emptyPayment(valuation));
  const balance = Number(valuation.balance_due);
  const invoiceReady = !valuation.requires_invoice || (valuation.invoice?.matches ?? false);
  const canRecord = canManage && balance > 0 && (valuation.status === "approved" || valuation.status === "partially_paid");
  const shownChannels = channels.filter((channel) => Number(valuation.channels[channel].due) > 0 || Number(valuation.channels[channel].paid) > 0);
  const hasVat = Number(valuation.channels.vat.due) > 0;
  const isCash = payment.method === "cash";

  async function record() {
    const saved = await run(() => recordValuationPayment(valuation.id, { ...payment, vat_amount: isCash ? "0" : payment.vat_amount || "0" }), operationPhrase("Impossible d’enregistrer le paiement."));
    if (saved) setPayment((current) => ({ ...current, amount: "", vat_amount: "0", reference: "" }));
  }

  function remove(paymentId: number, amount: string) {
    if (!window.confirm(localized(`Supprimer le paiement de ${money(amount, currency)} ?`, `حذف الدفعة بقيمة ${money(amount, currency)}؟`))) return;
    void run(() => deleteValuationPayment(valuation.id, paymentId), operationPhrase("Impossible de supprimer le paiement."));
  }

  return (
    <>
      <div className="sc-table-wrap">
        <table className="sc-table">
          <thead><tr><th>{operationPhrase("Mode de règlement")}</th><th className="num">{operationPhrase("À payer")}</th><th className="num">{operationPhrase("Payé")}</th><th className="num">{operationPhrase("Reste")}</th></tr></thead>
          <tbody>
            {shownChannels.map((channel) => (
              <tr key={channel}>
                <td>{operationPhrase(paymentChannelLabels[channel])}</td>
                <td className="num">{money(valuation.channels[channel].due, currency)}</td>
                <td className="num">{money(valuation.channels[channel].paid, currency)}</td>
                <td className="num"><strong>{money(valuation.channels[channel].balance, currency)}</strong></td>
              </tr>
            ))}
            <tr className="sc-total-row">
              <td><strong>{operationPhrase("Total")}</strong></td>
              <td className="num"><strong>{money(valuation.calculation.net_due, currency)}</strong></td>
              <td className="num"><strong>{money(valuation.paid_amount, currency)}</strong></td>
              <td className="num"><strong>{money(valuation.balance_due, currency)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      {valuation.payments.length > 0 && (
        <div className="sc-table-wrap">
          <table className="sc-table">
            <thead><tr><th>{operationPhrase("Date")}</th><th>{operationPhrase("Mode")}</th><th>{operationPhrase("Référence")}</th><th className="num">{operationPhrase("Montant")}</th>{hasVat && <th className="num">{operationPhrase("Dont TVA")}</th>}{canManage && <th />}</tr></thead>
            <tbody>
              {valuation.payments.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.paid_on, { style: "medium" })}</td>
                  <td>{entry.method ? operationPhrase(paymentMethodLabels[entry.method]) : "—"}</td>
                  <td>{entry.reference || "—"}{entry.recorded_by && <div className="muted">{localized(`Saisi par ${entry.recorded_by}`, `أدخله ${entry.recorded_by}`)}</div>}</td>
                  <td className="num"><strong>{money(entry.amount, currency)}</strong></td>
                  {hasVat && <td className="num">{Number(entry.vat_amount) > 0 ? money(entry.vat_amount, currency) : "—"}</td>}
                  {canManage && <td className="num"><button className="remove-line" type="button" disabled={busy} aria-label={operationPhrase("Supprimer le paiement")} onClick={() => remove(entry.id, entry.amount)}><ActionIcon name="delete" /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canRecord && !invoiceReady && (
        <div className="notice info">{localized(
          `Enregistrez d’abord la facture du sous-traitant : elle doit être de ${money(valuation.invoice_expected, currency)} (part chèque ou virement, TVA comprise).`,
          `سجّل أولًا فاتورة المقاول الفرعي: يجب أن تكون بقيمة ${money(valuation.invoice_expected, currency)} (جزء الشيك أو التحويل شاملًا الضريبة).`,
        )}</div>
      )}

      {canRecord && invoiceReady && (
        <div className="invoice-entry">
          <div className="invoice-entry-fields">
            <label><span>{operationPhrase("Date du paiement")}</span><input type="date" value={payment.paid_on} onChange={(event) => setPayment((current) => ({ ...current, paid_on: event.target.value }))} /></label>
            <label><span>{operationPhrase("Mode")}</span>
              <SearchableSelect
                ariaLabel={operationPhrase("Mode")}
                value={payment.method}
                searchable={false}
                includeEmpty={false}
                placeholder={operationPhrase("Mode")}
                options={(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((method) => ({ value: method, label: operationPhrase(paymentMethodLabels[method]) }))}
                onChange={(method) => setPayment((current) => ({ ...current, method: (method || "transfer") as PaymentMethod, ...defaultsFor((method || "transfer") as PaymentMethod, valuation) }))}
              />
            </label>
            <label><span>{operationPhrase("Montant payé (F CFA) *")}</span><AmountInput value={payment.amount} onChange={(amount) => setPayment((current) => ({ ...current, amount, vat_amount: current.method === "cash" ? "0" : proportionalVat(amount, valuation) }))} /></label>
            {!isCash && hasVat && (
              <label><span>{operationPhrase("Dont TVA (F CFA)")}</span><AmountInput value={payment.vat_amount} onChange={(vatAmount) => setPayment((current) => ({ ...current, vat_amount: vatAmount }))} /></label>
            )}
            <label><span>{operationPhrase("Référence (n° de virement ou de chèque)")}</span><input value={payment.reference} onChange={(event) => setPayment((current) => ({ ...current, reference: event.target.value }))} /></label>
          </div>
          <div>
            <button className="primary-button" type="button" disabled={busy || !(Number(payment.amount) > 0)} onClick={() => void record()}>
              {operationPhrase("Enregistrer le paiement")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
