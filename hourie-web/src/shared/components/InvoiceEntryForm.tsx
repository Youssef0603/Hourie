import { useRef, useState } from "react";
import { ActionIcon } from "./ActionIcon";
import { DocumentUploadDropzone } from "./DocumentUploadDropzone";

export type InvoiceEntry = { number: string; date: string; amount: string; file: File | null };

/**
 * Records a received invoice: number, date, amount and its PDF, added through
 * the same drop zone as every other document in the app.
 */
export function InvoiceEntryForm({ initial, amountLabel = "Montant", fileRequired = false, busy = false, submitLabel = "Enregistrer la facture", onSubmit }: {
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
  const [missing, setMissing] = useState<string[]>([]);
  const numberInput = useRef<HTMLInputElement>(null);
  const amountInput = useRef<HTMLInputElement>(null);

  /** Lists what is still missing instead of silently disabling the button. */
  function missingFields(next: InvoiceEntry) {
    return [
      !next.number.trim() && "le n° de facture",
      !next.amount && "le montant",
      fileRequired && !next.file && "le PDF de la facture",
    ].filter((field): field is string => Boolean(field));
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
        <label><span>N° de facture *</span><input ref={numberInput} aria-invalid={missing.includes("le n° de facture")} value={invoice.number} onChange={(event) => change({ number: event.target.value })} /></label>
        <label><span>Date</span><input type="date" value={invoice.date} onChange={(event) => change({ date: event.target.value })} /></label>
        <label><span>{amountLabel} *</span><input ref={amountInput} aria-invalid={missing.includes("le montant")} type="number" min="0" step="1" value={invoice.amount} onChange={(event) => change({ amount: event.target.value })} /></label>
      </div>
      {invoice.file ? (
        <div className="pending-file">
          <span className="invoice-pdf-badge">PDF</span>
          <span>{invoice.file.name}</span>
          <button type="button" aria-label={`Retirer ${invoice.file.name}`} onClick={() => change({ file: null })}><ActionIcon name="close" /></button>
        </div>
      ) : (
        <DocumentUploadDropzone compact title={fileRequired ? "Ajouter la facture (PDF) *" : "Ajouter la facture (PDF)"} description="PDF uniquement · 10 Mo maximum" disabled={busy} onFiles={(files) => change({ file: files[0] ?? null })} />
      )}
      {missing.length > 0 && <div className="notice warning" role="alert">Pour enregistrer la facture, renseignez {missing.join(", ")}.</div>}
      <div>
        <button className="secondary-button" type="button" disabled={busy} onClick={() => void submit()}><ActionIcon name="invoice" /> {submitLabel}</button>
      </div>
    </div>
  );
}
