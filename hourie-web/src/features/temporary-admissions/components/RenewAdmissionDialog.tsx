import { useState, type FormEvent } from "react";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { Modal } from "../../../shared/components/Modal";
import { formatDate } from "../../../shared/format";
import { activeLanguage } from "../../../i18n/fr";
import { operationPhrase } from "../../../i18n/operations";
import { admissionError, uploadAdmissionDocument } from "../api";
import { predictAdmissionExpiry } from "../renewal";
import type { TemporaryAdmission } from "../types";
import "../../../shared/components/renewal.css";

/**
 * Renews an AT: each new AT document (date + validity in months) extends the
 * period. The server computes the new expiry from the entry date, exactly as
 * before; the dialog only shows what it will be.
 */
export function RenewAdmissionDialog({
  item,
  validityMonths,
  onClose,
  onRenewed,
}: {
  item: TemporaryAdmission;
  /** Validity of the latest AT, proposed again (usually 12). */
  validityMonths: number;
  onClose: () => void;
  onRenewed: (item: TemporaryAdmission) => void;
}) {
  const [atDate, setAtDate] = useState("");
  const [months, setMonths] = useState(String(validityMonths));
  const [documents, setDocuments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const predicted =
    item.expires_on && atDate && Number(months) > 0
      ? predictAdmissionExpiry(item.expires_on, atDate, Number(months))
      : null;

  async function renew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documents.length) {
      setError(operationPhrase("Ajoutez le document AT."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      let saved = item;
      for (const file of documents) {
        saved = await uploadAdmissionDocument(item.id, "admission", file, atDate, Number(months));
      }
      onRenewed(saved);
    } catch (caught) {
      setError(admissionError(caught, operationPhrase("Impossible d’ajouter ce document AT.")));
      setSaving(false);
    }
  }

  return (
    <Modal title={operationPhrase("Renouveler l’AT")} onClose={onClose} size="site">
      <form className="renewal-form" onSubmit={renew}>
        <p className="renewal-previous">
          <ActionIcon name="history" />
          {operationPhrase("Échéance actuelle")}&nbsp;:{" "}
          <strong>{formatDate(item.expires_on)}</strong>
        </p>
        {error && (
          <div className="form-alert field-wide" role="alert">
            {error}
          </div>
        )}
        <label className="renewal-date">
          {operationPhrase("Date de l’AT")}
          <input
            required
            type="date"
            min={item.entered_on ?? undefined}
            value={atDate}
            disabled={saving}
            onChange={(event) => setAtDate(event.target.value)}
          />
        </label>
        <label className="renewal-date">
          {operationPhrase("Durée de validité (mois)")}
          <input
            required
            type="number"
            min={1}
            max={120}
            step={1}
            value={months}
            disabled={saving}
            onChange={(event) => setMonths(event.target.value)}
          />
        </label>
        <p className="renewal-total">
          {operationPhrase("Nouvelle échéance")}
          <strong>{predicted ? formatDate(predicted) : "—"}</strong>
        </p>
        <div className="field-wide">
          <DocumentUploadDropzone
            compact
            disabled={saving}
            title={
              documents.length
                ? activeLanguage === "ar"
                  ? `${documents.length} مستند إدخال مؤقت محدد`
                  : `${documents.length} document${documents.length > 1 ? "s" : ""} AT sélectionné${documents.length > 1 ? "s" : ""}`
                : operationPhrase("Ajouter le document AT")
            }
            description={operationPhrase("Un ou plusieurs documents AT · PDF · 10 Mo maximum par fichier")}
            onFiles={(files) => setDocuments((current) => [...current, ...files])}
          />
        </div>
        <div className="maintenance-form-actions">
          <button className="primary-button save-button" type="submit" disabled={saving}>
            <ActionIcon name="refresh" />
            {saving ? operationPhrase("Renouvellement…") : operationPhrase("Renouveler")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
