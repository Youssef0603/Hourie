import { useState, type FormEvent } from "react";
import { apiRequest } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { admissionError, uploadAdmissionDocument } from "../api";
import type {
  AdmissionDocumentType,
  AdmissionEquipment,
  TemporaryAdmission,
} from "../types";

export function TemporaryAdmissionForm({
  equipment,
  item,
  onClose,
  onSaved,
}: {
  equipment: AdmissionEquipment[];
  item?: TemporaryAdmission;
  onClose: () => void;
  onSaved: (item: TemporaryAdmission) => void;
}) {
  const [ids, setIds] = useState<number[]>(
    item?.equipment.map((entry) => entry.id) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialDocument, setInitialDocument] = useState<File | null>(null);
  const [invoiceDocument, setInvoiceDocument] = useState<File | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    let createdId: number | null = null;
    try {
      const form = new FormData(event.currentTarget);
      const response = await apiRequest<{ data: TemporaryAdmission }>(
        item
          ? `/api/v1/temporary-admissions/${item.id}`
          : "/api/v1/temporary-admissions",
        {
          method: item ? "PATCH" : "POST",
          body: JSON.stringify({
            customs_reference: form.get("customs_reference"),
            entered_on: form.get("entered_on"),
            notes: form.get("notes") || null,
            equipment_ids: ids,
          }),
        },
      );
      let saved = response.data;
      if (!item) {
        createdId = saved.id;
        for (const [type, file] of [
          ["initial", initialDocument],
          ["invoice", invoiceDocument],
        ] as Array<[AdmissionDocumentType, File | null]>) {
          if (file?.size) {
            saved = await uploadAdmissionDocument(
              saved.id,
              type,
              file,
              type === "initial" ? saved.entered_on : null,
            );
          }
        }
      }
      onSaved(saved);
    } catch (caught) {
      if (createdId) {
        await apiRequest(`/api/v1/temporary-admissions/${createdId}`, {
          method: "DELETE",
        }).catch(() => undefined);
      }
      setError(
        admissionError(caught, "Impossible d’enregistrer cette admission."),
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
        aria-label={item ? "Modifier l’admission" : "Ajouter une admission"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header insurance-add-header">
          <div>
            <p className="section-label">Admissions temporaires</p>
            <h2>{item ? "Modifier l’admission" : "Ajouter une admission"}</h2>
            <p>
              Renseignez la référence douanière et les équipements couverts.
            </p>
          </div>
          <div>
            <button
              className="save-button"
              type="submit"
              form="temporary-admission-form"
              disabled={
                saving || !ids.length || (!item && initialDocument === null)
              }
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={onClose} aria-label="Fermer">
              <ActionIcon name="close" />
            </button>
          </div>
        </header>
        <form
          id="temporary-admission-form"
          className="insurance-add-form"
          onSubmit={submit}
        >
          {error && (
            <div className="form-alert" role="alert">
              {error}
            </div>
          )}
          <section>
            <h3>
              <ActionIcon name="identification" />
              Informations de l’admission
            </h3>
            <div className="insurance-form-grid">
              <label>
                Référence douane
                <input
                  required
                  name="customs_reference"
                  placeholder="S1445"
                  defaultValue={item?.customs_reference}
                />
              </label>
              <label>
                Date d’entrée
                <input
                  required
                  type="date"
                  name="entered_on"
                  defaultValue={item?.entered_on}
                />
              </label>
            </div>
          </section>
          <section>
            <h3>
              <ActionIcon name="specifications" />
              Équipements couverts
            </h3>
            <div className="insurance-covered-equipment">
              <SearchableSelect
                ariaLabel="Ajouter un équipement"
                value=""
                onChange={(value) =>
                  value &&
                  setIds((all) => [...new Set([...all, Number(value)])])
                }
                placeholder="Sélectionner un équipement"
                includeEmpty={false}
                options={equipment
                  .filter((entry) => !ids.includes(entry.id))
                  .map((entry) => ({
                    value: String(entry.id),
                    label: equipmentLabel(entry),
                  }))}
              />
              <ul>
                {ids.map((id) => {
                  const entry = equipment.find(
                    (candidate) => candidate.id === id,
                  );
                  return (
                    <li key={id}>
                      <span>
                        <strong>{entry?.name}</strong>
                        <small>{entry ? chassisLabel(entry) : ""}</small>
                      </span>
                      <button
                        type="button"
                        aria-label={`Retirer ${entry?.asset_code ?? "l’équipement"}`}
                        onClick={() =>
                          setIds((all) => all.filter((value) => value !== id))
                        }
                      >
                        <ActionIcon name="close" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
          {!item && (
            <section>
              <h3>
                <ActionIcon name="invoice" />
                Documents
              </h3>
              <div className="insurance-form-grid">
                <DocumentUploadDropzone
                  compact
                  title={initialDocument?.name ?? "Ajouter le document initial"}
                  description="Document initial obligatoire · PDF · 10 Mo maximum"
                  onFiles={(files) => setInitialDocument(files[0] ?? null)}
                />
                <DocumentUploadDropzone
                  compact
                  title={invoiceDocument?.name ?? "Ajouter une facture"}
                  description="Facture facultative · PDF · 10 Mo maximum"
                  onFiles={(files) => setInvoiceDocument(files[0] ?? null)}
                />
              </div>
            </section>
          )}
          <section>
            <h3>
              <ActionIcon name="note" />
              Observations
            </h3>
            <label className="insurance-form-notes">
              <textarea name="notes" defaultValue={item?.notes ?? ""} />
            </label>
          </section>
        </form>
      </aside>
    </div>
  );
}

function chassisLabel(item: AdmissionEquipment) {
  return item.chassis_number
    ? `N° de châssis : ${item.chassis_number}`
    : "N° de châssis non renseigné";
}

function equipmentLabel(item: AdmissionEquipment) {
  return `${item.name} — ${chassisLabel(item)}`;
}
