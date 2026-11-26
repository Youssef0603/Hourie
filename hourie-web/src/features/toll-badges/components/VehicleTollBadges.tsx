import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { AmountInput } from "../../../shared/components/AmountInput";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { apiErrorMessage } from "../../../shared/api/errors";
import { formatDate, formatMoney } from "../../../shared/format";
import { fr } from "../../../i18n/fr";
import { localized, operationPhrase } from "../../../i18n/operations";
import { deleteTollBadge, getTollBadges, saveTollBadge } from "../api";
import type { TollBadge, TollBadgeOperator, TollBadgePayload, TollBadgeStatus } from "../types";
import "./vehicle-toll-badges.css";

const operatorLabels: Record<TollBadgeOperator, string> = { hkb: "Pont HKB (BIP PASS)", fer: "FER (autoroutes)", other: "Autre" };
const statusLabels: Record<TollBadgeStatus, string> = { active: "En service", inactive: "Hors service", lost: "Perdu" };

function emptyBadge(): TollBadgePayload {
  return { operator: "hkb", badge_number: "", serial_number: "", subscription_number: "", registered_phone: "", status: "active", balance: "", balance_checked_on: "", notes: "" };
}

function payloadFrom(badge: TollBadge): TollBadgePayload {
  return {
    operator: badge.operator,
    badge_number: badge.badge_number,
    serial_number: badge.serial_number ?? "",
    subscription_number: badge.subscription_number ?? "",
    registered_phone: badge.registered_phone ?? "",
    status: badge.status,
    balance: badge.balance === null ? "" : String(Number(badge.balance)),
    balance_checked_on: badge.balance_checked_on ?? "",
    notes: badge.notes ?? "",
  };
}

/**
 * Toll badges (Pont HKB, FER…) stuck on a car or truck, with the
 * subscription and phone number they are registered under and the last
 * balance read on the operator's site.
 */
