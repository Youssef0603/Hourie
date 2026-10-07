import { useCallback, useEffect, useRef, useState } from "react";
import { fr } from "../../../i18n/fr";
import { deleteEmployee, getEmployee, getEmployees } from "../api";
import type { Employee, EmployeeDetails } from "../types";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { Modal } from "../../../shared/components/Modal";
import { ApiError } from "../../../shared/api/http";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import type { CatalogOption } from "../../equipment/types";
import { EmptyState } from "../../../shared/components/EmptyState";
import { DataTable } from "../../../shared/components/DataTable";
import { AddPersonForm } from "../components/AddPersonForm";
import { EditPersonForm } from "../components/EditPersonForm";
import {
  PeopleFilterDrawer,
  type AccessFilter,
  type ActivityFilter,
  type RoleFilter,
} from "../components/PeopleFilterDrawer";
import { PersonDetail } from "../components/PersonDetail";
import type { PaginationMeta } from "../../../shared/api/pagination";

type PeoplePageProps = {
  canAdd: boolean;
  canManageManagerAccounts?: boolean;
  catalogs?: CatalogOption[];
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

export function PeoplePage({
  canAdd,
  canManageManagerAccounts = false,
  catalogs,
}: PeoplePageProps) {
  const [people, setPeople] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("");
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<EmployeeDetails | null>(
    null,
  );
  const [isLoadingPerson, setIsLoadingPerson] = useState(false);
  const [isEditingPerson, setIsEditingPerson] = useState(false);
  const personRequest = useRef(0);
  const searchTerm = normalizeSearch(search.trim());
  const searchedPeople = searchTerm
    ? people.filter((person) =>
        normalizeSearch(
          [
            person.name,
            person.email,
            person.user?.username,
            person.user?.email,
            person.phone_number,
            person.passport_number,
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(searchTerm),
      )
    : people;
  const visiblePeople = searchedPeople.filter(
    (person) =>
      (accessFilter === "" ||
        (accessFilter === "with_access"
          ? person.user !== null
          : person.user === null)) &&
      (roleFilter === "" || person.user?.role === roleFilter) &&
      (activityFilter === "" ||
        (activityFilter === "active" ? person.is_active : !person.is_active)),
  );
  const activeFilterCount = [accessFilter, roleFilter, activityFilter].filter(
    Boolean,
  ).length;
  const page = pagination?.current_page ?? currentPage;
  const totalPages = pagination?.last_page ?? 1;

  const loadPeople = useCallback(async (pageToLoad: number) => {
    setError(null);
    setIsRefreshing(true);
    try {
      const response = await getEmployees(pageToLoad, {
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(accessFilter ? { access: accessFilter } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(activityFilter ? { activity: activityFilter } : {}),
      });
      setPeople(response.data ?? []);
      setPagination(response.meta ?? null);
      if (response.meta) setCurrentPage(response.meta.current_page);
    } catch {
      setError(fr.directory.loadError);
    } finally {
      setIsRefreshing(false);
    }
  }, [accessFilter, activityFilter, roleFilter, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPeople(1), 200);
    return () => window.clearTimeout(timer);
  }, [loadPeople]);

  async function refreshPeople(pageToLoad = currentPage) {
    await loadPeople(pageToLoad);
  }

  async function openPerson(id: number) {
    const requestId = ++personRequest.current;
    setIsLoadingPerson(true);
    setSelectedPerson(null);
    setIsEditingPerson(false);
    setError(null);

    try {
      const person = await getEmployee(id);
      if (personRequest.current === requestId) setSelectedPerson(person);
    } catch {
      if (personRequest.current === requestId) setError(fr.directory.loadError);
    } finally {
      if (personRequest.current === requestId) setIsLoadingPerson(false);
    }
  }

  function closePerson() {
    personRequest.current += 1;
    setIsLoadingPerson(false);
    setSelectedPerson(null);
    setIsEditingPerson(false);
  }

  async function removePerson() {
    if (
      !selectedPerson ||
      !window.confirm(fr.directory.deletePersonConfirmation)
    )
      return;

    try {
      await deleteEmployee(selectedPerson.id);
      closePerson();
      await refreshPeople();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (Object.values(caught.errors)[0]?.[0] ?? fr.common.deleteError)
          : fr.common.deleteError,
      );
    }
  }

  return (
    <main className="directory-page">
      <section className="people-page-heading">
        <div>
          <h1>{fr.directory.people}</h1>
          <p>{fr.directory.peopleRegistered(people.length)}</p>
        </div>
      </section>
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      {showForm && (
        <Modal
          title={fr.directory.addPerson}
          onClose={() => setShowForm(false)}
        >
          <AddPersonForm
            canManageManagerAccounts={canManageManagerAccounts}
            onSaved={async () => {
              await refreshPeople();
              setShowForm(false);
            }}
          />
        </Modal>
      )}
      <section className="inventory-panel">
        <div className="filter-bar">
          <label className="search-field">
            <span>{fr.equipment.search}</span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder={fr.directory.peopleSearchPlaceholder}
            />
          </label>
          <div className="filter-toolbar-actions">
            <button
              className={`advanced-filter-toggle${showFilters ? " active" : ""}`}
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              aria-expanded={showFilters}
            >
              <ActionIcon name="filter" />
              <span>{fr.equipment.filters}</span>
              {activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}
            </button>
            {canAdd && (
              <button
                className="table-refresh-button table-add-button"
                type="button"
                onClick={() => setShowForm(true)}
                aria-label={fr.directory.addPerson}
                title={fr.directory.addPerson}
              >
                <ActionIcon name="add" />
              </button>
            )}
            <button
              className="table-refresh-button filter-refresh-button"
              type="button"
                    onClick={() => void refreshPeople()}
              disabled={isRefreshing}
              aria-label={fr.common.refresh}
              title={fr.common.refresh}
            >
              <ActionIcon name="refresh" />
            </button>
            {activeFilterCount > 0 && (
              <button
                className="clear-filters"
                type="button"
                onClick={() => {
                  setAccessFilter("");
                  setRoleFilter("");
                  setActivityFilter("");
                  setCurrentPage(1);
                }}
              >
                {fr.equipment.clearFilters}
              </button>
            )}
          </div>
        </div>
        {showFilters && (
          <PeopleFilterDrawer
            accessFilter={accessFilter}
            roleFilter={roleFilter}
            activityFilter={activityFilter}
            onAccessChange={(value) => {
              setAccessFilter(value);
              setCurrentPage(1);
            }}
            onRoleChange={(value) => {
              setRoleFilter(value);
              setCurrentPage(1);
            }}
            onActivityChange={(value) => {
              setActivityFilter(value);
              setCurrentPage(1);
            }}
            onClose={() => setShowFilters(false)}
          />
        )}
        {!isRefreshing && visiblePeople.length > 0 && (
          <>
            <DataTable
              className="asset-inventory-table people-list-table"
              ariaLabel={fr.directory.people}
            >
              <thead>
                <tr>
                  <th>{fr.directory.fullName}</th>
                  <th>{fr.directory.email}</th>
                  <th>{fr.directory.phoneNumber}</th>
                  <th>{fr.directory.employmentDate}</th>
                  <th>Accès</th>
                </tr>
              </thead>
              <tbody>
                {visiblePeople.map((person) => (
                  <tr
                    key={person.id}
                    tabIndex={0}
                    onClick={() => openPerson(person.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openPerson(person.id);
                      }
                    }}
                  >
                    <td>
                      <span className="directory-table-person">
                        <span>
                          <strong className="primary-cell">
                            {person.name}
                          </strong>
                        </span>
                      </span>
                    </td>
                    <td>{person.email ?? fr.common.notAssigned}</td>
                    <td>{person.phone_number ?? fr.common.notAssigned}</td>
                    <td>
                      {person.employment_date
                        ? new Intl.DateTimeFormat("fr-FR").format(
                            new Date(`${person.employment_date}T00:00:00`),
                          )
                        : fr.common.notAssigned}
                    </td>
                    <td>
                      <span
                        className={`person-system-access${person.user ? " has-access" : ""}`}
                      >
                        {person.user
                          ? fr.roles[person.user.role]
                          : fr.directory.noSystemAccess}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            {pagination && (
              <nav className="pagination" aria-label={fr.equipment.pagination}>
                <span>{fr.equipment.results(pagination.from, pagination.to, pagination.total)}</span>
                <div>
                  <button
                    type="button"
                    disabled={page === 1 || isRefreshing}
                    onClick={() => void refreshPeople(page - 1)}
                  >
                    {fr.common.previous}
                  </button>
                  <span>{fr.equipment.page(page, totalPages)}</span>
                  <button
                    type="button"
                    disabled={page === totalPages || isRefreshing}
                    onClick={() => void refreshPeople(page + 1)}
                  >
                    {fr.common.next}
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
        {!isRefreshing && visiblePeople.length === 0 && (
          <EmptyState
            icon="people"
            title={
              searchTerm ? fr.directory.noPeopleMatching : fr.directory.noPeople
            }
            description={
              searchTerm
                ? "Modifiez votre recherche pour afficher d’autres personnes."
                : "Les personnes ajoutées apparaîtront ici."
            }
          />
        )}
        {isRefreshing && (
          <div className="table-state people-table-state">
            <LoadingSpinner label={fr.common.loading} />
          </div>
        )}
      </section>
      {(isLoadingPerson || selectedPerson) && (
        <Modal
          title={
            isEditingPerson ? fr.directory.editPerson : fr.directory.personSheet
          }
          size={isEditingPerson ? "wide" : "person"}
          onClose={closePerson}
        >
          {isLoadingPerson ? (
            <LoadingSpinner
              className="person-detail-loading"
              label={fr.common.loading}
            />
          ) : (
            selectedPerson &&
            (isEditingPerson ? (
              <EditPersonForm
                person={selectedPerson}
                canManageManagerAccounts={canManageManagerAccounts}
                onSaved={(updated) => {
                  setSelectedPerson(updated);
                  setIsEditingPerson(false);
                  refreshPeople();
                }}
              />
            ) : (
              <PersonDetail
                person={selectedPerson}
                catalogs={catalogs}
                canEdit={
                  canAdd &&
                  (canManageManagerAccounts ||
                    selectedPerson.user?.role !== "manager")
                }
                onEdit={() => setIsEditingPerson(true)}
                onDelete={removePerson}
              />
            ))
          )}
        </Modal>
      )}
    </main>
  );
}
