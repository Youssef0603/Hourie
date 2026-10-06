import { useState, type ReactNode } from "react";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { formatInsuranceDate } from "../policyDisplay";
import type { InsurancePolicy as Policy } from "../types";

export function InsuranceCoveredEquipment({
  equipment,
  onOpenEquipment,
}: {
  equipment: NonNullable<Policy["equipment"]>;
  onOpenEquipment?: (equipmentId: number) => void;
}) {
  return (
    <InsuranceCoveredItems
      title="Équipements couverts"
      icon="specifications"
      countLabel="actif"
      emptyTitle="Aucun équipement couvert"
      emptyDescription="Les actifs liés à cette assurance apparaîtront ici."
      items={equipment}
      onOpenItem={onOpenEquipment}
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
      coveredLabel="couverte"
      emptyTitle="Aucune personne couverte"
      emptyDescription="Les employés liés à cette assurance santé apparaîtront ici."
      items={employees}
      searchPlaceholder="Rechercher une personne"
      noSearchResults="Aucune personne ne correspond à cette recherche."
      getSearchText={(employee) => employee.name}
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
  coveredLabel = "couvert",
  emptyTitle,
  emptyDescription,
  items,
  renderItem,
  onOpenItem,
  searchPlaceholder,
  noSearchResults,
  getSearchText,
}: {
  title: string;
  icon: "specifications" | "people";
  countLabel: string;
  coveredLabel?: string;
  emptyTitle: string;
  emptyDescription: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
  onOpenItem?: (itemId: number) => void;
  searchPlaceholder?: string;
  noSearchResults?: string;
  getSearchText?: (item: T) => string;
}) {
  const pageSize = 3;
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const normalizedQuery = normalizeSearch(query);
  const searchTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const filteredItems = getSearchText
    ? items.filter((item) => {
        const searchable = normalizeSearch(getSearchText(item));
        return searchTerms.every((term) => searchable.includes(term));
      })
    : items;
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleItems = filteredItems.slice(
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
          {getSearchText && searchPlaceholder && (
            <label className="document-list-search insurance-detail-covered-search">
              <ActionIcon name="search" />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
            </label>
          )}
          <p className="insurance-detail-covered-count">
            {filteredItems.length} {countLabel}
            {filteredItems.length > 1 ? "s" : ""} {coveredLabel}
            {filteredItems.length > 1 ? "s" : ""}
          </p>
          {visibleItems.length ? (
            <ul>
              {visibleItems.map((item) => (
                <li key={item.id}>
                  {onOpenItem ? (
                    <button type="button" onClick={() => onOpenItem(item.id)}>
                      {renderItem(item)}
                    </button>
                  ) : (
                    renderItem(item)
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="document-list-empty">{noSearchResults}</p>
          )}
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

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr-FR")
    .trim();
}
