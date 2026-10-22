import { useState, type FormEvent } from "react";
import { ApiError, apiRequest } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { bondTypeLabel, bondTypeOptions } from "../bondDisplay";
import { activeLanguage } from "../../../i18n/fr";
import { operationPhrase } from "../../../i18n/operations";
import type { Bond, BondDocument, BondSite as Site, BondType } from "../types";

export function BondForm({
  sites,
  bond,
  onClose,
  onSaved,
}: {
  sites: Site[];
  bond?: Bond;
  onClose: () => void;
  onSaved: (bond: Bond) => void;
}) {
  const [siteId, setSiteId] = useState(bond ? String(bond.project.id) : "");
  const [locationId, setLocationId] = useState(
    bond?.location ? String(bond.location.id) : "",
  );
  const [bondType, setBondType] = useState<BondType>(
    bond?.bond_type ?? "advance_payment",
  );
  const [currency, setCurrency] = useState(bond?.currency ?? "XOF");
  const [amount, setAmount] = useState(bond?.amount ?? "0");
  const [documents, setDocuments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const physicalLocations = (
    sites.find((site) => String(site.id) === siteId)?.locations ?? []
  ).filter((location) => location.parent_id !== null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    let savedBond: Bond | null = null;
    try {
      const response = await apiRequest<{ data: Bond }>(
        bond ? `/api/v1/bonds/${bond.id}` : "/api/v1/bonds",
        {
          method: bond ? "PATCH" : "POST",
          body: JSON.stringify({
            project_id: Number(siteId),
            location_id: Number(locationId),
            bond_type: bondType,
            issuer: form.get("issuer") || null,
            amount: Number(amount) || 0,
            currency,
            issued_on: form.get("issued_on") || null,
            expires_on: form.get("expires_on") || null,
            notes: form.get("notes") || null,
          }),
        },
      );
      savedBond = response.data;
      const uploaded: BondDocument[] = [];
      for (const document of documents) {
        const body = new FormData();
        body.append("documents[]", document);
        const result = await apiRequest<{ data: BondDocument[] }>(
          `/api/v1/bonds/${response.data.id}/documents`,
          { method: "POST", body },
        );
        uploaded.push(...result.data);
      }
      response.data.documents = [
        ...(response.data.documents ?? []),
        ...uploaded,
      ];
      await apiRequest<{ data: { queued: boolean } }>(
        `/api/v1/bonds/${response.data.id}/send-expiry-reminder`,
        { method: "POST" },
      ).catch(() => undefined);
      onSaved(response.data);
    } catch (reason) {
      if (!bond && savedBond) {
        await apiRequest(`/api/v1/bonds/${savedBond.id}`, {
          method: "DELETE",
        }).catch(() => undefined);
      }
      setError(
        reason instanceof ApiError
          ? (Object.values(reason.errors)[0]?.[0] ?? reason.message)
          : operationPhrase("Impossible d’enregistrer la caution."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="detail-backdrop" onMouseDown={onClose}>
      <aside
        className="detail-panel insurance-add-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={operationPhrase(bond ? "Modifier la caution" : "Ajouter une caution")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header insurance-add-header">
          <div>
            <p className="section-label">{operationPhrase("Cautions")}</p>
            <h2>{operationPhrase(bond ? "Modifier la caution" : "Ajouter une caution")}</h2>
            <p>{operationPhrase("Renseignez la garantie financière et sa localisation précise.")}</p>
          </div>
          <div>
            <button
              className="save-button"
              type="submit"
              form="bond-form"
              disabled={saving || !siteId || !locationId}
            >
              {operationPhrase(saving ? "Enregistrement…" : "Enregistrer")}
            </button>
            <button type="button" aria-label={operationPhrase("Fermer")} onClick={onClose}>
              <ActionIcon name="close" />
            </button>
          </div>
        </header>
        <form id="bond-form" className="insurance-add-form" onSubmit={save}>
          {error && (
            <p className="form-alert" role="alert">
              {error}
            </p>
          )}
          <section>
            <h3>
              <ActionIcon name="identification" />
              {operationPhrase("Informations de la caution")}
            </h3>
            <div className="insurance-form-grid">
              <label>
                {operationPhrase("Chantier")}
                <SearchableSelect
                  ariaLabel={operationPhrase("Chantier lié")}
                  value={siteId}
                  onChange={(value) => {
                    setSiteId(value);
                    setLocationId("");
                  }}
                  placeholder={operationPhrase("Sélectionner un chantier")}
                  includeEmpty={false}
                  options={sites.map((site) => ({
                    value: String(site.id),
                    label: site.name,
                  }))}
                />
              </label>
              <label>
                {operationPhrase("Localisation physique")}
                <SearchableSelect
                  ariaLabel={operationPhrase("Localisation physique")}
                  value={locationId}
                  onChange={setLocationId}
                  placeholder={
                    siteId
                      ? operationPhrase("Sélectionner une localisation")
                      : operationPhrase("Sélectionnez d’abord un chantier")
                  }
                  includeEmpty={false}
                  disabled={!siteId}
                  options={physicalLocations.map((location) => ({
                    value: String(location.id),
                    label: location.name,
                  }))}
                />
              </label>
              <label>
                {operationPhrase("Type de caution")}
                <SearchableSelect
                  ariaLabel={operationPhrase("Type de caution")}
                  value={bondType}
                  onChange={(value) => setBondType(value as BondType)}
                  placeholder={operationPhrase("Sélectionner un type")}
                  includeEmpty={false}
                  options={bondTypeOptions.map((option) => ({ ...option, label: bondTypeLabel(option.value) }))}
                />
              </label>
              <label>
                {operationPhrase("Banque / émetteur")}
                <input name="issuer" defaultValue={bond?.issuer ?? ""} />
              </label>
            </div>
          </section>
          <section>
            <h3>
              <ActionIcon name="invoice" />
              {operationPhrase("Montant de la caution")}
            </h3>
            <div className="insurance-form-grid bond-payment-grid">
              <label>
                {operationPhrase("Montant")}
                <input
                  inputMode="numeric"
                  value={Number(amount || 0).toLocaleString("fr-FR")}
                  onChange={(event) =>
                    setAmount(event.target.value.replace(/[^\d]/g, ""))
                  }
                />
              </label>
              <label>
                {operationPhrase("Devise")}
                <SearchableSelect
                  ariaLabel={operationPhrase("Devise")}
                  value={currency}
                  onChange={setCurrency}
                  placeholder={operationPhrase("Sélectionner une devise")}
                  includeEmpty={false}
                  options={[
                    { value: "XOF", label: "FCFA (XOF)" },
                    { value: "EUR", label: operationPhrase("Euro (EUR)") },
                    { value: "USD", label: operationPhrase("Dollar (USD)") },
                  ]}
                />
              </label>
            </div>
          </section>
          <section>
            <h3>
              <ActionIcon name="history" />
              {operationPhrase("Dates")}
            </h3>
            <div className="insurance-form-grid">
              <label>
                {operationPhrase("Date d’émission")}
                <input
                  type="date"
                  name="issued_on"
                  defaultValue={bond?.issued_on ?? ""}
                />
              </label>
              <label>
                {operationPhrase("Date d’expiration")}
                <input
                  type="date"
                  name="expires_on"
                  defaultValue={bond?.expires_on ?? ""}
                />
              </label>
            </div>
          </section>
          <section>
            <h3>
              <ActionIcon name="note" />
              {operationPhrase("Observations")}
            </h3>
            <label className="insurance-form-notes">
              <textarea
                name="notes"
                rows={2}
                defaultValue={bond?.notes ?? ""}
              />
            </label>
          </section>
          <section>
            <h3>
              <ActionIcon name="invoice" />
              {operationPhrase("Documents")}
            </h3>
            <DocumentUploadDropzone
              compact
              title={
                documents.length
                  ? activeLanguage === "ar" ? `${documents.length} مستند محدد` : `${documents.length} document${documents.length > 1 ? "s" : ""} sélectionné${documents.length > 1 ? "s" : ""}`
                  : operationPhrase("Ajouter des documents")
              }
              description={operationPhrase("Garanties, attestations ou avenants · PDF uniquement · 10 Mo maximum par fichier")}
              onFiles={(files) =>
                setDocuments((current) => [...current, ...files])
              }
            />
            {documents.length > 0 && (
              <ul className="bond-selected-documents">
                {documents.map((document, index) => (
                  <li key={`${document.name}-${index}`}>
                    <span>{document.name}</span>
                    <button
                      type="button"
                      aria-label={`${operationPhrase("Retirer")} ${document.name}`}
                      onClick={() =>
                        setDocuments((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </form>
      </aside>
    </div>
  );
}
