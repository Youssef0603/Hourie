import { useState, type ReactNode } from "react";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { formatInsuranceDate } from "../policyDisplay";
import type { InsurancePolicy as Policy } from "../types";

export function InsuranceCoveredEquipment({
  equipment,
}: {
  equipment: NonNullable<Policy["equipment"]>;
}) {
  return (
    <InsuranceCoveredItems
      title="Équipements couverts"
      icon="specifications"
      countLabel="actif"
      emptyTitle="Aucun équipement couvert"
      emptyDescription="Les actifs liés à cette assurance apparaîtront ici."
      items={equipment}
      renderItem={(item) => (
        <>
          <strong>
            {[item.brand, item.model].filter(Boolean).join(" ") ||
              item.asset_code}
          </strong>
          <small>{item.asset_code}</small>
        </>
      )}
    />
  );
}

export function InsuranceCoveredPeople({
  employees,
}: {
  employees: NonNullable<Policy["employees"]>;
}) {
  return (
    <InsuranceCoveredItems
      title="Personnes couvertes"
      icon="people"
      countLabel="personne"
      emptyTitle="Aucune personne couverte"
      emptyDescription="Les employés liés à cette assurance santé apparaîtront ici."
      items={employees}
      renderItem={(employee) => (
        <>
          <strong>{employee.name}</strong>
          <small>
            Date de naissance :{" "}
            {employee.birth_date
              ? formatInsuranceDate(employee.birth_date)
              : "à renseigner"}
          </small>
        </>
      )}
    />
  );
}

function InsuranceCoveredItems<T extends { id: number }>({
  title,
  icon,
  countLabel,
  emptyTitle,
  emptyDescription,
  items,
  renderItem,
}: {
  title: string;
  icon: "specifications" | "people";
  countLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
}) {
  const pageSize = 3;
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleItems = items.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  return (
    <section className="insurance-detail-covered">
      <h3>
        <ActionIcon name={icon} />
        {title}
      </h3>
      {items.length ? (
        <>
          <p className="insurance-detail-covered-count">
            {items.length} {countLabel}
            {items.length > 1 ? "s" : ""} couvert{items.length > 1 ? "s" : ""}
          </p>
          <ul>
            {visibleItems.map((item) => (
              <li key={item.id}>{renderItem(item)}</li>
            ))}
          </ul>
          {pageCount > 1 && (
            <nav
              className="insurance-detail-covered-pagination"
              aria-label={title}
            >
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage((value) => value - 1)}
              >
                Précédent
              </button>
              <span>
                {currentPage + 1} / {pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage === pageCount - 1}
                onClick={() => setPage((value) => value + 1)}
              >
                Suivant
              </button>
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          compact
          icon={icon}
          title={emptyTitle}
          description={emptyDescription}
        />
      )}
    </section>
  );
}
