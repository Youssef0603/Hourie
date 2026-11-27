import { useState, type FormEvent } from "react";
import type { UserRoleCode } from "../../auth/types";
import { fr } from "../../../i18n/fr";
import { operationPhrase } from "../../../i18n/operations";
import { ApiError } from "../../../shared/api/http";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { ToggleSwitch } from "../../../shared/components/ToggleSwitch";
import { catalogLabel, catalogOptions } from "../../equipment/catalogs";
import type { CatalogOption, NamedReference } from "../../equipment/types";
import { updateEmployee } from "../api";
import { generatedUsername } from "../username";
import type { EmployeeDetails } from "../types";

type EditPersonFormProps = {
  person: EmployeeDetails;
  catalogs?: CatalogOption[];
  projects?: NamedReference[];
  companyLocations?: NamedReference[];
  canManageManagerAccounts: boolean;
  /** The person being edited is the signed-in user, who cannot cut their own access. */
  isSelf?: boolean;
  formId?: string;
  hideSubmit?: boolean;
  onSaved: (person: EmployeeDetails) => void;
};

export function EditPersonForm({
  person,
  catalogs,
  projects = [],
  companyLocations = [],
  canManageManagerAccounts,
  isSelf = false,
  formId,
  hideSubmit = false,
  onSaved,
}: EditPersonFormProps) {
  const [name, setName] = useState(person.name);
  const [jobTitle, setJobTitle] = useState(person.job_title);
  const [phoneNumber, setPhoneNumber] = useState(person.phone_number ?? "");
  const [passportNumber, setPassportNumber] = useState(
    person.passport_number ?? "",
  );
  const [employmentDate, setEmploymentDate] = useState(
    person.employment_date ?? "",
  );
  const [birthDate, setBirthDate] = useState(person.birth_date ?? "");
  const currentAssignment = person.project_assignments.find((assignment) => assignment.ended_on === null);
  const [projectId, setProjectId] = useState(currentAssignment ? String(currentAssignment.project.id) : "");
  const [companyLocationId, setCompanyLocationId] = useState(person.current_company_location ? String(person.current_company_location.id) : "");
  const [projectRole, setProjectRole] = useState(currentAssignment?.project_role ?? "");
  const [assignmentStartedOn, setAssignmentStartedOn] = useState(currentAssignment?.started_on ?? "");
  const [assignmentEndedOn, setAssignmentEndedOn] = useState(currentAssignment?.ended_on ?? "");
  const [hasAccess, setHasAccess] = useState(person.user?.is_active ?? false);
  const [email, setEmail] = useState(person.email ?? "");
  const [role, setRole] = useState<
    UserRoleCode
  >(person.user?.role ?? "viewer");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // "Responsable des groupes" (generator_manager) is no longer offered.
  const roleEntries = Object.entries(fr.roles).filter(
    ([value]) => value !== "generator_manager" && (canManageManagerAccounts || value !== "manager"),
  );
  const jobTitles = catalogOptions(catalogs, "employee_job_title").filter(
    (option) => option.code !== "not_specified",
  );
  const currentJobTitleIsUnavailable = !jobTitles.some(
    (option) => option.code === jobTitle,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);
    try {
      onSaved(
        await updateEmployee(person.id, {
          name: name.trim(),
          job_title: jobTitle,
          phone_number: phoneNumber.trim() || null,
          passport_number: passportNumber.trim() || null,
          employment_date: employmentDate || null,
          birth_date: birthDate || null,
          project_id: projectId ? Number(projectId) : null,
          company_location_id: companyLocationId ? Number(companyLocationId) : null,
          project_role: projectId ? projectRole.trim() : null,
          assignment_started_on: projectId && assignmentStartedOn ? assignmentStartedOn : null,
          assignment_ended_on: projectId && assignmentEndedOn ? assignmentEndedOn : null,
          has_access: hasAccess,
          email: email.trim() || null,
          role,
          password: hasAccess ? password || null : null,
          password_confirmation: hasAccess && password ? passwordConfirmation : null,
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
      id={formId}
      className="directory-form people-form modal-directory-form person-edit-form"
      onSubmit={submit}
    >
      {formError && (
        <div className="form-alert account-form-alert" role="alert">
          {formError}
        </div>
      )}
      <section className="people-form-section">
        <h3>{fr.directory.personalInformation}</h3>
        <div className="people-form-fields">
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
            <span>{fr.directory.jobTitle}</span>
            <SearchableSelect
              required
              ariaLabel={fr.directory.jobTitle}
              value={jobTitle}
              onChange={setJobTitle}
              placeholder={operationPhrase("Sélectionner un poste")}
              includeEmpty={false}
              options={[
                ...(currentJobTitleIsUnavailable
                  ? [{ value: jobTitle, label: catalogLabel(catalogs, "employee_job_title", jobTitle) }]
                  : []),
                ...jobTitles.map((option) => ({
                  value: option.code,
                  label: catalogLabel(catalogs, "employee_job_title", option.code),
                })),
              ]}
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
            <span>{operationPhrase("E-mail")}</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            <span>{fr.directory.passportNumber}</span>
            <input
              value={passportNumber}
              onChange={(event) => setPassportNumber(event.target.value)}
            />
          </label>
          <label>
            <span>{fr.directory.employmentDate}</span>
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={employmentDate}
              onChange={(event) => setEmploymentDate(event.target.value)}
            />
          </label>
          <label>
            <span>{operationPhrase("Date de naissance")}</span>
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </label>
        </div>
      </section>
      <section className="people-form-section">
        <h3>{operationPhrase("Affectation actuelle")} <small>{operationPhrase("(facultatif)")}</small></h3>
        <div className="people-form-fields">
          <label>
            <span>{operationPhrase("Chantier actuel")}</span>
            <SearchableSelect
              ariaLabel={operationPhrase("Chantier actuel")}
              value={projectId}
              onChange={(value) => {
                setProjectId(value);
                if (value) setCompanyLocationId("");
              }}
              placeholder={operationPhrase("Aucun chantier")}
              options={[
                ...(currentAssignment && !projects.some((project) => project.id === currentAssignment.project.id)
                  ? [{ value: String(currentAssignment.project.id), label: currentAssignment.project.name }]
                  : []),
                ...projects.map((project) => ({ value: String(project.id), label: project.name })),
              ]}
            />
          </label>
          <label>
            <span>{operationPhrase("Localisation interne")}</span>
            <SearchableSelect
              ariaLabel={operationPhrase("Localisation interne")}
              value={companyLocationId}
              onChange={(value) => {
                setCompanyLocationId(value);
                if (value) setProjectId("");
              }}
              placeholder={operationPhrase("Aucune localisation")}
              options={companyLocations.map((location) => ({ value: String(location.id), label: location.name }))}
            />
          </label>
          {projectId && <>
            <label>
              <span>{operationPhrase("Fonction sur le chantier")}</span>
              <input required value={projectRole} onChange={(event) => setProjectRole(event.target.value)} />
            </label>
            <label>
              <span>{operationPhrase("Début de l’affectation")}</span>
              <input type="date" value={assignmentStartedOn} onChange={(event) => setAssignmentStartedOn(event.target.value)} />
            </label>
            <label>
              <span>{operationPhrase("Fin de l’affectation")}</span>
              <input type="date" min={assignmentStartedOn || undefined} value={assignmentEndedOn} onChange={(event) => setAssignmentEndedOn(event.target.value)} />
            </label>
          </>}
        </div>
      </section>
      <section className="people-form-section account-access-section">
        <ToggleSwitch
          checked={hasAccess}
          onChange={setHasAccess}
          disabled={isSelf}
          label={fr.directory.accountAccess}
          description={
            isSelf
              ? operationPhrase("Vous ne pouvez pas couper votre propre accès.")
              : hasAccess
                ? operationPhrase("Cette personne peut se connecter à Hourie.")
                : person.user
                  ? operationPhrase("Accès coupé : le compte est conservé mais ne peut plus se connecter.")
                  : operationPhrase("Aucun accès au système.")
          }
        />
        {hasAccess && (
          <>
            <p className="account-form-hint">{person.user ? fr.directory.editCredentialsHint : fr.directory.credentialsHint}</p>
            <div className="people-form-fields">
              <label>
                <span>{fr.directory.username}</span>
                <input
                  className="generated-username"
                  readOnly
                  tabIndex={-1}
                  value={person.user?.username ?? generatedUsername(name)}
                  placeholder={fr.directory.usernameGeneratedPlaceholder}
                />
                {!person.user && <small>{fr.directory.usernameGeneratedHint}</small>}
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
                  required={hasAccess && !person.user}
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
            </div>
          </>
        )}
      </section>
      {!hideSubmit && (
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
      )}
    </form>
  );
}
