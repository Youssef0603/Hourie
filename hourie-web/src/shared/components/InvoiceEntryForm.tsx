import { useRef, useState } from "react";
import { ActionIcon } from "./ActionIcon";
import { DocumentUploadDropzone } from "./DocumentUploadDropzone";
import { localized, operationPhrase } from "../../i18n/operations";

export type InvoiceEntry = { number: string; date: string; amount: string; file: File | null };

type InvoiceField = "number" | "amount" | "file";

/** How each missing field is named in the "still missing" notice. */
function missingFieldLabel(field: InvoiceField) {
  return {
    number: operationPhrase("le n° de facture"),
    amount: operationPhrase("le montant"),
    file: operationPhrase("le PDF de la facture"),
  }[field];
}

/**
 * Records a received invoice: number, date, amount and its PDF, added through
 * the same drop zone as every other document in the app.
 */
export function InvoiceEntryForm({ initial, amountLabel = operationPhrase("Montant"), fileRequired = false, busy = false, submitLabel = operationPhrase("Enregistrer la facture"), onSubmit }: {
  initial?: Partial<InvoiceEntry>;
  amountLabel?: string;
  fileRequired?: boolean;
  busy?: boolean;
  submitLabel?: string;
  /** Resolves once saved; the form then clears the number and the file. */
  onSubmit: (invoice: InvoiceEntry) => Promise<boolean>;
}) {
  const [invoice, setInvoice] = useState<InvoiceEntry>({
    number: initial?.number ?? "",
    date: initial?.date ?? new Date().toISOString().slice(0, 10),
    amount: initial?.amount ?? "",
    file: null,
  });
  const [missing, setMissing] = useState<InvoiceField[]>([]);
  const numberInput = useRef<HTMLInputElement>(null);
  const amountInput = useRef<HTMLInputElement>(null);

  /** Lists what is still missing instead of silently disabling the button. */
  function missingFields(next: InvoiceEntry) {
    const fields: InvoiceField[] = [];
    if (!next.number.trim()) fields.push("number");
    if (!next.amount) fields.push("amount");
    if (fileRequired && !next.file) fields.push("file");
    return fields;
  }

  function change(patch: Partial<InvoiceEntry>) {
    const next = { ...invoice, ...patch };
    setInvoice(next);
    if (missing.length) setMissing(missingFields(next));
  }

  async function submit() {
    const stillMissing = missingFields(invoice);
    setMissing(stillMissing);
    if (stillMissing.length) {
      if (!invoice.number.trim()) numberInput.current?.focus();
      else if (!invoice.amount) amountInput.current?.focus();
      return;
    }
    if (await onSubmit(invoice)) setInvoice((current) => ({ ...current, file: null }));
  }

  return (
    <div className="invoice-entry">
      <div className="invoice-entry-fields">
        <label><span>{operationPhrase("N° de facture *")}</span><input ref={numberInput} aria-invalid={missing.includes("number")} value={invoice.number} onChange={(event) => change({ number: event.target.value })} /></label>
        <label><span>{operationPhrase("Date")}</span><input type="date" value={invoice.date} onChange={(event) => change({ date: event.target.value })} /></label>
        <label><span>{amountLabel} *</span><input ref={amountInput} aria-invalid={missing.includes("amount")} type="number" min="0" step="1" value={invoice.amount} onChange={(event) => change({ amount: event.target.value })} /></label>
      </div>
      {invoice.file ? (
        <div className="pending-file">
          <span className="invoice-pdf-badge">PDF</span>
          <span>{invoice.file.name}</span>
          <button type="button" aria-label={localized(`Retirer ${invoice.file.name}`, `إزالة ${invoice.file.name}`)} onClick={() => change({ file: null })}><ActionIcon name="close" /></button>
        </div>
      ) : (
        <DocumentUploadDropzone compact title={fileRequired ? operationPhrase("Ajouter la facture (PDF) *") : operationPhrase("Ajouter la facture (PDF)")} description={operationPhrase("PDF uniquement · 10 Mo maximum")} disabled={busy} onFiles={(files) => change({ file: files[0] ?? null })} />
      )}
      {missing.length > 0 && <div className="notice warning" role="alert">{localized(
        `Pour enregistrer la facture, renseignez ${missing.map(missingFieldLabel).join(", ")}.`,
        `لحفظ الفاتورة، يرجى إدخال ${missing.map(missingFieldLabel).join("، ")}.`,
      )}</div>}
      <div>
        <button className="secondary-button" type="button" disabled={busy} onClick={() => void submit()}><ActionIcon name="invoice" /> {submitLabel}</button>
      </div>
    </div>
  );
}
