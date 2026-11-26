import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeSearch } from "../../../shared/text";
import { fr } from "../../../i18n/fr";
import { operationPhrase } from "../../../i18n/operations";
import { deleteEmployee, getEmployee, getEmployees } from "../api";
import type { Employee, EmployeeDetails } from "../types";
import { FilterToggleButton, ToolbarIconButton } from "../../../shared/components/ToolbarButtons";
import { Pagination } from "../../../shared/components/Pagination";
import { SearchField } from "../../../shared/components/SearchField";
import { clickableRow } from "../../../shared/clickableRow";
import { formatDate } from "../../../shared/format";
import { Modal } from "../../../shared/components/Modal";
import { ApiError } from "../../../shared/api/http";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import type { CatalogOption, NamedReference } from "../../equipment/types";
import { catalogLabel } from "../../equipment/catalogs";
import { EmptyState } from "../../../shared/components/EmptyState";
import { DataTable } from "../../../shared/components/DataTable";
import { AddPersonForm } from "../components/AddPersonForm";
import { EditPersonForm } from "../components/EditPersonForm";
import {
  PeopleFilterDrawer,
  type AccessFilter,
  type RoleFilter,
} from "../components/PeopleFilterDrawer";
import { PersonDetail } from "../components/PersonDetail";
import { DirectoryDetailPanel } from "../components/DirectoryDetailPanel";
import type { PaginationMeta } from "../../../shared/api/pagination";
import type { AuthenticatedUser } from "../../auth/types";
import type { Language } from "../../../i18n/fr";
import type { EquipmentFilterOptions } from "../../equipment/types";
import { RelatedEquipmentDetailPanel } from "../../equipment/components/RelatedEquipmentDetailPanel";
import {
  RelatedRecordDetailPanel,
  type RelatedRecordReference,
} from "../../equipment/components/RelatedRecordDetailPanel";
import { TotalCount } from "../../../shared/components/TotalCount";

type PeoplePageProps = {
  canAdd: boolean;
  initialProjectId?: number | null;
  canManageManagerAccounts?: boolean;
  /** The signed-in user, who cannot cut their own access. */
  currentUserId?: number | null;
  catalogs?: CatalogOption[];
  projects?: NamedReference[];
  companyLocations?: NamedReference[];
  relatedEquipmentContext?: {
    user: AuthenticatedUser;
    language: Language;
    options: EquipmentFilterOptions | null;
  };
};

