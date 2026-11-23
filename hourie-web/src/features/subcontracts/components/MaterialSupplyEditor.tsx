import { ActionIcon } from "../../../shared/components/ActionIcon";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { localized, operationPhrase } from "../../../i18n/operations";
import { emptyMaterial } from "../display";
import type { MaterialInput, MaterialsSuppliedBy } from "../types";

export type MaterialSupply = { materials_supplied_by: MaterialsSuppliedBy; materials: MaterialInput[] };

/**
 * Who buys the materials of one work item and, when ARH does, how much of each
 * material one unit of work consumes. Used by the contract and the avenant forms.
 */
export function MaterialSupplyEditor({ title, unit, lineNumber, supply, onChange }: {
  title: string;
  /** Unit of the work item, e.g. "m³". */
  unit: string;
  lineNumber: number;
  supply: MaterialSupply;
  onChange: (supply: MaterialSupply) => void;
}) {
  const line = lineNumber;

  function updateMaterial(key: string, patch: Partial<MaterialInput>) {
    onChange({ ...supply, materials: supply.materials.map((material) => material.key === key ? { ...material, ...patch } : material) });
  }

  return (
    <div className="sc-material-line">
      <div className="sc-material-line-header">
        <strong>{title}</strong>
        <SearchableSelect
          ariaLabel={localized(`Matériaux fournis par, ligne ${line}`, `جهة توفير المواد، البند ${line}`)}
          value={supply.materials_supplied_by}
          searchable={false}
          includeEmpty={false}
          placeholder={operationPhrase("Fournis par le sous-traitant (inclus dans son prix)")}
          options={[
            { value: "subcontractor", label: operationPhrase("Fournis par le sous-traitant (inclus dans son prix)") },
            { value: "arh", label: operationPhrase("Fournis par ARH (main-d’œuvre seule)") },
          ]}
          onChange={(value) => {
            const suppliedBy = (value || "subcontractor") as MaterialsSuppliedBy;
            onChange({
              materials_supplied_by: suppliedBy,
              materials: suppliedBy === "arh" && supply.materials.length === 0 ? [emptyMaterial()] : supply.materials,
            });
          }}
        />
      </div>
      {supply.materials_supplied_by === "arh" && (
        <>
          <div className="sc-table-wrap">
            <table className="sc-table">
              <thead><tr><th>{operationPhrase("Matériau *")}</th><th>{operationPhrase("Unité *")}</th><th className="num">{localized(`Qté par ${unit || "unité"} *`, `الكمية لكل ${unit || "وحدة"} *`)}</th><th className="num">{operationPhrase("Perte %")}</th><th /></tr></thead>
              <tbody>
                {supply.materials.map((material, index) => (
                  <tr key={material.key}>
                    <td><input className="text" required aria-label={localized(`Matériau ${index + 1}, ligne ${line}`, `المادة ${index + 1}، البند ${line}`)} placeholder={operationPhrase("Ex. Fer HA, Ciment")} value={material.name} onChange={(event) => updateMaterial(material.key, { name: event.target.value })} /></td>
                    <td><input className="text unit" required aria-label={localized(`Unité du matériau ${index + 1}, ligne ${line}`, `وحدة المادة ${index + 1}، البند ${line}`)} placeholder={operationPhrase("kg, sac, m³")} value={material.unit} onChange={(event) => updateMaterial(material.key, { unit: event.target.value })} /></td>
                    <td><input required type="number" min="0.0001" step="0.0001" aria-label={localized(`Quantité par unité du matériau ${index + 1}, ligne ${line}`, `الكمية لكل وحدة للمادة ${index + 1}، البند ${line}`)} value={material.quantity_per_unit} onChange={(event) => updateMaterial(material.key, { quantity_per_unit: event.target.value })} /></td>
                    <td><input required type="number" min="0" max="100" step="0.1" aria-label={localized(`Perte du matériau ${index + 1}, ligne ${line}`, `نسبة هدر المادة ${index + 1}، البند ${line}`)} value={material.waste_percent} onChange={(event) => updateMaterial(material.key, { waste_percent: event.target.value })} /></td>
                    <td><button className="remove-line" type="button" aria-label={localized(`Retirer le matériau ${index + 1}, ligne ${line}`, `إزالة المادة ${index + 1}، البند ${line}`)} onClick={() => onChange({ ...supply, materials: supply.materials.filter((candidate) => candidate.key !== material.key) })}><ActionIcon name="delete" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sc-actions"><button className="secondary-button" type="button" onClick={() => onChange({ ...supply, materials: [...supply.materials, emptyMaterial()] })}><ActionIcon name="add" /> {operationPhrase("Ajouter un matériau")}</button></div>
        </>
      )}
    </div>
  );
}
