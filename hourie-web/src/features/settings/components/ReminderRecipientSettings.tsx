import { useEffect, useState } from "react";
import { fr } from "../../../i18n/fr";
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
    escalation_recipient: ReminderRecipient | null;
  };
  const [recipients, setRecipients] = useState<ReminderRecipient[]>([]);
  const [escalationRecipient, setEscalationRecipient] =
    useState<ReminderRecipient | null>(null);
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
        setEscalationRecipient(value.data.escalation_recipient);
      })
      .catch(() => setError("Impossible de charger les destinataires."));
  }, []);
  useEffect(() => {
    apiRequest<{
      data: Array<{ id: number; name: string; email: string | null }>;
    }>("/api/v1/employees?per_page=100")
      .then((value) => setPeople(value.data))
      .catch(() => undefined);
  }, []);
  async function persist(
    nextIds: number[],
    escalationEmployeeId = escalationRecipient?.employee_id ?? null,
    closeAdd = true,
  ) {
    setSaving(true);
    setError(null);
    try {
      const response = await apiRequest<{
        data: NotificationSettings;
      }>("/api/v1/notification-settings", {
        method: "PUT",
        body: JSON.stringify({
          employee_ids: nextIds,
          escalation_employee_id: escalationEmployeeId,
        }),
      });
      setRecipients(response.data.recipients);
      setEscalationRecipient(response.data.escalation_recipient);
      setEmployeeId("");
      if (closeAdd) onCloseAdd();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (Object.values(caught.errors)[0]?.[0] ?? "Personne invalide.")
          : "Impossible d’enregistrer les destinataires.",
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
            <h2>Escalade des rappels</h2>
            <p>
              Rappels 1 à 3 : liste standard. Dès le 4e : liste standard +
              manager.
            </p>
          </div>
          <label className="reminder-escalation-control">
            <span>Manager à ajouter</span>
            <SearchableSelect
              ariaLabel="Responsable d’escalade"
              value={
                escalationRecipient
                  ? String(escalationRecipient.employee_id)
                  : ""
              }
              onChange={(value) =>
                void persist(
                  recipients.map((recipient) => recipient.employee_id),
                  value ? Number(value) : null,
                  false,
                )
              }
              placeholder="Sélectionner une personne"
              options={people
                .filter((person) => person.email)
                .map((person) => ({
                  value: String(person.id),
                  label: `${person.name} — ${person.email}`,
                }))}
            />
          </label>
        </section>

        <div className="reminder-recipient-heading">
          <div>
            <h2>Destinataires standards</h2>
            <p>Ils reçoivent chaque rappel avant et après l’escalade.</p>
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
                <span className="account-status active">Actif</span>
                <button
                  type="button"
                  aria-label={`Supprimer ${recipient.name}`}
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
              title="Aucun destinataire"
              description="Ajoutez une personne pour recevoir les rappels d’assurance et de visite des véhicules."
            />
          )}
        </div>
      </div>
      {isAdding && (
        <Modal title="Ajouter un destinataire" onClose={onCloseAdd}>
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
              <span>Personne</span>
              <SearchableSelect
                ariaLabel="Personne destinataire"
                value={employeeId}
                onChange={setEmployeeId}
                placeholder="Sélectionner une personne"
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
