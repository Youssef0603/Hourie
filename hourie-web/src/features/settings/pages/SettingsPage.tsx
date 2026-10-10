import { useEffect, useState } from "react";
import { activeLanguage, fr } from "../../../i18n/fr";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { getCatalogOptions } from "../../equipment/api";
import type { CatalogOption } from "../../equipment/types";
import { EmptyState } from "../../../shared/components/EmptyState";
import { CatalogForm } from "../components/CatalogForm";
import { ReminderRecipientSettings } from "../components/ReminderRecipientSettings";

const groups: CatalogOption["group"][] = [
  "equipment_condition",
  "operational_situation",
  "maintenance_type",
  "fuel_type",
  "project_status",
  "employee_job_title",
];
type SettingsSection = CatalogOption["group"] | "reminder_recipients";

export function SettingsPage({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<CatalogOption[]>([]);
  const [group, setGroup] = useState<SettingsSection>("equipment_condition");
  const [isAddingRecipient, setIsAddingRecipient] = useState(false);
  const [editing, setEditing] = useState<CatalogOption | null | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isArabic = activeLanguage === "ar";
  const activeItems = items.filter(
    (item) => item.group === group && item.is_active,
  );

  async function refresh() {
    setError(null);
    try {
      setItems(await getCatalogOptions());
    } catch {
      setError(fr.catalogs.loadError);
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => {
    let cancelled = false;
    getCatalogOptions()
      .then((options) => {
        if (!cancelled) setItems(options);
      })
      .catch(() => {
        if (!cancelled) setError(fr.catalogs.loadError);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="directory-page catalog-page">
      <div className="directory-heading">
        <div>
          <p className="section-label">{fr.catalogs.section}</p>
          <h1>{fr.catalogs.title}</h1>
          <p>{fr.catalogs.subtitle}</p>
        </div>
        <button
          className="primary-button compact-action"
          type="button"
          onClick={() =>
            group === "reminder_recipients"
              ? setIsAddingRecipient(true)
              : setEditing(null)
          }
        >
          <ActionIcon name="add" />
          {group === "reminder_recipients"
            ? "Ajouter un e-mail"
            : fr.catalogs.add}
        </button>
      </div>
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      <div className="catalog-tabs">
        {groups.map((value) => (
          <button
            className={group === value ? "active" : ""}
            type="button"
            key={value}
            onClick={() => setGroup(value)}
          >
            {fr.catalogs.groups[value]}
          </button>
        ))}
        <button
          className={group === "reminder_recipients" ? "active" : ""}
          type="button"
          onClick={() => setGroup("reminder_recipients")}
        >
          E-mails de rappel
        </button>
      </div>
      {group === "reminder_recipients" ? (
        <ReminderRecipientSettings
          isAdding={isAddingRecipient}
          onCloseAdd={() => setIsAddingRecipient(false)}
        />
      ) : isLoading ? (
        <LoadingSpinner label={fr.common.loading} />
      ) : (
        <div className="catalog-list">
          {activeItems.length ? (
            activeItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setEditing(item)}
              >
                <span
                  className="catalog-color"
                  style={{ background: item.color ?? "#9aa1aa" }}
                />
                <span className="catalog-copy">
                  <strong>
                    {isArabic ? item.label_ar || item.label_fr : item.label_fr}
                  </strong>
                  <small>
                    <bdi>{isArabic ? item.label_fr : item.label_ar || "—"}</bdi>
                    <span aria-hidden="true"> · </span>
                    <bdi>{item.code}</bdi>
                  </small>
                </span>
                <span
                  className={`account-status ${item.is_active ? "active" : "inactive"}`}
                >
                  {item.is_active ? fr.directory.active : fr.directory.inactive}
                </span>
                <ActionIcon name="edit" />
              </button>
            ))
          ) : (
            <EmptyState
              title="Aucune valeur configurée"
              description="Ajoutez une valeur pour la rendre disponible dans les formulaires."
            />
          )}
        </div>
      )}
      {editing !== undefined && group !== "reminder_recipients" && (
        <CatalogForm
          initial={editing}
          group={group}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void refresh();
            onChanged();
          }}
        />
      )}
    </main>
  );
}
