import { useState } from "react";
import { apiErrorMessage } from "../../../shared/api/errors";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentRow } from "../../../shared/components/DocumentRow";
import { InvoiceEntryForm } from "../../../shared/components/InvoiceEntryForm";
import { formatDate, formatFileSize, formatMoney } from "../../../shared/format";
import { deletePurchaseOrderInvoice, uploadPurchaseOrderInvoice } from "../api";
import type { PurchaseOrder } from "../types";
import { localized, operationPhrase } from "../../../i18n/operations";

/** Check messages are built at render time so they follow the active language. */
const checkMessages = {
  not_invoiced: { tone: "info", text: () => operationPhrase("Aucune facture reçue pour ce bon de commande.") },
  amount_mismatch: {
    tone: "warning",
    text: (order: PurchaseOrder) => {
      const difference = formatMoney(order.invoice_check?.difference);
      const invoiced = formatMoney(order.invoice_check?.invoiced_total);
      const total = formatMoney(order.total);
      return localized(
        `Écart de ${difference} entre les factures (${invoiced}) et le total du bon (${total}).`,
        `يوجد فرق قدره ${difference} بين الفواتير (${invoiced}) وإجمالي أمر الشراء (${total}).`,
      );
    },
  },
  missing_delivery_note: { tone: "warning", text: () => operationPhrase("Le montant facturé correspond au bon, mais aucun bon de livraison n’a été enregistré.") },
  matched: { tone: "ok", text: () => operationPhrase("Commandé = livré = facturé : la facture peut être payée.") },
} as const;

/**
 * Supplier invoices of a purchase order, checked against the ordered total
 * and the delivery notes before payment.
 */
export function SupplierInvoices({ order, canManage, onChanged }: {
  order: PurchaseOrder;
  canManage: boolean;
  onChanged: (order: PurchaseOrder) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const check = order.invoice_check ? checkMessages[order.invoice_check.status] : null;

  async function run(task: () => Promise<PurchaseOrder>, failure: string): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      onChanged(await task());
      return true;
    } catch (exception) {
      setError(apiErrorMessage(exception, failure));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h3><ActionIcon name="invoice" /> {operationPhrase("Factures fournisseur")}</h3>
      {check && <div className={`notice ${check.tone}`}>{check.text(order)}</div>}
      {error && <div className="form-alert" role="alert">{error}</div>}
      {(order.invoices?.length ?? 0) > 0 && (
        <div className="po-detail-documents">
          {order.invoices!.map((invoice) => (
            <DocumentRow
              key={invoice.id}
              url={invoice.url}
              name={localized(`Facture ${invoice.invoice_number}`, `الفاتورة ${invoice.invoice_number}`)}
              meta={`${formatMoney(invoice.amount)} · ${formatDate(invoice.invoiced_on, { style: "medium" })} · ${formatFileSize(invoice.size_bytes)}`}
              onError={setError}
              onDelete={canManage ? () => {
                if (window.confirm(localized(`Supprimer la facture ${invoice.invoice_number} ?`, `هل تريد حذف الفاتورة ${invoice.invoice_number}؟`))) void run(() => deletePurchaseOrderInvoice(order.id, invoice.id), operationPhrase("Impossible de supprimer la facture."));
              } : undefined}
            />
          ))}
        </div>
      )}
      {canManage && (
        <InvoiceEntryForm
          initial={{ amount: String(Number(order.total)) }}
          amountLabel={operationPhrase("Montant TTC")}
          fileRequired
          busy={busy}
          submitLabel={operationPhrase("Ajouter la facture")}
          onSubmit={(invoice) => invoice.file
            ? run(() => uploadPurchaseOrderInvoice(order.id, { ...invoice, file: invoice.file as File }), operationPhrase("Impossible d’enregistrer la facture."))
            : Promise.resolve(false)}
        />
      )}
    </section>
  );
}