export function PeoplePage({
  canAdd,
  initialProjectId = null,
  canManageManagerAccounts = false,
  currentUserId = null,
  catalogs,
  projects,
  companyLocations,
  relatedEquipmentContext,
}: PeoplePageProps) {
  const [people, setPeople] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("");
  const [jobTitleFilter, setJobTitleFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState(initialProjectId ? String(initialProjectId) : "");
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<EmployeeDetails | null>(
    null,
  );
  const [isLoadingPerson, setIsLoadingPerson] = useState(false);
  const [isEditingPerson, setIsEditingPerson] = useState(false);
  const [relatedEquipmentId, setRelatedEquipmentId] = useState<number | null>(null);
  const [relatedRecord, setRelatedRecord] = useState<RelatedRecordReference | null>(null);
  const personRequest = useRef(0);

  useEffect(() => {
    setProjectFilter(initialProjectId ? String(initialProjectId) : "");
    setCurrentPage(1);
  }, [initialProjectId]);

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
            catalogLabel(catalogs, "employee_job_title", person.job_title),
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
      (jobTitleFilter === "" || person.job_title === jobTitleFilter) &&
      (projectFilter === "" || String(person.current_project?.id) === projectFilter),
  );
  const activeFilterCount = [accessFilter, roleFilter, jobTitleFilter, projectFilter].filter(
    Boolean,
  ).length;
  const personEditFormId = selectedPerson
    ? `person-edit-form-${selectedPerson.id}`
    : "person-edit-form";

  const loadPeople = useCallback(async (pageToLoad: number) => {
    setError(null);
    setIsRefreshing(true);
    try {
      const response = await getEmployees(pageToLoad, {
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(accessFilter ? { access: accessFilter } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(jobTitleFilter ? { job_title: jobTitleFilter } : {}),
        ...(projectFilter ? { project_id: projectFilter } : {}),
      });
      setPeople(response.data ?? []);
      setPagination(response.meta ?? null);
      if (response.meta) setCurrentPage(response.meta.current_page);
    } catch {
      setError(fr.directory.loadError);
    } finally {
      setIsRefreshing(false);
    }
  }, [accessFilter, jobTitleFilter, projectFilter, roleFilter, search]);

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
    setRelatedEquipmentId(null);
    setRelatedRecord(null);
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
    setRelatedEquipmentId(null);
    setRelatedRecord(null);
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
        </div>
        <TotalCount
          value={pagination?.total ?? people.length}
          label={fr.directory.people}
          loading={isRefreshing}
        />
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
            catalogs={catalogs}
            projects={projects}
            companyLocations={companyLocations}
            onSaved={async () => {
              await refreshPeople();
              setShowForm(false);
            }}
          />
        </Modal>
      )}
      <section className="inventory-panel">
        <div className="filter-bar">
          <SearchField
            label={fr.equipment.search}
            value={search}
            onChange={(value) => {
              setSearch(value);
              setCurrentPage(1);
            }}
            placeholder={fr.directory.peopleSearchPlaceholder}
          />
          <div className="filter-toolbar-actions">
            <FilterToggleButton
              label={fr.equipment.filters}
              active={showFilters}
              count={activeFilterCount}
              onClick={() => setShowFilters((value) => !value)}
            />
            {canAdd && (
              <ToolbarIconButton icon="add" label={fr.directory.addPerson} onClick={() => setShowForm(true)} />
            )}
            <ToolbarIconButton icon="refresh" label={fr.common.refresh} disabled={isRefreshing} onClick={() => void refreshPeople()} />
            {activeFilterCount > 0 && (
              <button
                className="clear-filters"
                type="button"
                onClick={() => {
                  setAccessFilter("");
                  setRoleFilter("");
                  setJobTitleFilter("");
                  setProjectFilter("");
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
            jobTitleFilter={jobTitleFilter}
            projectFilter={projectFilter}
            catalogs={catalogs}
            projects={projects}
            onAccessChange={(value) => {
              setAccessFilter(value);
              setCurrentPage(1);
            }}
            onRoleChange={(value) => {
              setRoleFilter(value);
              setCurrentPage(1);
            }}
            onJobTitleChange={(value) => {
              setJobTitleFilter(value);
              setCurrentPage(1);
            }}
            onProjectChange={(value) => {
              setProjectFilter(value);
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
                  <th>{fr.directory.jobTitle}</th>
                  <th>{fr.directory.workplace}</th>
                  <th>{fr.directory.phoneNumber}</th>
                  <th>{fr.directory.employmentDate}</th>
                </tr>
              </thead>
              <tbody>
                {visiblePeople.map((person) => (
                  <tr
                    key={person.id}
                    {...clickableRow(() => openPerson(person.id))}
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
                    <td>{catalogLabel(catalogs, "employee_job_title", person.job_title)}</td>
                    <td>{person.current_project?.name ?? person.current_company_location?.name ?? fr.common.notAssigned}</td>
                    <td>{person.phone_number ?? fr.common.notAssigned}</td>
                    <td>
                      {formatDate(person.employment_date, { fallback: fr.common.notAssigned })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            {pagination && (
              <Pagination
                meta={pagination}
                disabled={isRefreshing}
                hideWhenSinglePage={false}
                onPageChange={(nextPage) => void refreshPeople(nextPage)}
              />
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
              operationPhrase(
                searchTerm
                  ? "Modifiez votre recherche pour afficher d’autres personnes."
                  : "Les personnes ajoutées apparaîtront ici.",
              )
            }
          />
        )}
        {isRefreshing && (
          <div className="table-state people-table-state">
            <LoadingSpinner label={fr.common.loading} />
          </div>
        )}
      </section>
      {(isLoadingPerson || selectedPerson) && !isEditingPerson && (
        <DirectoryDetailPanel
          title={fr.directory.personSheet}
          sectionLabel={fr.directory.people}
          subtitle={selectedPerson?.name}
          className="directory-person-detail-panel"
          onClose={closePerson}
        >
          {isLoadingPerson ? (
            <LoadingSpinner
              className="person-detail-loading"
              label={fr.common.loading}
            />
          ) : (
            selectedPerson && (
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
                onOpenEquipment={setRelatedEquipmentId}
                onOpenInsurance={(policyId) => setRelatedRecord({ type: "insurance", id: policyId })}
              />
            )
          )}
        </DirectoryDetailPanel>
      )}
      {selectedPerson && isEditingPerson && (
        <DirectoryDetailPanel
          title={fr.directory.editPerson}
          sectionLabel={fr.directory.people}
          subtitle={selectedPerson.name}
          className="directory-person-edit-panel directory-edit-panel"
          onClose={() => setIsEditingPerson(false)}
          headerActions={
            <button
              className="primary-button directory-panel-save"
              type="submit"
              form={personEditFormId}
            >
              {fr.common.save}
            </button>
          }
        >
          <EditPersonForm
            person={selectedPerson}
            catalogs={catalogs}
            projects={projects}
            companyLocations={companyLocations}
            canManageManagerAccounts={canManageManagerAccounts}
            isSelf={selectedPerson.user !== null && selectedPerson.user.id === currentUserId}
            formId={personEditFormId}
            hideSubmit
            onSaved={(updated) => {
              setSelectedPerson(updated);
              setIsEditingPerson(false);
              refreshPeople();
            }}
          />
        </DirectoryDetailPanel>
      )}
      {relatedEquipmentId && relatedEquipmentContext && (
        <RelatedEquipmentDetailPanel
          key={relatedEquipmentId}
          equipmentId={relatedEquipmentId}
          {...relatedEquipmentContext}
          onClose={() => setRelatedEquipmentId(null)}
        />
      )}
      {relatedRecord && (
        <RelatedRecordDetailPanel
          key={`${relatedRecord.type}-${relatedRecord.id}`}
          record={relatedRecord}
          onClose={() => setRelatedRecord(null)}
        />
      )}
    </main>
  );
}
