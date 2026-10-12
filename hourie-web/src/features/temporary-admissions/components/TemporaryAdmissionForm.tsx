import { useState, type FormEvent } from "react";
import { apiRequest } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { SearchableMultiSelect } from "../../../shared/components/SearchableMultiSelect";
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
  const [initialDocuments, setInitialDocuments] = useState<File[]>([]);
  const [atDocuments, setAtDocuments] = useState<File[]>([]);
  const [invoiceDocuments, setInvoiceDocuments] = useState<File[]>([]);

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
            supplier_name: form.get("supplier_name") || null,
            entered_on: form.get("entered_on"),
            validity_months: Number(form.get("validity_months")),
            notes: form.get("notes") || null,
            equipment_ids: ids,
          }),
        },
      );
      let saved = response.data;
      if (!item) {
        createdId = saved.id;
        for (const [type, files, documentDate, validityMonths] of [
          ["initial", initialDocuments, saved.entered_on, null],
          [
            "admission",
            atDocuments,
            String(form.get("at_document_date")),
            Number(form.get("validity_months")),
          ],
          ["invoice", invoiceDocuments, null, null],
        ] as Array<
          [AdmissionDocumentType, File[], string | null, number | null]
        >) {
          for (const file of files) {
            saved = await uploadAdmissionDocument(
              saved.id,
              type,
              file,
              documentDate,
              validityMonths,
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
                saving ||
                !ids.length ||
                (!item && (!initialDocuments.length || !atDocuments.length))
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
          {item && (
            <input
              type="hidden"
              name="validity_months"
              value={item.validity_months}
            />
          )}
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
              <label>
                Fournisseur
                <input
                  name="supplier_name"
                  placeholder="Nom du fournisseur"
                  defaultValue={item?.supplier_name ?? ""}
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
              <SearchableMultiSelect
                ariaLabel="Ajouter un équipement"
                values={ids.map(String)}
                onChange={(values) => setIds(values.map(Number))}
                placeholder="Sélectionner un équipement"
                selectedLabel={(count) => `${count} équipement${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""}`}
                options={equipment
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
                        <small>{entry ? serialLabel(entry) : ""}</small>
                      </span>
                      <button
                        className="insurance-covered-remove"
                        type="button"
                        aria-label={`Retirer ${entry?.asset_code ?? "l’équipement"}`}
                        title="Retirer"
                        onClick={() =>
                          setIds((all) => all.filter((value) => value !== id))
                        }
                      >
                        <ActionIcon name="delete" />
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
              <div className="temporary-admission-create-documents">
                <div className="temporary-admission-upload-group">
                  <DocumentUploadDropzone
                    compact
                    title={selectedFilesTitle(
                      initialDocuments,
                      "initial",
                    )}
                    description="Un ou plusieurs documents initiaux obligatoires · PDF · 10 Mo maximum par fichier"
                    onFiles={(files) =>
                      setInitialDocuments((current) => [
                        ...current,
                        ...files,
                      ])
                    }
                  />
                  <SelectedFiles
                    files={initialDocuments}
                    onRemove={(index) =>
                      setInitialDocuments((current) =>
                        current.filter((_, candidate) => candidate !== index),
                      )
                    }
                  />
                </div>
                <div className="temporary-admission-upload-group">
                  <div className="temporary-admission-at-fields">
                    <label>
                      Date de l’AT
                      <input
                        type="date"
                        name="at_document_date"
                        required
                      />
                    </label>
                    <label>
                      Durée de validité (mois)
                      <input
                        required
                        type="number"
                        name="validity_months"
                        min={1}
                        max={120}
                        step={1}
                        defaultValue={12}
                        placeholder="Ex. 3, 6 ou 12"
                      />
                    </label>
                  </div>
                  <DocumentUploadDropzone
                    compact
                    title={selectedFilesTitle(atDocuments, "at")}
                    description="Un ou plusieurs documents AT obligatoires · PDF · 10 Mo maximum par fichier"
                    onFiles={(files) =>
                      setAtDocuments((current) => [...current, ...files])
                    }
                  />
                  <SelectedFiles
                    files={atDocuments}
                    onRemove={(index) =>
                      setAtDocuments((current) =>
                        current.filter((_, candidate) => candidate !== index),
                      )
                    }
                  />
                </div>
                <div className="temporary-admission-upload-group">
                  <DocumentUploadDropzone
                    compact
                    title={selectedFilesTitle(invoiceDocuments, "invoice")}
                    description="Une ou plusieurs factures facultatives · PDF · 10 Mo maximum par fichier"
                    onFiles={(files) =>
                      setInvoiceDocuments((current) => [...current, ...files])
                    }
                  />
                  <SelectedFiles
                    files={invoiceDocuments}
                    onRemove={(index) =>
                      setInvoiceDocuments((current) =>
                        current.filter((_, candidate) => candidate !== index),
                      )
                    }
                  />
                </div>
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

function serialLabel(item: AdmissionEquipment) {
  return item.serial_number
    ? `N° de série : ${item.serial_number}`
    : "N° de série non renseigné";
}

function equipmentLabel(item: AdmissionEquipment) {
  return `${item.name} — ${serialLabel(item)}`;
}

function selectedFilesTitle(
  files: File[],
  kind: "initial" | "at" | "invoice",
) {
  if (!files.length)
    return {
      initial: "Ajouter des documents initiaux",
      at: "Ajouter des documents AT",
      invoice: "Ajouter des factures",
    }[kind];
  if (kind === "invoice") {
    return `${files.length} facture${files.length > 1 ? "s" : ""} sélectionnée${files.length > 1 ? "s" : ""}`;
  }
  if (kind === "initial") {
    return `${files.length} document${files.length > 1 ? "s initiaux" : " initial"} sélectionné${files.length > 1 ? "s" : ""}`;
  }
  return `${files.length} document${files.length > 1 ? "s" : ""} AT sélectionné${files.length > 1 ? "s" : ""}`;
}

function SelectedFiles({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (index: number) => void;
}) {
  if (!files.length) return null;

  return (
    <ul className="temporary-admission-selected-files">
      {files.map((file, index) => (
        <li key={`${file.name}-${file.lastModified}-${index}`}>
          <span>{file.name}</span>
          <button
            type="button"
            aria-label={`Retirer ${file.name}`}
            onClick={() => onRemove(index)}
          >
            <ActionIcon name="close" />
          </button>
        </li>
      ))}
    </ul>
  );
}
