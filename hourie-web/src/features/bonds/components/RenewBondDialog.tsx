import { useState, type FormEvent } from "react";
import { ApiError, apiRequest } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { Modal } from "../../../shared/components/Modal";
import { localized, operationPhrase } from "../../../i18n/operations";
import { formatBondDate, nextBondExpiry } from "../bondDisplay";
import type { Bond, BondDocument } from "../types";
import "../../../shared/components/renewal.css";

/**
 * Renews a bond in one step: new expiry, the bank's extension letter and,
 * when it changed, the new amount. The previous expiry stays in the history.
 */
export function RenewBondDialog({
  bond,
  onClose,
  onRenewed,
}: {
  bond: Bond;
  onClose: () => void;
  onRenewed: (bond: Bond) => void;
}) {
  const [expiresOn, setExpiresOn] = useState(nextBondExpiry(bond.expires_on));
  const [amount, setAmount] = useState(String(Math.round(Number(bond.amount) || 0)));
  const [documents, setDocuments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function renew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await apiRequest<{ data: Bond }>(`/api/v1/bonds/${bond.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          project_id: bond.project.id,
          location_id: bond.location?.id ?? null,
          bond_type: bond.bond_type,
          issuer: bond.issuer,
          amount: Number(amount) || 0,
          currency: bond.currency,
          issued_on: bond.issued_on,
          expires_on: expiresOn,
          notes: bond.notes,
        }),
      });
      const uploaded: BondDocument[] = [];
      for (const document of documents) {
        const body = new FormData();
        body.append("documents[]", document);
        const result = await apiRequest<{ data: BondDocument[] }>(
          `/api/v1/bonds/${bond.id}/documents`,
          { method: "POST", body },
        );
        uploaded.push(...result.data);
      }
      onRenewed({
        ...response.data,
        documents: [...(response.data.documents ?? []), ...uploaded],
      });
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? (Object.values(reason.errors)[0]?.[0] ?? reason.message)
          : operationPhrase("Impossible de renouveler la caution."),
      );
      setSaving(false);
    }
  }

  return (
    <Modal title={operationPhrase("Renouveler la caution")} onClose={onClose} size="site">
      <form className="renewal-form" onSubmit={renew}>
        <p className="renewal-previous">
          <ActionIcon name="history" />
          {operationPhrase("Validité actuelle")}&nbsp;:{" "}
          <strong>
            {formatBondDate(bond.issued_on)} → {formatBondDate(bond.expires_on)}
          </strong>
        </p>
        {error && (
          <div className="form-alert field-wide" role="alert">
            {error}
          </div>
        )}
        <label className="renewal-date">
          {operationPhrase("Nouvelle date d’expiration")}
          <input
            required
            type="date"
            min={bond.issued_on ?? undefined}
            value={expiresOn}
            disabled={saving}
            onChange={(event) => setExpiresOn(event.target.value)}
          />
        </label>
        <label className="renewal-date">
          {`${operationPhrase("Montant")} (${bond.currency})`}
          <input
            required
            inputMode="numeric"
            value={Number(amount || 0).toLocaleString("fr-FR")}
            disabled={saving}
            onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))}
          />
        </label>
        <div className="field-wide">
          <DocumentUploadDropzone
            compact
            title={
              documents.length
                ? localized(
                    `${documents.length} document${documents.length > 1 ? "s" : ""} sélectionné${documents.length > 1 ? "s" : ""}`,
                    documents.length === 1 ? "مستند واحد محدد" : `${documents.length} مستندات محددة`,
                  )
                : operationPhrase("Ajouter la lettre de prorogation")
            }
            description={operationPhrase("Contrats, attestations ou factures · PDF uniquement · 10 Mo maximum par fichier")}
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