export function VehicleTollBadges({ equipmentId, canManage }: { equipmentId: number; canManage: boolean }) {
  const [badges, setBadges] = useState<TollBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<TollBadgePayload | null>(null);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBadges((await getTollBadges(equipmentId)).data);
  }, [equipmentId]);

  useEffect(() => {
    let active = true;
    getTollBadges(equipmentId)
      .then((response) => { if (active) setBadges(response.data); })
      .catch(() => { if (active) setError(operationPhrase("Impossible de charger les badges.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [equipmentId]);

  function open(badge?: TollBadge) {
    setError(null);
    setEditingId(badge?.id);
    setForm(badge ? payloadFrom(badge) : emptyBadge());
  }

  function close() {
    setForm(null);
    setEditingId(undefined);
  }

  function update<K extends keyof TollBadgePayload>(field: K, value: TollBadgePayload[K]) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      await saveTollBadge(equipmentId, form, editingId);
      close();
      await load();
    } catch (exception) {
      setError(apiErrorMessage(exception, operationPhrase("Impossible d’enregistrer le badge.")));
    } finally {
      setSaving(false);
    }
  }

  async function remove(badge: TollBadge) {
    if (!window.confirm(localized(`Supprimer le badge ${badge.badge_number} ?`, `حذف الشارة ${badge.badge_number}؟`))) return;
    setError(null);
    try {
      await deleteTollBadge(equipmentId, badge.id);
      await load();
    } catch {
      setError(operationPhrase("Impossible de supprimer le badge."));
    }
  }

  return (
    <section className="maintenance-section vehicle-toll-badges">
      <div className="maintenance-section-toolbar">
        <span>{localized(`${badges.length} badge${badges.length > 1 ? "s" : ""}`, `${badges.length} شارة`)}</span>
        {canManage && !form && <button className="maintenance-add" type="button" onClick={() => open()}><ActionIcon name="add" /><span>{operationPhrase("Ajouter un badge")}</span></button>}
      </div>

      {error && <div className="form-alert" role="alert">{error}</div>}

      {form && (
        <form className="maintenance-form maintenance-inline-form" onSubmit={(event) => void submit(event)}>
          <div className="maintenance-form-heading"><strong>{editingId ? operationPhrase("Modifier le badge") : operationPhrase("Nouveau badge")}</strong><button type="button" onClick={close} aria-label={fr.common.close}><ActionIcon name="close" /></button></div>
          <div className="maintenance-form-grid">
            <label><span>{operationPhrase("Opérateur")} <em>*</em></span><SearchableSelect ariaLabel={operationPhrase("Opérateur")} required searchable={false} includeEmpty={false} placeholder={operationPhrase("Opérateur")} value={form.operator} onChange={(value) => update("operator", (value || "hkb") as TollBadgeOperator)} options={(Object.keys(operatorLabels) as TollBadgeOperator[]).map((value) => ({ value, label: operationPhrase(operatorLabels[value]) }))} /></label>
            <label><span>{operationPhrase("Statut")} <em>*</em></span><SearchableSelect ariaLabel={operationPhrase("Statut")} required searchable={false} includeEmpty={false} placeholder={operationPhrase("Statut")} value={form.status} onChange={(value) => update("status", (value || "active") as TollBadgeStatus)} options={(Object.keys(statusLabels) as TollBadgeStatus[]).map((value) => ({ value, label: operationPhrase(statusLabels[value]) }))} /></label>
            <label className="field-wide"><span>{operationPhrase("Numéro du badge")} <em>*</em></span><input required inputMode="numeric" placeholder={operationPhrase("Numéro sous le code-barres")} value={form.badge_number} onChange={(event) => update("badge_number", event.target.value)} /></label>
            <label><span>{operationPhrase("NS (numéro de série)")}</span><input placeholder="50 - 0000000000" value={form.serial_number} onChange={(event) => update("serial_number", event.target.value)} /></label>
            <label><span>{operationPhrase("Numéro d’abonnement")}</span><input inputMode="numeric" value={form.subscription_number} onChange={(event) => update("subscription_number", event.target.value)} /></label>
            <label><span>{operationPhrase("Téléphone enregistré")}</span><input type="tel" placeholder={operationPhrase("Numéro donné à la souscription")} value={form.registered_phone} onChange={(event) => update("registered_phone", event.target.value)} /></label>
            <label><span>{operationPhrase("Solde (F CFA)")}</span><AmountInput placeholder={operationPhrase("Non vérifié")} value={form.balance} onChange={(amount) => update("balance", amount)} /></label>
            <label><span>{operationPhrase("Solde vérifié le")}</span><input type="date" max={new Date().toISOString().slice(0, 10)} value={form.balance_checked_on} onChange={(event) => update("balance_checked_on", event.target.value)} /></label>
            <label className="field-wide"><span>{operationPhrase("Remarques")}</span><input value={form.notes} onChange={(event) => update("notes", event.target.value)} /></label>
          </div>
          <div className="maintenance-form-actions">
            <button className="primary-button save-button" type="submit" disabled={saving}>{saving ? <LoadingSpinner compact label={fr.common.saving} /> : fr.common.save}</button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingSpinner compact label={operationPhrase("Chargement des badges…")} />
      ) : badges.length === 0 && !form ? (
        <p className="vtb-empty">{operationPhrase("Aucun badge de péage sur ce véhicule.")}</p>
      ) : (
        <div className="vtb-list">
          {badges.map((badge) => (
            <article key={badge.id} className="vtb-card">
              <div className="vtb-main">
                <strong>{badge.badge_number}</strong>
                <span>{operationPhrase(operatorLabels[badge.operator])}{badge.serial_number ? ` · NS ${badge.serial_number}` : ""}</span>
                {(badge.subscription_number || badge.registered_phone) && (
                  <span>{[badge.subscription_number && localized(`Abonnement ${badge.subscription_number}`, `الاشتراك ${badge.subscription_number}`), badge.registered_phone && localized(`Tél. ${badge.registered_phone}`, `الهاتف ${badge.registered_phone}`)].filter(Boolean).join(" · ")}</span>
                )}
                {badge.notes && <span className="vtb-notes">{badge.notes}</span>}
              </div>
              <div className="vtb-side">
                <span className={`vtb-status vtb-status-${badge.status}`}>{operationPhrase(statusLabels[badge.status])}</span>
                <strong>{badge.balance === null ? operationPhrase("Solde non vérifié") : formatMoney(Number(badge.balance), "XOF")}</strong>
                {badge.balance_checked_on && <span>{localized(`au ${formatDate(badge.balance_checked_on, { style: "medium" })}`, `بتاريخ ${formatDate(badge.balance_checked_on, { style: "medium" })}`)}</span>}
              </div>
              {canManage && (
                <div className="maintenance-actions vtb-actions">
                  <button type="button" onClick={() => open(badge)}><ActionIcon name="edit" />{fr.common.edit}</button>
                  <button type="button" onClick={() => void remove(badge)}><ActionIcon name="delete" />{fr.common.delete}</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
