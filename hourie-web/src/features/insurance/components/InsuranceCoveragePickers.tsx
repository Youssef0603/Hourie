import { useState } from "react";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { formatInsuranceDate } from "../policyDisplay";
import type { InsuranceEquipmentOption } from "../types";

export function EquipmentCoveragePicker({
  options,
  selectedIds,
  onChange,
}: {
  options: InsuranceEquipmentOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 5;
  const selected = options.filter((option) => selectedIds.includes(option.id));
  const available = options.filter(
    (option) => !selectedIds.includes(option.id),
  );
  const pageCount = Math.max(1, Math.ceil(selected.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleSelected = selected.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const add = (id: number) => {
    onChange([...selectedIds, id]);
    setPage(Math.floor(selected.length / pageSize));
  };
  const remove = (id: number) =>
    onChange(selectedIds.filter((selectedId) => selectedId !== id));

  return (
    <section className="insurance-covered-equipment">
      <h3>
        <ActionIcon name="specifications" />
        Équipements couverts
      </h3>
      <p>
        Sélectionnez uniquement les véhicules, camions et engins dont le numéro
        de châssis est renseigné.
      </p>
      <label>
        Ajouter un équipement
        <SearchableSelect
          ariaLabel="Ajouter un équipement couvert"
          value=""
          onChange={(value) => {
            if (value) add(Number(value));
          }}
          placeholder={
            options.length
              ? "Sélectionner un équipement"
              : "Aucun châssis renseigné"
          }
          options={available.map((option) => ({
            value: String(option.id),
            label: equipmentOptionLabel(option),
          }))}
          disabled={available.length === 0}
        />
      </label>
      {selected.length > 0 ? (
        <>
          <div className="insurance-covered-equipment-count">
            {selected.length} équipement{selected.length > 1 ? "s" : ""}{" "}
            sélectionné{selected.length > 1 ? "s" : ""}
          </div>
          <ul>
            {visibleSelected.map((option) => (
              <li key={option.id}>
                <span>
                  <strong>{option.name}</strong>
                  <small>
                    {option.category_name ?? "Actif"} · {option.asset_code} ·
                    Châssis {option.chassis_number}
                  </small>
                </span>
                <button
                  className="insurance-covered-remove"
                  type="button"
                  aria-label={`Retirer ${option.name}`}
                  title="Retirer"
                  onClick={() => remove(option.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {pageCount > 1 && (
            <nav
              className="insurance-covered-equipment-pagination"
              aria-label="Équipements sélectionnés"
            >
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage((current) => current - 1)}
              >
                Précédent
              </button>
              <span>
                {currentPage + 1} / {pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage === pageCount - 1}
                onClick={() => setPage((current) => current + 1)}
              >
                Suivant
              </button>
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          compact
          icon="specifications"
          title="Aucun équipement sélectionné"
          description="Choisissez les actifs couverts à l’aide du champ ci-dessus."
        />
      )}
    </section>
  );
}

export function EmployeeCoveragePicker({
  options,
  selectedIds,
  onChange,
}: {
  options: Array<{ id: number; name: string; birth_date: string | null }>;
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 3;
  const selected = options.filter((option) => selectedIds.includes(option.id));
  const available = options.filter(
    (option) => !selectedIds.includes(option.id),
  );
  const pageCount = Math.max(1, Math.ceil(selected.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleSelected = selected.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  return (
    <section className="insurance-covered-equipment">
      <h3>
        <ActionIcon name="identification" />
        Personnes couvertes
      </h3>
      <p>Sélectionnez les employés inclus dans cette assurance santé groupe.</p>
      <label>
        Ajouter une personne
        <SearchableSelect
          ariaLabel="Ajouter une personne couverte"
          value=""
          onChange={(value) => {
            if (value) {
              onChange([...selectedIds, Number(value)]);
              setPage(Math.floor(selected.length / pageSize));
            }
          }}
          placeholder="Sélectionner une personne"
          options={available.map((employee) => ({
            value: String(employee.id),
            label: employeeLabel(employee),
          }))}
          disabled={available.length === 0}
        />
      </label>
      {selected.length > 0 ? (
        <>
          <div className="insurance-covered-equipment-count">
            {selected.length} personne{selected.length > 1 ? "s" : ""}{" "}
            sélectionnée{selected.length > 1 ? "s" : ""}
          </div>
          <ul>
            {visibleSelected.map((employee) => (
              <li key={employee.id}>
                <span>
                  <strong>{employee.name}</strong>
                  <small>
                    Date de naissance :{" "}
                    {employee.birth_date
                      ? formatInsuranceDate(employee.birth_date)
                      : "à renseigner"}
                  </small>
                </span>
                <button
                  className="insurance-covered-remove"
                  type="button"
                  aria-label={`Retirer ${employee.name}`}
                  title="Retirer"
                  onClick={() =>
                    onChange(selectedIds.filter((id) => id !== employee.id))
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {pageCount > 1 && (
            <nav
              className="insurance-covered-equipment-pagination"
              aria-label="Personnes sélectionnées"
            >
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage((current) => current - 1)}
              >
                Précédent
              </button>
              <span>
                {currentPage + 1} / {pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage === pageCount - 1}
                onClick={() => setPage((current) => current + 1)}
              >
                Suivant
              </button>
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          compact
          icon="people"
          title="Aucune personne sélectionnée"
          description="Choisissez les employés couverts à l’aide du champ ci-dessus."
        />
      )}
    </section>
  );
}

function employeeLabel(employee: { name: string; birth_date: string | null }) {
  return `${employee.name} — ${employee.birth_date ? formatInsuranceDate(employee.birth_date) : "Date de naissance à renseigner"}`;
}

function equipmentOptionLabel(option: InsuranceEquipmentOption) {
  return `${option.name} — Châssis ${option.chassis_number || "à renseigner"}`;
}
