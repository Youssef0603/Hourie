import { useState, type FormEvent } from "react";
import { apiRequest } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { Modal } from "../../../shared/components/Modal";
import { localized, operationPhrase } from "../../../i18n/operations";
import { formatInsuranceAmount, formatInsuranceDate } from "../policyDisplay";
import type {
  InsurancePolicy as Policy,
  InsurancePolicyDocument as PolicyDocument,
} from "../types";
import { nextInsurancePeriod } from "../renewalPeriod";
import "../../../shared/components/renewal.css";

/**
 * Renews a policy in one step: new period, new attestation and, when it
 * changed, the new premium. The previous period stays in the history.
 */
export function RenewInsuranceDialog({
  policy,
  onClose,
  onRenewed,
}: {
  policy: Policy;
  onClose: () => void;
  onRenewed: (policy: Policy) => void;
}) {
  const period = nextInsurancePeriod(policy.ends_on);
  const [startsOn, setStartsOn] = useState(period.startsOn);
  const [endsOn, setEndsOn] = useState(period.endsOn);
  const [policyNumber, setPolicyNumber] = useState(policy.policy_number);
  const [amounts, setAmounts] = useState({
    net: policy.net_premium ?? "0",
    accessories: policy.accessories_amount ?? "0",
    tax: policy.tax_amount ?? "0",
  });
  const [documents, setDocuments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const total = [amounts.net, amounts.accessories, amounts.tax].reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  );
  const setAmount = (field: keyof typeof amounts, value: string) =>
    setAmounts((current) => ({ ...current, [field]: value.replace(/[^\d]/g, "") }));

  async function renew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await apiRequest<{ data: Policy }>(
        `/api/v1/insurance-policies/${policy.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            policy_number: policyNumber.trim(),
            starts_on: startsOn,
            ends_on: endsOn,
            net_premium: Number(amounts.net) || 0,
            accessories_amount: Number(amounts.accessories) || 0,
            tax_amount: Number(amounts.tax) || 0,
          }),
        },
      );
      const uploaded: PolicyDocument[] = [];
      for (const document of documents) {
        const upload = new FormData();
        upload.append("documents[]", document);
        const result = await apiRequest<{ data: PolicyDocument[] }>(
          `/api/v1/insurance-policies/${policy.id}/documents`,
          { method: "POST", body: upload },
        );
        uploaded.push(...result.data);
      }
      onRenewed({
        ...response.data,
        documents: [...(response.data.documents ?? []), ...uploaded],
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : operationPhrase("Impossible de renouveler la police."),
      );
      setSaving(false);
    }
  }

  return (
    <Modal title={operationPhrase("Renouveler la police")} onClose={onClose} size="site">
      <form className="renewal-form" onSubmit={renew}>
        <p className="renewal-previous">
          <ActionIcon name="history" />
          {operationPhrase("Période actuelle")}&nbsp;:{" "}
          <strong>
            {formatInsuranceDate(policy.starts_on)} → {formatInsuranceDate(policy.ends_on)}
          </strong>
        </p>
        {error && (
          <div className="form-alert field-wide" role="alert">
            {error}
          </div>
        )}
        <label className="renewal-date">
          {operationPhrase("Nouvelle date de début")}
          <input
            required
            type="date"
            value={startsOn}
            disabled={saving}
            onChange={(event) => setStartsOn(event.target.value)}
          />
        </label>
        <label className="renewal-date">
          {operationPhrase("Nouvelle date d’expiration")}
          <input
            required
            type="date"
            min={startsOn}
            value={endsOn}
            disabled={saving}
            onChange={(event) => setEndsOn(event.target.value)}
          />
        </label>
        <label className="field-wide">
          {operationPhrase("N° de police")}
          <input
            required
            value={policyNumber}
            disabled={saving}
            onChange={(event) => setPolicyNumber(event.target.value)}
          />
        </label>
        <label>
          {operationPhrase("Prime nette (FCFA)")}
          <input
            inputMode="numeric"
            value={formatInsuranceAmount(amounts.net)}
            disabled={saving}
            onChange={(event) => setAmount("net", event.target.value)}
          />
        </label>
        <label>
          {operationPhrase("ACC (FCFA)")}
          <input
            inputMode="numeric"
            value={formatInsuranceAmount(amounts.accessories)}
            disabled={saving}
            onChange={(event) => setAmount("accessories", event.target.value)}
          />
        </label>
        <label>
          {operationPhrase("Taxe (FCFA)")}
          <input
            inputMode="numeric"
            value={formatInsuranceAmount(amounts.tax)}
            disabled={saving}
            onChange={(event) => setAmount("tax", event.target.value)}
          />
        </label>
        <p className="renewal-total">
          {operationPhrase("Prime totale")}
          <strong>{formatInsuranceAmount(total)} FCFA</strong>
        </p>
        <div className="field-wide">
          <DocumentUploadDropzone
            compact
            title={
              documents.length
                ? localized(
                    `${documents.length} document${documents.length > 1 ? "s" : ""} sélectionné${documents.length > 1 ? "s" : ""}`,
                    documents.length === 1 ? "مستند واحد محدد" : `${documents.length} مستندات محددة`,
                  )
                : operationPhrase("Ajouter la nouvelle attestation")
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
