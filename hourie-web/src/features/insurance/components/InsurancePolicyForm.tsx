import { useState, type FormEvent } from "react";
import { apiRequest } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { formatInsuranceAmount, insuranceTypes } from "../policyDisplay";
import type {
  InsuranceEquipmentOption,
  InsuranceKind as Kind,
  InsurancePolicy as Policy,
  InsurancePolicyDocument as PolicyDocument,
} from "../types";
import {
  EmployeeCoveragePicker,
  EquipmentCoveragePicker,
} from "./InsuranceCoveragePickers";

export function InsuranceAddPanel({
  defaultType,
  policy,
  sites,
  equipmentOptions,
  employeeOptions,
  onClose,
  onSaved,
}: {
  defaultType: Kind;
  policy?: Policy;
  sites: Array<{ id: number; name: string }>;
  equipmentOptions: InsuranceEquipmentOption[];
  employeeOptions: Array<{
    id: number;
    name: string;
    birth_date: string | null;
  }>;
  onClose: () => void;
  onSaved: (policy: Policy) => void;
}) {
  const [type, setType] = useState<Kind>(policy?.insurance_type ?? defaultType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [equipmentIds, setEquipmentIds] = useState<number[]>(
    policy?.equipment?.map((equipment) => equipment.id) ?? [],
  );
  const [employeeIds, setEmployeeIds] = useState<number[]>(
    policy?.employees?.map((employee) => employee.id) ?? [],
  );
  const [amounts, setAmounts] = useState({
    net: policy?.net_premium ?? "0",
    accessories: policy?.accessories_amount ?? "0",
    tax: policy?.tax_amount ?? "0",
  });
  const total = [amounts.net, amounts.accessories, amounts.tax].reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  );
  const setAmount = (field: "net" | "accessories" | "tax", value: string) =>
    setAmounts((current) => ({
      ...current,
      [field]: value.replace(/[^\d]/g, ""),
    }));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const response = await apiRequest<{ data: Policy }>(
        policy
          ? `/api/v1/insurance-policies/${policy.id}`
          : "/api/v1/insurance-policies",
        {
          method: policy ? "PATCH" : "POST",
          body: JSON.stringify({
            insurance_type: type,
            policy_number: form.get("policy_number"),
            source: form.get("source") || null,
            starts_on: form.get("starts_on") || null,
            ends_on: form.get("ends_on") || null,
            insured_situation:
              type === "equipment" || type === "group_health"
                ? null
                : form.get("insured_situation") || null,
            project_id:
              type === "trc_rc" ? form.get("project_id") || null : null,
            equipment_ids: type === "equipment" ? equipmentIds : undefined,
            employee_ids: type === "group_health" ? employeeIds : undefined,
            net_premium: Number(amounts.net) || 0,
            accessories_amount: Number(amounts.accessories) || 0,
            tax_amount: Number(amounts.tax) || 0,
            notes: form.get("notes") || null,
          }),
        },
      );
      if (documents.length > 0) {
        const uploadedDocuments: PolicyDocument[] = [];
        for (const document of documents) {
          const upload = new FormData();
          upload.append("documents[]", document);
          const uploaded = await apiRequest<{ data: PolicyDocument[] }>(
            `/api/v1/insurance-policies/${response.data.id}/documents`,
            { method: "POST", body: upload },
          );
          uploadedDocuments.push(...uploaded.data);
        }
        response.data.documents = [
          ...(response.data.documents ?? []),
          ...uploadedDocuments,
        ];
      }
      await apiRequest<{ data: { sent: boolean } }>(
        `/api/v1/insurance-policies/${response.data.id}/send-expiry-reminder`,
        { method: "POST" },
      );
      onSaved(response.data);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossible d’enregistrer la police.",
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
        aria-label="Ajouter une police"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header insurance-add-header">
          <div>
            <p className="section-label">Assurances</p>
            <h2>{policy ? "Modifier la police" : "Ajouter une police"}</h2>
            <p>Renseignez les informations principales de la couverture.</p>
          </div>
          <div>
            <button
              className="save-button"
              type="submit"
              form="insurance-add-form"
              disabled={saving}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" aria-label="Fermer" onClick={onClose}>
              <ActionIcon name="close" />
            </button>
          </div>
        </header>
        <form
          id="insurance-add-form"
          className="insurance-add-form"
          onSubmit={save}
        >
          {error && (
            <p className="form-alert" role="alert">
              {error}
            </p>
          )}
          <section>
            <h3>
              <ActionIcon name="identification" />
              Informations de la police
            </h3>
            <div className="insurance-form-grid">
              <label>
                Type d’assurance
                <SearchableSelect
                  ariaLabel="Type d’assurance"
                  value={type}
                  onChange={(value) => setType(value as Kind)}
                  placeholder="Sélectionner un type"
                  includeEmpty={false}
                  options={insuranceTypes.map((item) => ({
                    value: item.code,
                    label: item.label,
                  }))}
                />
              </label>
              <label>
                N° de police
                <input
                  name="policy_number"
                  required
                  defaultValue={policy?.policy_number}
                />
              </label>
              <label>
                Assureur
                <input name="source" defaultValue={policy?.source ?? ""} />
              </label>
              {type === "trc_rc" && (
                <InsuranceProjectSelect
                  sites={sites}
                  initialValue={
                    policy?.project?.id ? String(policy.project.id) : ""
                  }
                />
              )}
              {type !== "equipment" && type !== "group_health" && (
                <label className="field-wide">
                  Situation assurée
                  <input
                    name="insured_situation"
                    defaultValue={policy?.insured_situation ?? ""}
                    placeholder="Précisez l’élément couvert si nécessaire"
                  />
                </label>
              )}
            </div>
          </section>
          <section>
            <h3>
              <ActionIcon name="history" />
              Période et couverture
            </h3>
            <div className="insurance-form-grid">
              <label>
                Date de début
                <input
                  type="date"
                  name="starts_on"
                  defaultValue={policy?.starts_on ?? ""}
                />
              </label>
              <label>
                Date d’expiration
                <input
                  type="date"
                  name="ends_on"
                  defaultValue={policy?.ends_on ?? ""}
                />
              </label>
            </div>
          </section>
          <section>
            <h3>
              <ActionIcon name="invoice" />
              Informations financières
            </h3>
            <div className="insurance-form-grid insurance-financial-grid">
              <label>
                Prime nette (FCFA)
                <input
                  inputMode="numeric"
                  value={formatInsuranceAmount(amounts.net)}
                  onChange={(event) => setAmount("net", event.target.value)}
                />
              </label>
              <label>
                ACC (FCFA)
                <input
                  inputMode="numeric"
                  value={formatInsuranceAmount(amounts.accessories)}
                  onChange={(event) =>
                    setAmount("accessories", event.target.value)
                  }
                />
              </label>
              <label>
                Taxe (FCFA)
                <input
                  inputMode="numeric"
                  value={formatInsuranceAmount(amounts.tax)}
                  onChange={(event) => setAmount("tax", event.target.value)}
                />
              </label>
              <label>
                Prime TTC (FCFA)
                <input
                  className="insurance-calculated-total"
                  type="text"
                  value={formatInsuranceAmount(total)}
                  readOnly
                  aria-label="Prime TTC calculée automatiquement"
                />
              </label>
            </div>
          </section>
          {type === "equipment" && (
            <EquipmentCoveragePicker
              options={equipmentOptions}
              selectedIds={equipmentIds}
              onChange={setEquipmentIds}
            />
          )}
          {type === "group_health" && (
            <EmployeeCoveragePicker
              options={employeeOptions}
              selectedIds={employeeIds}
              onChange={setEmployeeIds}
            />
          )}
          <section>
            <h3>
              <ActionIcon name="note" />
              Observations
            </h3>
            <label className="insurance-form-notes">
              <textarea
                name="notes"
                rows={2}
                defaultValue={policy?.notes ?? ""}
              />
            </label>
          </section>
          <section>
            <h3>
              <ActionIcon name="invoice" />
              Documents
            </h3>
            <DocumentUploadDropzone
              compact
              title={
                documents.length
                  ? `${documents.length} document${documents.length > 1 ? "s" : ""} sélectionné${documents.length > 1 ? "s" : ""}`
                  : "Ajouter des documents"
              }
              description="Contrats, attestations ou factures · PDF uniquement · 10 Mo maximum par fichier"
              onFiles={(files) =>
                setDocuments((current) => [...current, ...files])
              }
            />
          </section>
        </form>
      </aside>
    </div>
  );
}

function InsuranceProjectSelect({
  sites,
  initialValue,
}: {
  sites: Array<{ id: number; name: string }>;
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <label>
      Site / projet
      <SearchableSelect
        ariaLabel="Site ou projet"
        value={value}
        onChange={setValue}
        placeholder="À compléter"
        options={sites.map((site) => ({
          value: String(site.id),
          label: site.name,
        }))}
      />
      <input type="hidden" name="project_id" value={value} />
    </label>
  );
}
