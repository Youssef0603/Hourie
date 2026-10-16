import { useState, type FormEvent } from "react";
import { apiRequest } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { SearchableMultiSelect } from "../../../shared/components/SearchableMultiSelect";
import { activeLanguage } from "../../../i18n/fr";
import { operationPhrase, operationsText } from "../../../i18n/operations";
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
  const text = operationsText().admissions;
  const [ids, setIds] = useState<number[]>(
    item?.equipment.map((entry) => entry.id) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialDocuments, setInitialDocuments] = useState<File[]>([]);
  const [invoiceDocuments, setInvoiceDocuments] = useState<File[]>([]);
  const [entryDate, setEntryDate] = useState(item?.entered_on ?? "");

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
            entered_on: entryDate || null,
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
        admissionError(caught, operationPhrase("Impossible d’enregistrer cette admission.")),
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
        aria-label={operationPhrase(item ? "Modifier l’admission" : "Ajouter une admission")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header insurance-add-header">
          <div>
            <p className="section-label">{text.title}</p>
            <h2>{operationPhrase(item ? "Modifier l’admission" : "Ajouter une admission")}</h2>
            <p>{operationPhrase("Renseignez la référence douanière et les équipements couverts.")}</p>
          </div>
          <div>
            <button
              className="save-button"
              type="submit"
              form="temporary-admission-form"
              disabled={
                saving ||
                !ids.length ||
                (initialDocuments.length > 0 && !entryDate)
              }
            >
              {operationPhrase(saving ? "Enregistrement…" : "Enregistrer")}
            </button>
            <button type="button" onClick={onClose} aria-label={operationPhrase("Fermer")}>
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
              {operationPhrase("Informations de l’admission")}
            </h3>
            <div className="insurance-form-grid">
              <label>
                {operationPhrase("Référence douane")}
                <input
                  required
                  name="customs_reference"
                  placeholder="S1445"
                  defaultValue={item?.customs_reference}
                />
              </label>
              <label>
                {operationPhrase("Date d’entrée")}
                <input
                  type="date"
                  name="entered_on"
                  value={entryDate}
                  onChange={(event) => setEntryDate(event.target.value)}
                />
              </label>
              <label>
                {operationPhrase("Fournisseur")}
                <input
                  name="supplier_name"
                  placeholder={operationPhrase("Nom du fournisseur")}
                  defaultValue={item?.supplier_name ?? ""}
                />
              </label>
            </div>
          </section>
          <section>
            <h3>
              <ActionIcon name="specifications" />
              {operationPhrase("Équipements couverts")}
            </h3>
            <div className="insurance-covered-equipment">
              <SearchableMultiSelect
                ariaLabel={operationPhrase("Ajouter un équipement")}
                values={ids.map(String)}
                onChange={(values) => setIds(values.map(Number))}
                placeholder={operationPhrase("Sélectionner un équipement")}
                selectedLabel={(count) => activeLanguage === "ar" ? `${count} معدات محددة` : `${count} équipement${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""}`}
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
                        title={operationPhrase("Retirer")}
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
                {operationPhrase("Documents")}
              </h3>
              <div className="temporary-admission-create-documents">
                <div className="temporary-admission-upload-group">
                  <DocumentUploadDropzone
                    compact
                    title={selectedFilesTitle(
                      initialDocuments,
                      "initial",
                    )}
                    description={operationPhrase("Un ou plusieurs documents de déclaration obligatoires · PDF · 10 Mo maximum par fichier")}
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
                  <DocumentUploadDropzone
                    compact
                    title={selectedFilesTitle(invoiceDocuments, "invoice")}
                    description={operationPhrase("Une ou plusieurs factures facultatives · PDF · 10 Mo maximum par fichier")}
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
              {operationPhrase("Observations")}
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
    ? `${activeLanguage === "ar" ? "رقم التسلسل" : "N° de série"} : ${item.serial_number}`
    : operationPhrase("N° de série non renseigné");
}

function equipmentLabel(item: AdmissionEquipment) {
  return `${item.name} — ${serialLabel(item)}`;
}

function selectedFilesTitle(
  files: File[],
  kind: "initial" | "invoice",
) {
  if (!files.length)
    return {
      initial: operationPhrase("Ajouter la déclaration"),
      invoice: operationPhrase("Ajouter des factures"),
    }[kind];
  if (kind === "invoice") {
    if (activeLanguage === "ar") return `${files.length} فاتورة محددة`;
    return `${files.length} facture${files.length > 1 ? "s" : ""} sélectionnée${files.length > 1 ? "s" : ""}`;
  }
  if (kind === "initial") {
    if (activeLanguage === "ar") return `${files.length} مستند تصريح محدد`;
    return `${files.length} document${files.length > 1 ? "s de déclaration" : " de déclaration"} sélectionné${files.length > 1 ? "s" : ""}`;
  }
  return operationPhrase("Ajouter des factures");
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
            <ActionIcon name="delete" />
          </button>
        </li>
      ))}
    </ul>
  );
}
