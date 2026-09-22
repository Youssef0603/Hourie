import { useEffect, useRef, useState, type FormEvent } from "react";
import { fr } from "../../../i18n/fr";
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  getEmployees,
  updateEmployee,
} from "../api";
import type { Employee, EmployeeDetails } from "../types";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { Modal } from "../../../shared/components/Modal";
import { ApiError } from "../../../shared/api/http";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import type { CatalogOption } from "../../equipment/types";
import { catalogBadgeStyle, catalogLabel } from "../../equipment/catalogs";
import { DirectoryHeading } from "../components/DirectoryHeading";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";

type PeoplePageProps = {
  canAdd: boolean;
  canManageManagerAccounts?: boolean;
  catalogs?: CatalogOption[];
};

function generatedUsername(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

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
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<
    "manager" | "cms_manager" | "generator_manager" | "viewer"
  >("viewer");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<EmployeeDetails | null>(
    null,
  );
  const [isLoadingPerson, setIsLoadingPerson] = useState(false);
  const [isEditingPerson, setIsEditingPerson] = useState(false);
  const personRequest = useRef(0);
  const roleEntries = Object.entries(fr.roles).filter(
    ([value]) => canManageManagerAccounts || value !== "manager",
  );
  const searchTerm = normalizeSearch(search.trim());
  const visiblePeople = searchTerm
    ? people.filter((person) =>
        normalizeSearch(
          [
            person.name,
            person.user?.username,
            person.user?.email,
            person.phone_number,
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(searchTerm),
      )
    : people;

  useEffect(() => {
    refreshPeople();
  }, []);

  async function refreshPeople() {
    setError(null);
    setIsRefreshing(true);
    try {
      setPeople(await getEmployees());
    } catch {
      setError(fr.directory.loadError);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!canManageManagerAccounts && role === "manager") {
      setRole("viewer");
      return;
    }

    try {
      await createEmployee({
        name: name.trim(),
        phone_number: phoneNumber.trim() || null,
        email: email.trim() || null,
        role,
        password,
        password_confirmation: passwordConfirmation,
      });
      await refreshPeople();
      setName("");
      setPhoneNumber("");
      setEmail("");
      setRole("viewer");
      setPassword("");
      setPasswordConfirmation("");
      setShowForm(false);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (Object.values(caught.errors)[0]?.[0] ?? fr.directory.saveError)
          : fr.directory.saveError,
      );
    }
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
      <DirectoryHeading
        title={fr.directory.people}
        subtitle={fr.directory.peopleSubtitle}
        canAdd={canAdd}
        showForm={showForm}
        onToggle={() => setShowForm((value) => !value)}
        addLabel={fr.directory.addPerson}
      />
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
          <form
            className="directory-form people-form modal-directory-form"
            onSubmit={submit}
          >
            <p className="account-form-hint">{fr.directory.credentialsHint}</p>
            {error && (
              <div className="form-alert account-form-alert" role="alert">
                {error}
              </div>
            )}
            <label>
              <span>{fr.directory.fullName}</span>
              <input
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              <span>{fr.directory.phoneNumber}</span>
              <input
                type="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="+225 07 00 00 00 00"
              />
            </label>
            <label>
              <span>{fr.directory.username}</span>
              <input
                className="generated-username"
                readOnly
                tabIndex={-1}
                value={generatedUsername(name)}
                placeholder={fr.directory.usernameGeneratedPlaceholder}
              />
              <small>{fr.directory.usernameGeneratedHint}</small>
            </label>
            <label>
              <span>{fr.directory.optionalEmail}</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nom@hourie.ci"
              />
            </label>
            <label>
              <span>{fr.directory.accountRole}</span>
              <SearchableSelect
                ariaLabel={fr.directory.accountRole}
                value={role}
                onChange={(value) => setRole(value as typeof role)}
                placeholder={fr.directory.accountRole}
                includeEmpty={false}
                options={roleEntries.map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </label>
            <label>
              <span>{fr.directory.temporaryPassword}</span>
              <input
                required
                minLength={12}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label>
              <span>{fr.directory.confirmPassword}</span>
              <input
                required
                minLength={12}
                type="password"
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
              />
            </label>
            <div className="maintenance-form-actions">
              <button className="primary-button save-button" type="submit">
                {fr.common.save}
              </button>
            </div>
          </form>
        </Modal>
      )}
      <div className="people-table-wrap">
        <div className="filter-bar people-filter-bar">
          <label className="search-field">
            <span>{fr.equipment.search}</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={fr.directory.peopleSearchPlaceholder}
            />
          </label>
          <div className="filter-toolbar-actions">
            <button
              className="table-refresh-button filter-refresh-button"
              type="button"
              onClick={refreshPeople}
              disabled={isRefreshing}
              aria-label={fr.common.refresh}
              title={fr.common.refresh}
            >
              <ActionIcon name="refresh" />
            </button>
          </div>
        </div>
        <table className="people-table">
          <colgroup>
            <col className="people-name-column" />
            <col className="people-contact-column" />
            <col className="people-phone-column" />
            <col className="people-role-column" />
            <col className="people-count-column" />
          </colgroup>
          <thead>
            <tr>
              <th>{fr.directory.fullName}</th>
              <th>{fr.directory.username}</th>
              <th>{fr.directory.phoneNumber}</th>
              <th>{fr.directory.role}</th>
              <th>{fr.directory.assignedEquipment}</th>
            </tr>
          </thead>
          <tbody>
            {!isRefreshing &&
              visiblePeople.map((person) => (
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
                    <div className="person-identity">
                      <span className="person-avatar">
                        {person.name.slice(0, 1).toUpperCase()}
                      </span>
                      <strong>{person.name}</strong>
                    </div>
                  </td>
                  <td>
                    <strong>
                      {person.user?.username ?? fr.common.notAssigned}
                    </strong>
                    {person.user?.email && (
                      <span className="secondary-cell">
                        {person.user.email}
                      </span>
                    )}
                  </td>
                  <td>{person.phone_number ?? fr.common.notAssigned}</td>
                  <td>
                    {person.user
                      ? fr.roles[person.user.role]
                      : fr.common.notAssigned}
                  </td>
                  <td>
                    <span className="assignment-count">
                      {person.equipment_in_custody_count}
                    </span>
                  </td>
                </tr>
              ))}
            {!isRefreshing && visiblePeople.length === 0 && (
              <tr className="people-empty-row">
                <td colSpan={5}>
                  {searchTerm
                    ? fr.directory.noPeopleMatching
                    : fr.directory.noPeople}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {isRefreshing && (
          <div className="table-state people-table-state">
            <LoadingSpinner label={fr.common.loading} />
          </div>
        )}
      </div>
      {(isLoadingPerson || selectedPerson) && (
        <Modal
          title={
            isEditingPerson
              ? fr.directory.editPerson
              : (selectedPerson?.name ?? fr.directory.personDetails)
          }
          size="wide"
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

function PersonDetail({
  person,
  catalogs,
  canEdit,
  onEdit,
  onDelete,
}: {
  person: EmployeeDetails;
  catalogs: CatalogOption[] | undefined;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="person-detail">
      <section>
        <div className="person-detail-heading">
          <h3>{fr.directory.contactInformation}</h3>
          {canEdit && (
            <div className="detail-actions">
              <button
                className="equipment-edit-button"
                type="button"
                onClick={onEdit}
              >
                <ActionIcon name="edit" />
                {fr.common.edit}
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={onDelete}
              >
                <ActionIcon name="delete" />
                {fr.directory.deletePerson}
              </button>
            </div>
          )}
        </div>
        <dl>
          <div>
            <dt>{fr.directory.username}</dt>
            <dd>{person.user?.username ?? fr.common.notAssigned}</dd>
          </div>
          <div>
            <dt>{fr.directory.email}</dt>
            <dd>{person.user?.email ?? fr.common.notAssigned}</dd>
          </div>
          <div>
            <dt>{fr.directory.phoneNumber}</dt>
            <dd>{person.phone_number ?? fr.common.notAssigned}</dd>
          </div>
          <div>
            <dt>{fr.directory.role}</dt>
            <dd>
              {person.user ? fr.roles[person.user.role] : fr.common.notAssigned}
            </dd>
          </div>
          <div>
            <dt>{fr.directory.accountStatus}</dt>
            <dd>
              <span
                className={`account-status ${person.is_active ? "active" : "inactive"}`}
              >
                {person.is_active ? fr.directory.active : fr.directory.inactive}
              </span>
            </dd>
          </div>
        </dl>
      </section>
      <section>
        <div className="section-heading-row">
          <div>
            <h3>{fr.directory.assignedEquipment}</h3>
            <p>
              {fr.directory.custodyCount(person.equipment_in_custody_count)}
            </p>
          </div>
        </div>
        {person.equipment_in_custody.length > 0 ? (
          <div className="site-inventory-wrap">
            <table className="equipment-table person-inventory-table">
              <thead>
                <tr>
                  <th>{fr.equipment.number}</th>
                  <th>{fr.equipment.identification}</th>
                  <th>{fr.equipment.condition}</th>
                  <th>{fr.equipment.project}</th>
                  <th>{fr.equipment.locationShort}</th>
                </tr>
              </thead>
              <tbody>
                {person.equipment_in_custody.map((equipment) => (
                  <tr key={equipment.id}>
                    <td>
                      <strong>{equipment.display_id}</strong>
                      <span className="secondary-cell">
                        {equipment.asset_code}
                      </span>
                    </td>
                    <td>
                      {[equipment.brand, equipment.model]
                        .filter(Boolean)
                        .join(" ") || fr.common.notProvided}
                    </td>
                    <td>
                      <span
                        className={`status-badge status-${equipment.condition ?? "unknown"}`}
                        style={catalogBadgeStyle(
                          catalogs,
                          "equipment_condition",
                          equipment.condition,
                        )}
                      >
                        {equipment.condition
                          ? catalogLabel(
                              catalogs,
                              "equipment_condition",
                              equipment.condition,
                            )
                          : fr.common.notProvided}
                      </span>
                    </td>
                    <td>
                      {equipment.current_project_assignment?.project.name ??
                        fr.common.notProvided}
                    </td>
                    <td>
                      {equipment.current_location?.name ??
                        fr.common.notProvided}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>{fr.directory.noGenerators}</p>
        )}
      </section>
    </div>
  );
}

function EditPersonForm({
  person,
  canManageManagerAccounts,
  onSaved,
}: {
  person: EmployeeDetails;
  canManageManagerAccounts: boolean;
  onSaved: (person: EmployeeDetails) => void;
}) {
  const [name, setName] = useState(person.name);
  const [phoneNumber, setPhoneNumber] = useState(person.phone_number ?? "");
  const [username, setUsername] = useState(person.user?.username ?? "");
  const [email, setEmail] = useState(person.user?.email ?? "");
  const [role, setRole] = useState<
    "manager" | "cms_manager" | "generator_manager" | "viewer"
  >(person.user?.role ?? "viewer");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const roleEntries = Object.entries(fr.roles).filter(
    ([value]) => canManageManagerAccounts || value !== "manager",
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      onSaved(
        await updateEmployee(person.id, {
          name: name.trim(),
          phone_number: phoneNumber.trim() || null,
          username: username.trim() || null,
          email: email.trim() || null,
          role,
          password: password || null,
          password_confirmation: password ? passwordConfirmation : null,
        }),
      );
    } catch (caught) {
      setFormError(
        caught instanceof ApiError
          ? (Object.values(caught.errors)[0]?.[0] ?? fr.directory.saveError)
          : fr.directory.saveError,
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="directory-form people-form modal-directory-form person-edit-form"
      onSubmit={submit}
    >
      <p className="account-form-hint">{fr.directory.editCredentialsHint}</p>
      {formError && (
        <div className="form-alert account-form-alert" role="alert">
          {formError}
        </div>
      )}
      <label>
        <span>{fr.directory.fullName}</span>
        <input
          required
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        <span>{fr.directory.phoneNumber}</span>
        <input
          type="tel"
          autoComplete="tel"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
        />
      </label>
      <label>
        <span>{fr.directory.username}</span>
        <input
          required={person.user !== null}
          minLength={3}
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value.toLowerCase())}
        />
      </label>
      <label>
        <span>{fr.directory.optionalEmail}</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label>
        <span>{fr.directory.accountRole}</span>
        <SearchableSelect
          ariaLabel={fr.directory.accountRole}
          value={role}
          onChange={(value) => setRole(value as typeof role)}
          placeholder={fr.directory.accountRole}
          includeEmpty={false}
          options={roleEntries.map(([value, label]) => ({ value, label }))}
        />
      </label>
      <label>
        <span>{fr.directory.newPassword}</span>
        <input
          minLength={12}
          required={!person.user && username !== ""}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label>
        <span>{fr.directory.confirmNewPassword}</span>
        <input
          minLength={12}
          required={password !== ""}
          type="password"
          autoComplete="new-password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
        />
      </label>
      <div className="maintenance-form-actions">
        <button
          className="primary-button save-button"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? (
            <LoadingSpinner compact label={fr.common.saving} />
          ) : (
            fr.common.save
          )}
        </button>
      </div>
    </form>
  );
}
