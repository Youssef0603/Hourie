import { useEffect, useState, type FormEvent } from "react";
import { apiErrorMessage } from "../../../shared/api/errors";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { InventoryFormSection } from "../../equipment/components/AssetForm";
import { EquipmentCreationPanel } from "../../equipment/components/EquipmentCreationPanel";
import { createSubcontractor, getNextItemCode, getSubcontractors, saveSubcontract } from "../api";
import { money, newKey, previewCodes } from "../display";
import type { MaterialInput, MaterialsSuppliedBy, Subcontract, SubcontractItemInput, SubcontractPayload, Subcontractor } from "../types";

type Project = { id: number; name: string; code: string | null };

const emptyItem = (): SubcontractItemInput => ({ key: newKey(), code: "", description: "", unit: "", quantity: "", unit_price: "", materials_supplied_by: "subcontractor", materials: [] });
const emptyMaterial = (): MaterialInput => ({ key: newKey(), name: "", unit: "", quantity_per_unit: "", waste_percent: "5" });

function initialState(subcontract?: Subcontract): Omit<SubcontractPayload, "items"> & { items: SubcontractItemInput[] } {
  if (!subcontract) {
    return {
      subcontractor_id: null, project_id: null, title: "", signed_on: new Date().toISOString().slice(0, 10),
      vat_rate: "0", retention_rate: "10", advance_amount: "0", advance_recovery_rate: "0", currency: "XOF", notes: "",
      items: [emptyItem()],
    };
  }
  return {
    subcontractor_id: subcontract.subcontractor.id,
    project_id: subcontract.project.id,
    title: subcontract.title,
    signed_on: subcontract.signed_on ?? "",
    vat_rate: String(Number(subcontract.vat_rate)),
    retention_rate: String(Number(subcontract.retention_rate)),
    advance_amount: String(Number(subcontract.advance_amount)),
    advance_recovery_rate: String(Number(subcontract.advance_recovery_rate)),
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
  const itemsLocked = Boolean(subcontract && (subcontract.valuations.length > 0 || (subcontract.variations?.length ?? 0) > 0));
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

  function updateMaterials(itemKey: string, change: (materials: MaterialInput[]) => MaterialInput[]) {
    setForm((current) => ({ ...current, items: current.items.map((item) => (item.key === itemKey ? { ...item, materials: change(item.materials) } : item)) }));
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
      setError("Impossible d’ajouter le sous-traitant.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await saveSubcontract({
        ...form,
        items: form.items.map(({ key: _key, code: _code, materials, ...item }) => ({
          ...item,
          materials: materials.map(({ key: _materialKey, ...material }) => material),
        })),
      }, subcontract?.id);
      onSaved(saved);
    } catch (exception) {
      setError(apiErrorMessage(exception, "Impossible d’enregistrer le contrat."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <EquipmentCreationPanel
      eyebrow="Sous-traitance"
      title={subcontract ? `Modifier ${subcontract.reference}` : "Nouveau contrat de sous-traitance"}
      action={<button className="primary-button" type="submit" form="subcontract-form" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>}
      onClose={onClose}
    >
      <form id="subcontract-form" className="generator-create-form asset-form subcontract-editor" onSubmit={submit}>
        {error && <div className="form-alert" role="alert">{error}</div>}
        <div className="asset-form-layout">
          <InventoryFormSection title="Contrat" icon="identification">
            <div className="maintenance-form-grid asset-form-grid-2">
              <div className="field-wide sc-subcontractor-field">
                <span className="sc-field-label">Sous-traitant *</span>
                  {newSubcontractor === null ? (
                    <SearchableSelect ariaLabel="Sous-traitant" required value={form.subcontractor_id ? String(form.subcontractor_id) : ""} onChange={(value) => update("subcontractor_id", value ? Number(value) : null)} placeholder="Sélectionner un sous-traitant" options={subcontractors.map((item) => ({ value: String(item.id), label: item.name }))} />
                  ) : (
                    <input autoFocus aria-label="Nom du nouveau sous-traitant" placeholder="Nom de l’entreprise" value={newSubcontractor} onChange={(event) => setNewSubcontractor(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addSubcontractor(); } }} />
                  )}
                  {newSubcontractor === null
                    ? <button className="sc-link-button" type="button" onClick={() => setNewSubcontractor("")}><ActionIcon name="add" /> Nouveau sous-traitant</button>
                    : <div className="sc-inline-actions"><button className="secondary-button" type="button" onClick={() => void addSubcontractor()}>Ajouter</button><button className="secondary-button" type="button" onClick={() => setNewSubcontractor(null)}>Annuler</button></div>}
              </div>
              <label><span>Chantier *</span><SearchableSelect ariaLabel="Chantier" required value={form.project_id ? String(form.project_id) : ""} onChange={(value) => update("project_id", value ? Number(value) : null)} placeholder="Sélectionner un chantier" options={projects.map((project) => ({ value: String(project.id), label: project.code ? `${project.code} · ${project.name}` : `${project.name} (sans code analytique)` }))} /></label>
              <label><span>Date de signature</span><input type="date" value={form.signed_on} onChange={(event) => update("signed_on", event.target.value)} /></label>
              <label className="field-wide"><span>Objet des travaux</span><input required value={form.title} placeholder="Ex. Ferraillage des dalles" onChange={(event) => update("title", event.target.value)} /></label>
            </div>
          </InventoryFormSection>

          <InventoryFormSection title="Conditions de paiement" icon="specifications">
            <div className="maintenance-form-grid asset-form-grid-2">
              <label><span>Retenue de garantie (%)</span><input required type="number" min="0" max="100" step="0.01" value={form.retention_rate} onChange={(event) => update("retention_rate", event.target.value)} /></label>
              <label><span>TVA (%)</span><input required type="number" min="0" max="100" step="0.01" value={form.vat_rate} onChange={(event) => update("vat_rate", event.target.value)} /></label>
              <label><span>Avance versée (F CFA)</span><input required type="number" min="0" step="1" value={form.advance_amount} onChange={(event) => update("advance_amount", event.target.value)} /></label>
              <label><span>Récupération de l’avance (% par situation)</span><input required type="number" min="0" max="100" step="0.01" value={form.advance_recovery_rate} onChange={(event) => update("advance_recovery_rate", event.target.value)} /></label>
            </div>
          </InventoryFormSection>

          <InventoryFormSection title="Bordereau des prix" icon="invoice">
            {itemsLocked && <div className="notice info">Le bordereau est verrouillé depuis la première situation ou le premier avenant. Utilisez un avenant pour ajouter des quantités ou des articles.</div>}
            <div className="sc-table-wrap">
              <table className="sc-table">
                <thead><tr><th>Code</th><th>Désignation *</th><th>Unité *</th><th className="num">Quantité *</th><th className="num">Prix unitaire *</th><th /></tr></thead>
                <tbody>
                  {form.items.map((item, index) => (
                    <tr key={item.key}>
                      <td className="sc-code">{codes[index]}</td>
                      <td><input className="text" required aria-label={`Désignation ligne ${index + 1}`} disabled={itemsLocked} value={item.description} onChange={(event) => updateItem(item.key, "description", event.target.value)} /></td>
                      <td><input className="text unit" required aria-label={`Unité ligne ${index + 1}`} placeholder="m³, t, m²…" disabled={itemsLocked} value={item.unit} onChange={(event) => updateItem(item.key, "unit", event.target.value)} /></td>
                      <td><input required type="number" min="0.001" step="0.001" aria-label={`Quantité ligne ${index + 1}`} disabled={itemsLocked} value={item.quantity} onChange={(event) => updateItem(item.key, "quantity", event.target.value)} /></td>
                      <td><input required type="number" min="0" step="0.01" aria-label={`Prix unitaire ligne ${index + 1}`} disabled={itemsLocked} value={item.unit_price} onChange={(event) => updateItem(item.key, "unit_price", event.target.value)} /></td>
                      <td>{!itemsLocked && <button className="remove-line" type="button" aria-label={`Supprimer la ligne ${index + 1}`} disabled={form.items.length === 1} onClick={() => update("items", form.items.filter((candidate) => candidate.key !== item.key))}><ActionIcon name="delete" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={3}>Montant du contrat (HT)</td><td className="num" colSpan={2}>{money(total)}</td><td /></tr></tfoot>
              </table>
            </div>
            {!itemsLocked && <div className="sc-actions"><button className="secondary-button" type="button" onClick={() => update("items", [...form.items, emptyItem()])}><ActionIcon name="add" /> Ajouter une ligne</button></div>}
          </InventoryFormSection>

          <InventoryFormSection title="Matériaux" icon="specifications">
            <p className="sc-hint">Pour chaque ligne, indiquez qui achète les matériaux. Quand c’est ARH, le sous-traitant n’est payé que pour la main-d’œuvre, et Hourie compare les achats d’ARH (bons de commande) avec ce que les travaux ont réellement consommé.</p>
            <div className="sc-material-lines">
              {form.items.map((item, index) => (
                <div className="sc-material-line" key={item.key}>
                  <div className="sc-material-line-header">
                    <strong>{codes[index]} · {item.description || `Ligne ${index + 1}`}</strong>
                    <select aria-label={`Matériaux fournis par, ligne ${index + 1}`} value={item.materials_supplied_by} onChange={(event) => setForm((current) => ({ ...current, items: current.items.map((candidate) => candidate.key === item.key ? { ...candidate, materials_supplied_by: event.target.value as MaterialsSuppliedBy, materials: event.target.value === "arh" && candidate.materials.length === 0 ? [emptyMaterial()] : candidate.materials } : candidate) }))}>
                      <option value="subcontractor">Fournis par le sous-traitant (inclus dans son prix)</option>
                      <option value="arh">Fournis par ARH (main-d’œuvre seule)</option>
                    </select>
                  </div>
                  {item.materials_supplied_by === "arh" && (
                    <>
                      <div className="sc-table-wrap">
                      <table className="sc-table">
                        <thead><tr><th>Matériau *</th><th>Unité *</th><th className="num">Qté par {item.unit || "unité"} *</th><th className="num">Perte %</th><th /></tr></thead>
                        <tbody>
                          {item.materials.map((material, materialIndex) => (
                            <tr key={material.key}>
                              <td><input className="text" required aria-label={`Matériau ${materialIndex + 1}, ligne ${index + 1}`} placeholder="Ex. Fer HA, Ciment" value={material.name} onChange={(event) => updateMaterials(item.key, (materials) => materials.map((candidate) => candidate.key === material.key ? { ...candidate, name: event.target.value } : candidate))} /></td>
                              <td><input className="text unit" required aria-label={`Unité du matériau ${materialIndex + 1}, ligne ${index + 1}`} placeholder="kg, sac, m³" value={material.unit} onChange={(event) => updateMaterials(item.key, (materials) => materials.map((candidate) => candidate.key === material.key ? { ...candidate, unit: event.target.value } : candidate))} /></td>
                              <td><input required type="number" min="0.0001" step="0.0001" aria-label={`Quantité par unité du matériau ${materialIndex + 1}, ligne ${index + 1}`} value={material.quantity_per_unit} onChange={(event) => updateMaterials(item.key, (materials) => materials.map((candidate) => candidate.key === material.key ? { ...candidate, quantity_per_unit: event.target.value } : candidate))} /></td>
                              <td><input required type="number" min="0" max="100" step="0.1" aria-label={`Perte du matériau ${materialIndex + 1}, ligne ${index + 1}`} value={material.waste_percent} onChange={(event) => updateMaterials(item.key, (materials) => materials.map((candidate) => candidate.key === material.key ? { ...candidate, waste_percent: event.target.value } : candidate))} /></td>
                              <td><button className="remove-line" type="button" aria-label={`Retirer le matériau ${materialIndex + 1}, ligne ${index + 1}`} onClick={() => updateMaterials(item.key, (materials) => materials.filter((candidate) => candidate.key !== material.key))}><ActionIcon name="delete" /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                      <div className="sc-actions"><button className="secondary-button" type="button" onClick={() => updateMaterials(item.key, (materials) => [...materials, emptyMaterial()])}><ActionIcon name="add" /> Ajouter un matériau</button></div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </InventoryFormSection>
        </div>
      </form>
    </EquipmentCreationPanel>
  );
}
