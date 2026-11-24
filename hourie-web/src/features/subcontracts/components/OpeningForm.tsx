import { AmountInput } from "../../../shared/components/AmountInput";
import { useState, type FormEvent } from "react";
import { apiErrorMessage } from "../../../shared/api/errors";
import { InventoryFormSection } from "../../equipment/components/AssetForm";
import { EquipmentCreationPanel } from "../../equipment/components/EquipmentCreationPanel";
import { localized, operationPhrase } from "../../../i18n/operations";
import { saveOpening } from "../api";
import { money, quantity } from "../display";
import type { OpeningPayload, Subcontract, SubcontractValuation } from "../types";

/**
 * Opening balance of a contract that started before Hourie: what the paper
 * valuations certified up to the last one, so the next situation continues
 * from it. Payments already made are recorded on it afterwards.
 */
export function OpeningForm({ subcontract, onClose, onSaved }: {
  subcontract: Subcontract;
  onClose: () => void;
  onSaved: (opening: SubcontractValuation) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<Omit<OpeningPayload, "lines">>({
    last_sequence: "",
    valuation_date: today,
    period_end: today,
    historical_works_amount: "0",
    cash_percent: String(Number(subcontract.cash_percent)),
    comment: "",
  });
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currency = subcontract.currency;

  const itemizedWorks = subcontract.items.reduce((total, item) => total + Number(quantities[item.id] || 0) * Number(item.unit_price), 0);
  const totalWorks = itemizedWorks + Number(form.historical_works_amount || 0);

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onSaved(await saveOpening(subcontract.id, {
        ...form,
        historical_works_amount: form.historical_works_amount || "0",
        cash_percent: form.cash_percent || "0",
        lines: subcontract.items.map((item) => ({ subcontract_item_id: item.id, cumulative_quantity: quantities[item.id] || "0" })),
      }));
    } catch (exception) {
      setError(apiErrorMessage(exception, operationPhrase("Impossible d’enregistrer la reprise de l’historique.")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <EquipmentCreationPanel
      eyebrow={`${subcontract.reference} · ${subcontract.subcontractor.name}`}
      title={operationPhrase("Reprise de l’historique")}
      subtitle={operationPhrase("Pour un contrat commencé avant Hourie : saisissez où en était la dernière situation papier.")}
      action={<button className="primary-button" type="submit" form="opening-form" disabled={saving}>{operationPhrase(saving ? "Enregistrement…" : "Enregistrer")}</button>}
      onClose={onClose}
    >
      <form id="opening-form" className="generator-create-form asset-form subcontract-editor" onSubmit={(event) => void submit(event)}>
        {error && <div className="form-alert" role="alert">{error}</div>}
        <div className="asset-form-layout">
          <InventoryFormSection title={operationPhrase("Dernière situation papier")} icon="identification">
            <div className="maintenance-form-grid asset-form-grid-2">
              <label><span>{operationPhrase("Numéro de la dernière situation *")}</span><input required type="number" min="1" max="999" step="1" placeholder={operationPhrase("Ex. 4")} value={form.last_sequence} onChange={(event) => update("last_sequence", event.target.value)} /></label>
              <label><span>{operationPhrase("Date de cette situation *")}</span><input required type="date" max={today} value={form.valuation_date} onChange={(event) => update("valuation_date", event.target.value)} /></label>
              <label><span>{operationPhrase("Travaux exécutés jusqu’au *")}</span><input required type="date" max={today} value={form.period_end} onChange={(event) => update("period_end", event.target.value)} /></label>
              <label><span>{operationPhrase("Part payée en espèces (%)")}</span><input required type="number" min="0" max="100" step="0.01" value={form.cash_percent} onChange={(event) => update("cash_percent", event.target.value)} /></label>
            </div>
            {form.last_sequence && <p className="sc-hint">{localized(`La prochaine situation saisie dans Hourie sera la n° ${Number(form.last_sequence) + 1}.`, `سيكون الكشف التالي في Hourie برقم ${Number(form.last_sequence) + 1}.`)}</p>}
          </InventoryFormSection>

          <InventoryFormSection title={operationPhrase("Travaux certifiés à cette date (cumul)")} icon="specifications">
            <div className="sc-table-wrap">
              <table className="sc-table">
                <thead><tr><th>{operationPhrase("Article")}</th><th className="num">{operationPhrase("Autorisé")}</th><th className="num">{operationPhrase("Cumul à ce jour")}</th><th className="num">{operationPhrase("Montant cumulé")}</th></tr></thead>
                <tbody>
                  {subcontract.items.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.description}</strong><div className="muted">{item.code ?? operationPhrase("Sans code")} · {money(item.unit_price, currency)} / {item.unit}</div></td>
                      <td className="num">{quantity(item.authorized_quantity)}</td>
                      <td><input type="number" min="0" step="0.001" aria-label={localized(`Cumul pour ${item.description}`, `الكمية التراكمية لـ ${item.description}`)} value={quantities[item.id] ?? ""} placeholder="0" onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: event.target.value }))} /></td>
                      <td className="num">{money(Number(quantities[item.id] || 0) * Number(item.unit_price), currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="maintenance-form-grid asset-form-grid-2">
              <label className="field-wide"><span>{operationPhrase("Travaux antérieurs non détaillés par article (HT)")}</span><AmountInput value={form.historical_works_amount} onChange={(amount) => update("historical_works_amount", amount)} /></label>
              <label className="field-wide"><span>{operationPhrase("Commentaire")}</span><input value={form.comment} onChange={(event) => update("comment", event.target.value)} /></label>
            </div>
            <p className="sc-hint">{operationPhrase("Si les anciennes situations ne détaillent pas tout par article, mettez le reste ici : il comptera dans le cumul de toutes les situations suivantes.")}</p>
            <div className="sc-calculation">
              <div className="total"><span />{operationPhrase("Travaux exécutés (cumul)")}<b>{money(totalWorks, currency)}</b></div>
            </div>
          </InventoryFormSection>

          <div className="notice info">{operationPhrase("Hourie calcule l’avance récupérée, la retenue et le net à payer. Après l’enregistrement, saisissez dans « Paiements » ce qui a déjà été payé en espèces, par chèque et en TVA.")}</div>
        </div>
      </form>
    </EquipmentCreationPanel>
  );
}
