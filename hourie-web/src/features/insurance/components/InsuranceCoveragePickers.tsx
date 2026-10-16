import { useState } from "react";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { activeLanguage } from "../../../i18n/fr";
import { operationPhrase } from "../../../i18n/operations";
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
        {operationPhrase("Équipements couverts")}
      </h3>
      <p>
        {operationPhrase("Sélectionnez uniquement les véhicules, camions et engins dont le numéro de série est renseigné.")}
      </p>
      <label>
        {operationPhrase("Ajouter un équipement")}
        <SearchableSelect
          ariaLabel={operationPhrase("Ajouter un équipement couvert")}
          value=""
          onChange={(value) => {
            if (value) add(Number(value));
          }}
          placeholder={
            options.length
              ? operationPhrase("Sélectionner un équipement")
              : operationPhrase("Aucun numéro de série renseigné")
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
            {activeLanguage === "ar" ? `${selected.length} معدات محددة` : `${selected.length} équipement${selected.length > 1 ? "s" : ""} sélectionné${selected.length > 1 ? "s" : ""}`}
          </div>
          <ul>
            {visibleSelected.map((option) => (
              <li key={option.id}>
                <span>
                  <strong>{option.name}</strong>
                  <small>
                    {option.category_name ?? operationPhrase("Actif")} · {option.asset_code} ·
                    {operationPhrase("N° de série")} {option.serial_number}
                  </small>
                </span>
                <button
                  className="insurance-covered-remove"
                  type="button"
                  aria-label={`Retirer ${option.name}`}
                  title={operationPhrase("Retirer")}
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
              aria-label={operationPhrase("Équipements sélectionnés")}
            >
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage((current) => current - 1)}
              >
                {operationPhrase("Précédent")}
              </button>
              <span>
                {currentPage + 1} / {pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage === pageCount - 1}
                onClick={() => setPage((current) => current + 1)}
              >
                {operationPhrase("Suivant")}
              </button>
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          compact
          icon="specifications"
          title={operationPhrase("Aucun équipement sélectionné")}
          description={operationPhrase("Choisissez les actifs couverts à l’aide du champ ci-dessus.")}
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
        {operationPhrase("Personnes couvertes")}
      </h3>
      <p>{operationPhrase("Sélectionnez les employés inclus dans cette assurance santé groupe.")}</p>
      <label>
        {operationPhrase("Ajouter une personne")}
        <SearchableSelect
          ariaLabel={operationPhrase("Ajouter une personne couverte")}
          value=""
          onChange={(value) => {
            if (value) {
              onChange([...selectedIds, Number(value)]);
              setPage(Math.floor(selected.length / pageSize));
            }
          }}
          placeholder={operationPhrase("Sélectionner une personne")}
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
            {activeLanguage === "ar" ? `${selected.length} أشخاص محددون` : `${selected.length} personne${selected.length > 1 ? "s" : ""} sélectionnée${selected.length > 1 ? "s" : ""}`}
          </div>
          <ul>
            {visibleSelected.map((employee) => (
              <li key={employee.id}>
                <span>
                  <strong>{employee.name}</strong>
                  <small>
                    {operationPhrase("Date de naissance")} :{" "}
                    {employee.birth_date
                      ? formatInsuranceDate(employee.birth_date)
                      : operationPhrase("À compléter")}
                  </small>
                </span>
                <button
                  className="insurance-covered-remove"
                  type="button"
                  aria-label={`Retirer ${employee.name}`}
                  title={operationPhrase("Retirer")}
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
              aria-label={operationPhrase("Personnes sélectionnées")}
            >
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage((current) => current - 1)}
              >
                {operationPhrase("Précédent")}
              </button>
              <span>
                {currentPage + 1} / {pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage === pageCount - 1}
                onClick={() => setPage((current) => current + 1)}
              >
                {operationPhrase("Suivant")}
              </button>
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          compact
          icon="people"
          title={operationPhrase("Aucune personne sélectionnée")}
          description={operationPhrase("Choisissez les employés couverts à l’aide du champ ci-dessus.")}
        />
      )}
    </section>
  );
}

function employeeLabel(employee: { name: string; birth_date: string | null }) {
  return `${employee.name} — ${employee.birth_date ? formatInsuranceDate(employee.birth_date) : operationPhrase("Date de naissance à renseigner")}`;
}

function equipmentOptionLabel(option: InsuranceEquipmentOption) {
  return `${option.name} — ${operationPhrase("N° de série")} ${option.serial_number || operationPhrase("À compléter")}`;
}
