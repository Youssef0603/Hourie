import { AmountInput } from "../../../shared/components/AmountInput";
import { useEffect, useState, type FormEvent } from "react";
import { apiErrorMessage } from "../../../shared/api/errors";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { InventoryFormSection } from "../../equipment/components/AssetForm";
import { EquipmentCreationPanel } from "../../equipment/components/EquipmentCreationPanel";
import { localized, operationPhrase } from "../../../i18n/operations";
import { createSubcontractor, getNextItemCode, getSubcontractors, saveSubcontract } from "../api";
import { money, newKey, previewCodes } from "../display";
import { MaterialSupplyEditor } from "./MaterialSupplyEditor";
import type { Subcontract, SubcontractItemInput, SubcontractPayload, Subcontractor } from "../types";

type Project = { id: number; name: string; code: string | null };

const emptyItem = (): SubcontractItemInput => ({ key: newKey(), code: "", description: "", unit: "", quantity: "", unit_price: "", materials_supplied_by: "subcontractor", materials: [] });

function initialState(subcontract?: Subcontract): Omit<SubcontractPayload, "items"> & { items: SubcontractItemInput[] } {
  if (!subcontract) {
    return {
      subcontractor_id: null, project_id: null, title: "", employer_name: "", engineer_name: "", signed_on: new Date().toISOString().slice(0, 10),
      vat_rate: "0", retention_rate: "10", advance_amount: "0", advance_recovery_rate: "0", cash_percent: "0", recurring_deduction_label: "", recurring_deduction_amount: "0", currency: "XOF", notes: "",
      items: [emptyItem()],
    };
  }
  return {
    subcontractor_id: subcontract.subcontractor.id,
    project_id: subcontract.project.id,
    title: subcontract.title,
    employer_name: subcontract.employer_name ?? "",
    engineer_name: subcontract.engineer_name ?? "",
    signed_on: subcontract.signed_on ?? "",
    vat_rate: String(Number(subcontract.vat_rate)),
    retention_rate: String(Number(subcontract.retention_rate)),
    advance_amount: String(Number(subcontract.advance_amount)),
    advance_recovery_rate: String(Number(subcontract.advance_recovery_rate)),
    cash_percent: String(Number(subcontract.cash_percent)),
    recurring_deduction_label: subcontract.recurring_deduction_label ?? "",
    recurring_deduction_amount: String(Number(subcontract.recurring_deduction_amount)),
    currency: subcontract.currency,
    notes: subcontract.notes ?? "",
    items: subcontract.items.map((item) => ({
      key: newKey(), id: item.id, code: item.code ?? "", description: item.description, unit: item.unit,
      quantity: String(Number(item.quantity)), unit_price: String(Number(item.unit_price)),
      materials_supplied_by: item.materials_supplied_by,
      materials: item.materials.map((material) => ({
        key: newKey(), id: material.id, name: material.name, unit: material.unit,
        quantity_per_unit: String(Number(material.quantity_per_unit)), waste_percent: String(Number(material.waste_percent)),
      })),
    })),
  };
}

