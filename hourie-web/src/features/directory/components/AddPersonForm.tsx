import { useState, type FormEvent } from "react";
import type { UserRoleCode } from "../../auth/types";
import { fr } from "../../../i18n/fr";
import { operationPhrase } from "../../../i18n/operations";
import { ApiError } from "../../../shared/api/http";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { ToggleSwitch } from "../../../shared/components/ToggleSwitch";
import { catalogLabel, catalogOptions } from "../../equipment/catalogs";
import type { CatalogOption, NamedReference } from "../../equipment/types";
import { createEmployee } from "../api";
import { generatedUsername } from "../username";

type AddPersonFormProps = {
  canManageManagerAccounts: boolean;
  catalogs?: CatalogOption[];
  projects?: NamedReference[];
  companyLocations?: NamedReference[];
  onSaved: () => Promise<void> | void;
};

export function AddPersonForm({
  canManageManagerAccounts,
  catalogs,
  projects = [],
  companyLocations = [],
  onSaved,
}: AddPersonFormProps) {
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [employmentDate, setEmploymentDate] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [companyLocationId, setCompanyLocationId] = useState("");
  const [projectRole, setProjectRole] = useState("");
  const [assignmentStartedOn, setAssignmentStartedOn] = useState("");
  const [assignmentEndedOn, setAssignmentEndedOn] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<
    UserRoleCode
  >("viewer");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  // "Responsable des groupes" (generator_manager) is no longer offered.
  const roleEntries = Object.entries(fr.roles).filter(
    ([value]) => value !== "generator_manager" && (canManageManagerAccounts || value !== "manager"),
  );
  const jobTitles = catalogOptions(catalogs, "employee_job_title").filter(
    (option) => option.code !== "not_specified",
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (createAccount && !canManageManagerAccounts && role === "manager") {
      setRole("viewer");
      return;
    }
    try {
      await createEmployee({
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
        create_account: createAccount,
        email: email.trim() || null,
        role: createAccount ? role : null,
        password: createAccount ? password : null,
        password_confirmation: createAccount ? passwordConfirmation : null,
      });
      await onSaved();
    } catch (caught) {
      setFormError(
        caught instanceof ApiError
          ? (Object.values(caught.errors)[0]?.[0] ?? fr.directory.saveError)
          : fr.directory.saveError,
      );
    }
  }

  return (
    <form
      className={`directory-form people-form modal-directory-form${createAccount ? "" : " personnel-only-form"}`}
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
              options={jobTitles.map((option) => ({
                value: option.code,
                label: catalogLabel(catalogs, "employee_job_title", option.code),
              }))}
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
            <span>{operationPhrase("E-mail")}</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nom@hourie.ci"
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
            <span>{operationPhrase("Chantier")}</span>
            <SearchableSelect
              ariaLabel={operationPhrase("Chantier")}
              value={projectId}
              onChange={(value) => {
                setProjectId(value);
                if (value) setCompanyLocationId("");
              }}
              placeholder={operationPhrase("Aucun chantier")}
              options={projects.map((project) => ({ value: String(project.id), label: project.name }))}
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
              <input required value={projectRole} onChange={(event) => setProjectRole(event.target.value)} placeholder={operationPhrase("Ex. Ingénieur de chantier")} />
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
      <section
        className={`people-form-section account-access-section${createAccount ? " has-account" : ""}`}
      >
        <ToggleSwitch
          checked={createAccount}
          onChange={setCreateAccount}
          label={fr.directory.accountAccess}
          description={createAccount ? operationPhrase("Cette personne pourra se connecter à Hourie.") : operationPhrase("Aucun accès au système.")}
        />
        {createAccount && (
          <>
            <p className="account-form-hint">{fr.directory.credentialsHint}</p>
            <div className="people-form-fields">
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
            </div>
          </>
        )}
      </section>
      <div className="maintenance-form-actions">
        <button className="primary-button save-button" type="submit">
          {fr.common.save}
        </button>
      </div>
    </form>
  );
}
