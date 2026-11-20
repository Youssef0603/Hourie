import { useEffect, useState, type FormEvent } from "react";
import { apiErrorMessage } from "../../../shared/api/errors";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { InventoryFormSection } from "../../equipment/components/AssetForm";
import { EquipmentCreationPanel } from "../../equipment/components/EquipmentCreationPanel";
import { createVariation, getNextItemCode } from "../api";
import { money, newKey, previewCodes, quantity } from "../display";
import type { Subcontract } from "../types";

type NewItem = { key: string; description: string; unit: string; quantity: string; unit_price: string };

/**
 * An avenant either raises the authorised quantity of existing work items
 * (e.g. +44 t of steel) or adds new priced items to the contract.
 */
export function VariationForm({ subcontract, onClose, onSaved }: {
  subcontract: Subcontract;
  onClose: () => void;
  onSaved: (subcontract: Subcontract) => void;
}) {
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [approvedOn, setApprovedOn] = useState(new Date().toISOString().slice(0, 10));
  const [additions, setAdditions] = useState<Record<number, string>>({});
  const [newItems, setNewItems] = useState<NewItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [nextCode, setNextCode] = useState<{ site_code: string; next_sequence: number } | null>(null);

  useEffect(() => {
    getNextItemCode(subcontract.project.id).then(setNextCode).catch(() => setNextCode(null));
  }, [subcontract.project.id]);

  const newItemCodes = previewCodes(newItems.map(() => ({})), nextCode);
  const [error, setError] = useState<string | null>(null);

  const amount = subcontract.items.reduce((sum, item) => sum + Number(additions[item.id] || 0) * Number(item.unit_price), 0)
    + newItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);

  function updateNewItem(key: string, field: keyof NewItem, value: string) {
    setNewItems((current) => current.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const lines = Object.entries(additions)
      .filter(([, value]) => Number(value) > 0)
      .map(([itemId, value]) => ({ subcontract_item_id: Number(itemId), quantity: value }));
    if (!lines.length && !newItems.length) {
      setError("Ajoutez une quantité à au moins un article ou un nouvel article.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onSaved(await createVariation(subcontract.id, {
        title, reason, approved_on: approvedOn, lines,
        new_items: newItems.map(({ key: _key, ...item }) => item),
      }));
    } catch (exception) {
      setError(apiErrorMessage(exception, "Impossible d’enregistrer l’avenant."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <EquipmentCreationPanel
      eyebrow={subcontract.reference}
      title="Nouvel avenant"
      action={<button className="primary-button" type="submit" form="variation-form" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>}
      onClose={onClose}
    >
      <form id="variation-form" className="generator-create-form asset-form subcontract-editor" onSubmit={submit}>
        {error && <div className="form-alert" role="alert">{error}</div>}
        <div className="asset-form-layout">
          <InventoryFormSection title="Avenant" icon="identification">
            <div className="maintenance-form-grid asset-form-grid-2">
              <label className="field-wide"><span>Objet</span><input required value={title} placeholder="Ex. Dalle supplémentaire niveau 3" onChange={(event) => setTitle(event.target.value)} /></label>
              <label><span>Date d’approbation</span><input required type="date" value={approvedOn} onChange={(event) => setApprovedOn(event.target.value)} /></label>
              <label className="field-wide"><span>Motif</span><input value={reason} placeholder="Demande du client, erreur de métré…" onChange={(event) => setReason(event.target.value)} /></label>
            </div>
          </InventoryFormSection>

          <InventoryFormSection title="Quantités supplémentaires" icon="specifications">
            <div className="sc-table-wrap">
              <table className="sc-table">
                <thead><tr><th>Article</th><th className="num">Autorisé</th><th className="num">À ajouter</th><th className="num">Nouveau total</th></tr></thead>
                <tbody>
                  {subcontract.items.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.description}</strong><div className="muted">{item.code ?? "Sans code"} · {money(item.unit_price, subcontract.currency)} / {item.unit}</div></td>
                      <td className="num">{quantity(item.authorized_quantity)} {item.unit}</td>
                      <td><input type="number" min="0" step="0.001" aria-label={`Quantité à ajouter pour ${item.description}`} value={additions[item.id] ?? ""} onChange={(event) => setAdditions((current) => ({ ...current, [item.id]: event.target.value }))} /></td>
                      <td className="num">{quantity(Number(item.authorized_quantity) + Number(additions[item.id] || 0))} {item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InventoryFormSection>

          <InventoryFormSection title="Nouveaux articles" icon="invoice">
            {newItems.length > 0 && (
              <div className="sc-table-wrap">
                <table className="sc-table">
                  <thead><tr><th>Code</th><th>Désignation *</th><th>Unité *</th><th className="num">Quantité *</th><th className="num">Prix unitaire *</th><th /></tr></thead>
                  <tbody>
                    {newItems.map((item, index) => (
                      <tr key={item.key}>
                        <td className="sc-code">{newItemCodes[index]}</td>
                        <td><input className="text" required aria-label={`Désignation nouvel article ${index + 1}`} value={item.description} onChange={(event) => updateNewItem(item.key, "description", event.target.value)} /></td>
                        <td><input className="text unit" required aria-label={`Unité nouvel article ${index + 1}`} value={item.unit} onChange={(event) => updateNewItem(item.key, "unit", event.target.value)} /></td>
                        <td><input required type="number" min="0.001" step="0.001" aria-label={`Quantité nouvel article ${index + 1}`} value={item.quantity} onChange={(event) => updateNewItem(item.key, "quantity", event.target.value)} /></td>
                        <td><input required type="number" min="0" step="0.01" aria-label={`Prix nouvel article ${index + 1}`} value={item.unit_price} onChange={(event) => updateNewItem(item.key, "unit_price", event.target.value)} /></td>
                        <td><button className="remove-line" type="button" aria-label={`Retirer le nouvel article ${index + 1}`} onClick={() => setNewItems((current) => current.filter((candidate) => candidate.key !== item.key))}><ActionIcon name="delete" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="sc-actions"><button className="secondary-button" type="button" onClick={() => setNewItems((current) => [...current, { key: newKey(), description: "", unit: "", quantity: "", unit_price: "" }])}><ActionIcon name="add" /> Ajouter un article</button></div>
            <div className="notice info">Montant de l’avenant : <strong>{money(amount, subcontract.currency)}</strong></div>
          </InventoryFormSection>
        </div>
      </form>
    </EquipmentCreationPanel>
  );
}