export function SubcontractForm({ subcontract, projects, onClose, onSaved }: {
  subcontract?: Subcontract;
  projects: Project[];
  onClose: () => void;
  onSaved: (subcontract: Subcontract) => void;
}) {
  const [form, setForm] = useState(() => initialState(subcontract));
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [newSubcontractor, setNewSubcontractor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nextCode, setNextCode] = useState<{ site_code: string; next_sequence: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const itemsLocked = Boolean(subcontract && (subcontract.summary.has_work_valuations || (subcontract.variations?.length ?? 0) > 0));
  const total = form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);

  useEffect(() => {
    getSubcontractors().then(setSubcontractors).catch(() => setSubcontractors([]));
  }, []);

  useEffect(() => {
    if (!form.project_id) return;
    let active = true;
    getNextItemCode(form.project_id)
      .then((next) => { if (active) setNextCode(next); })
      .catch(() => { if (active) setNextCode(null); });
    return () => { active = false; };
  }, [form.project_id]);

  const codes = previewCodes(form.items, form.project_id ? nextCode : null);

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateItem(key: string, field: keyof SubcontractItemInput, value: string) {
    setForm((current) => ({ ...current, items: current.items.map((item) => (item.key === key ? { ...item, [field]: value } : item)) }));
  }

  async function addSubcontractor() {
    if (!newSubcontractor?.trim()) return;
    try {
      const created = await createSubcontractor(newSubcontractor.trim());
      setSubcontractors((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      update("subcontractor_id", created.id);
      setNewSubcontractor(null);
    } catch {
      setError(operationPhrase("Impossible d’ajouter le sous-traitant."));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await saveSubcontract({
        ...form,
        recurring_deduction_amount: form.recurring_deduction_amount || "0",
        items: form.items.map(({ key: _key, code: _code, materials, ...item }) => ({
          ...item,
          materials: materials.map(({ key: _materialKey, ...material }) => material),
        })),
      }, subcontract?.id);
      onSaved(saved);
    } catch (exception) {
      setError(apiErrorMessage(exception, operationPhrase("Impossible d’enregistrer le contrat.")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <EquipmentCreationPanel
      eyebrow={operationPhrase("Sous-traitance")}
      title={subcontract ? localized(`Modifier ${subcontract.reference}`, `تعديل ${subcontract.reference}`) : operationPhrase("Nouveau contrat de sous-traitance")}
      action={<button className="primary-button" type="submit" form="subcontract-form" disabled={saving}>{operationPhrase(saving ? "Enregistrement…" : "Enregistrer")}</button>}
      onClose={onClose}
    >
      <form id="subcontract-form" className="generator-create-form asset-form subcontract-editor" onSubmit={submit}>
        {error && <div className="form-alert" role="alert">{error}</div>}
        <div className="asset-form-layout">
          <InventoryFormSection title={operationPhrase("Contrat")} icon="identification">
            <div className="maintenance-form-grid asset-form-grid-2">
              <div className="field-wide sc-subcontractor-field">
                <span className="sc-field-label">{operationPhrase("Sous-traitant *")}</span>
                  {newSubcontractor === null ? (
                    <SearchableSelect ariaLabel={operationPhrase("Sous-traitant")} required value={form.subcontractor_id ? String(form.subcontractor_id) : ""} onChange={(value) => update("subcontractor_id", value ? Number(value) : null)} placeholder={operationPhrase("Sélectionner un sous-traitant")} options={subcontractors.map((item) => ({ value: String(item.id), label: item.name }))} />
                  ) : (
                    <input autoFocus aria-label={operationPhrase("Nom du nouveau sous-traitant")} placeholder={operationPhrase("Nom de l’entreprise")} value={newSubcontractor} onChange={(event) => setNewSubcontractor(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addSubcontractor(); } }} />
                  )}
                  {newSubcontractor === null
                    ? <button className="sc-link-button" type="button" onClick={() => setNewSubcontractor("")}><ActionIcon name="add" /> {operationPhrase("Nouveau sous-traitant")}</button>
                    : <div className="sc-inline-actions"><button className="secondary-button" type="button" onClick={() => void addSubcontractor()}>{operationPhrase("Ajouter")}</button><button className="secondary-button" type="button" onClick={() => setNewSubcontractor(null)}>{operationPhrase("Annuler")}</button></div>}
              </div>
              <label><span>{operationPhrase("Chantier *")}</span><SearchableSelect ariaLabel={operationPhrase("Chantier")} required value={form.project_id ? String(form.project_id) : ""} onChange={(value) => update("project_id", value ? Number(value) : null)} placeholder={operationPhrase("Sélectionner un chantier")} options={projects.map((project) => ({ value: String(project.id), label: project.code ? `${project.code} · ${project.name}` : localized(`${project.name} (sans code analytique)`, `${project.name} (بدون رمز تحليلي)`) }))} /></label>
              <label><span>{operationPhrase("Date de signature")}</span><input type="date" value={form.signed_on} onChange={(event) => update("signed_on", event.target.value)} /></label>
              <label className="field-wide"><span>{operationPhrase("Objet des travaux")}</span><input required value={form.title} placeholder={operationPhrase("Ex. Ferraillage des dalles")} onChange={(event) => update("title", event.target.value)} /></label>
              <label><span>{operationPhrase("Maître d’ouvrage (employer)")}</span><input value={form.employer_name} placeholder={operationPhrase("Ex. SCI HASA")} onChange={(event) => update("employer_name", event.target.value)} /></label>
              <label><span>{operationPhrase("Bureau de contrôle (engineer)")}</span><input value={form.engineer_name} placeholder={operationPhrase("Ex. LUSEO")} onChange={(event) => update("engineer_name", event.target.value)} /></label>
            </div>
          </InventoryFormSection>

          <InventoryFormSection title={operationPhrase("Conditions de paiement")} icon="specifications">
            <div className="maintenance-form-grid asset-form-grid-2">
              <label><span>{operationPhrase("Retenue de garantie (%)")}</span><input required type="number" min="0" max="100" step="0.01" value={form.retention_rate} onChange={(event) => update("retention_rate", event.target.value)} /></label>
              <label><span>{operationPhrase("TVA (%)")}</span><input required type="number" min="0" max="100" step="0.01" value={form.vat_rate} onChange={(event) => update("vat_rate", event.target.value)} /></label>
              <label><span>{operationPhrase("Avance versée (F CFA)")}</span><AmountInput required value={form.advance_amount} onChange={(amount) => update("advance_amount", amount)} /></label>
              <label><span>{operationPhrase("Récupération de l’avance (% par situation)")}</span><input required type="number" min="0" max="100" step="0.01" value={form.advance_recovery_rate} onChange={(event) => update("advance_recovery_rate", event.target.value)} /></label>
              <label><span>{operationPhrase("Part payée en espèces (%)")}</span><input required type="number" min="0" max="100" step="0.01" value={form.cash_percent} onChange={(event) => update("cash_percent", event.target.value)} /></label>
              <label><span>{operationPhrase("Retenue fixe à chaque situation (F CFA)")}</span><AmountInput value={form.recurring_deduction_amount} onChange={(amount) => update("recurring_deduction_amount", amount)} /></label>
              <label><span>{operationPhrase("Motif de la retenue fixe")}</span><input value={form.recurring_deduction_label} placeholder={operationPhrase("Ex. Coupe pavé")} onChange={(event) => update("recurring_deduction_label", event.target.value)} /></label>
            </div>
            <p className="sc-hint">{operationPhrase("La TVA ne s’applique qu’à la part payée par chèque ou virement. Laissez 0 % si tout est payé par chèque ou virement.")}</p>
          </InventoryFormSection>

          <InventoryFormSection title={operationPhrase("Bordereau des prix")} icon="invoice">
            {itemsLocked && <div className="notice info">{operationPhrase("Le bordereau est verrouillé depuis la première situation ou le premier avenant. Utilisez un avenant pour ajouter des quantités ou des articles.")}</div>}
            <div className="sc-table-wrap">
              <table className="sc-table">
                <thead><tr><th>{operationPhrase("Code")}</th><th>{operationPhrase("Désignation *")}</th><th>{operationPhrase("Unité *")}</th><th className="num">{operationPhrase("Quantité *")}</th><th className="num">{operationPhrase("Prix unitaire *")}</th><th /></tr></thead>
                <tbody>
                  {form.items.map((item, index) => (
                    <tr key={item.key}>
                      <td className="sc-code">{codes[index]}</td>
                      <td><input className="text" required aria-label={localized(`Désignation ligne ${index + 1}`, `وصف البند ${index + 1}`)} disabled={itemsLocked} value={item.description} onChange={(event) => updateItem(item.key, "description", event.target.value)} /></td>
                      <td><input className="text unit" required aria-label={localized(`Unité ligne ${index + 1}`, `وحدة البند ${index + 1}`)} placeholder="m³, t, m²…" disabled={itemsLocked} value={item.unit} onChange={(event) => updateItem(item.key, "unit", event.target.value)} /></td>
                      <td><input required type="number" min="0.001" step="0.001" aria-label={localized(`Quantité ligne ${index + 1}`, `كمية البند ${index + 1}`)} disabled={itemsLocked} value={item.quantity} onChange={(event) => updateItem(item.key, "quantity", event.target.value)} /></td>
                      <td><AmountInput required aria-label={localized(`Prix unitaire ligne ${index + 1}`, `سعر الوحدة للبند ${index + 1}`)} disabled={itemsLocked} value={item.unit_price} onChange={(amount) => updateItem(item.key, "unit_price", amount)} /></td>
                      <td>{!itemsLocked && <button className="remove-line" type="button" aria-label={localized(`Supprimer la ligne ${index + 1}`, `حذف البند ${index + 1}`)} disabled={form.items.length === 1} onClick={() => update("items", form.items.filter((candidate) => candidate.key !== item.key))}><ActionIcon name="delete" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={3}>{operationPhrase("Montant du contrat (HT)")}</td><td className="num" colSpan={2}>{money(total)}</td><td /></tr></tfoot>
              </table>
            </div>
            {!itemsLocked && <div className="sc-actions"><button className="secondary-button" type="button" onClick={() => update("items", [...form.items, emptyItem()])}><ActionIcon name="add" /> {operationPhrase("Ajouter une ligne")}</button></div>}
          </InventoryFormSection>

          <InventoryFormSection title={operationPhrase("Matériaux")} icon="specifications">
            <p className="sc-hint">{operationPhrase("Pour chaque ligne, indiquez qui achète les matériaux. Quand c’est ARH, le sous-traitant n’est payé que pour la main-d’œuvre, et Hourie compare les achats d’ARH (bons de commande) avec ce que les travaux ont réellement consommé.")}</p>
            <div className="sc-material-lines">
              {form.items.map((item, index) => (
                <MaterialSupplyEditor
                  key={item.key}
                  title={`${codes[index]} · ${item.description || localized(`Ligne ${index + 1}`, `البند ${index + 1}`)}`}
                  unit={item.unit}
                  lineNumber={index + 1}
                  supply={item}
                  onChange={(supply) => setForm((current) => ({ ...current, items: current.items.map((candidate) => candidate.key === item.key ? { ...candidate, ...supply } : candidate) }))}
                />
              ))}
            </div>
          </InventoryFormSection>
        </div>
      </form>
    </EquipmentCreationPanel>
  );
}
