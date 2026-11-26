import { useEffect, useState } from "react";
import { fr } from "../../../i18n/fr";
import { localized, operationPhrase as t } from "../../../i18n/operations";
import { ApiError, apiRequest } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Modal } from "../../../shared/components/Modal";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";

export function ReminderRecipientSettings({
  isAdding,
  onCloseAdd,
}: {
  isAdding: boolean;
  onCloseAdd: () => void;
}) {
  type ReminderRecipient = { employee_id: number; name: string; email: string };
  type NotificationSettings = {
    recipients: ReminderRecipient[];
  };
  const [recipients, setRecipients] = useState<ReminderRecipient[]>([]);
  const [people, setPeople] = useState<
    Array<{ id: number; name: string; email: string | null }>
  >([]);
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    apiRequest<{ data: NotificationSettings }>(
      "/api/v1/notification-settings",
    )
      .then((value) => {
        setRecipients(value.data.recipients);
      })
      .catch(() => setError(t("Impossible de charger les destinataires.")));
  }, []);
  useEffect(() => {
    apiRequest<{
      data: Array<{ id: number; name: string; email: string | null }>;
    }>("/api/v1/employees?per_page=100")
      .then((value) => setPeople(value.data))
      .catch(() => undefined);
  }, []);
  async function persist(nextIds: number[], closeAdd = true) {
    setSaving(true);
    setError(null);
    try {
      const response = await apiRequest<{
        data: NotificationSettings;
      }>("/api/v1/notification-settings", {
        method: "PUT",
        body: JSON.stringify({ employee_ids: nextIds }),
      });
      setRecipients(response.data.recipients);
      setEmployeeId("");
      if (closeAdd) onCloseAdd();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (Object.values(caught.errors)[0]?.[0] ?? t("Personne invalide."))
          : t("Impossible d’enregistrer les destinataires."),
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      {error && <div className="form-alert">{error}</div>}
      <div className="reminder-settings-layout">
        <section className="reminder-escalation-setting">
          <span className="reminder-escalation-icon">
            <ActionIcon name="people" />
          </span>
          <div className="reminder-escalation-copy">
            <h2>{t("Escalade des rappels")}</h2>
            <p>
              {t("Rappels 1 à 3 : liste standard. Dès le 4e : liste standard + directeur général, automatiquement.")}
            </p>
          </div>
        </section>

        <div className="reminder-recipient-heading">
          <div>
            <h2>{t("Destinataires standards")}</h2>
            <p>{t("Ils reçoivent chaque rappel avant et après l’escalade.")}</p>
          </div>
          <span>{recipients.length}</span>
        </div>

        <div className="catalog-list reminder-recipient-list">
          {recipients.length ? (
            recipients.map((recipient) => (
              <article key={recipient.employee_id}>
                <span className="catalog-color reminder-email-dot" />
                <span className="catalog-copy">
                  <strong>{recipient.name}</strong>
                  <small>{recipient.email}</small>
                </span>
                <span className="account-status active">{localized("Actif", "نشط")}</span>
                <button
                  type="button"
                  aria-label={localized(`Supprimer ${recipient.name}`, `حذف ${recipient.name}`)}
                  onClick={() =>
                    void persist(
                      recipients
                        .filter(
                          (value) =>
                            value.employee_id !== recipient.employee_id,
                        )
                        .map((value) => value.employee_id),
                    )
                  }
                >
                  <ActionIcon name="delete" />
                </button>
              </article>
            ))
          ) : (
            <EmptyState
              icon="people"
              title={t("Aucun destinataire")}
              description={t("Ajoutez une personne pour recevoir les rappels d’assurance et de visite des véhicules.")}
            />
          )}
        </div>
      </div>
      {isAdding && (
        <Modal title={t("Ajouter un destinataire")} onClose={onCloseAdd}>
          <form
            className="catalog-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (employeeId)
                void persist([
                  ...recipients.map((recipient) => recipient.employee_id),
                  Number(employeeId),
                ]);
            }}
          >
            <label className="field-wide">
              <span>{t("Personne")}</span>
              <SearchableSelect
                ariaLabel={t("Personne destinataire")}
                value={employeeId}
                onChange={setEmployeeId}
                placeholder={t("Sélectionner une personne")}
                includeEmpty={false}
                options={people
                  .filter(
                    (person) =>
                      person.email &&
                      !recipients.some(
                        (recipient) => recipient.employee_id === person.id,
                      ),
                  )
                  .map((person) => ({
                    value: String(person.id),
                    label: `${person.name} — ${person.email}`,
                  }))}
              />
            </label>
            <div className="maintenance-form-actions">
              <button
                className="primary-button save-button"
                disabled={saving || !employeeId}
                type="submit"
              >
                {saving ? fr.common.saving : fr.common.save}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
