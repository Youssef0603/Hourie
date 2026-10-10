import { useState, type FormEvent } from "react";
import { fr } from "../../../i18n/fr";
import { ApiError } from "../../../shared/api/http";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { catalogLabel, catalogOptions } from "../../equipment/catalogs";
import type { CatalogOption, NamedReference } from "../../equipment/types";
import { createEmployee } from "../api";

type AddPersonFormProps = {
  canManageManagerAccounts: boolean;
  catalogs?: CatalogOption[];
  projects?: NamedReference[];
  onSaved: () => Promise<void> | void;
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

export function AddPersonForm({
  canManageManagerAccounts,
  catalogs,
  projects = [],
  onSaved,
}: AddPersonFormProps) {
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [employmentDate, setEmploymentDate] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projectRole, setProjectRole] = useState("");
  const [assignmentStartedOn, setAssignmentStartedOn] = useState("");
  const [assignmentEndedOn, setAssignmentEndedOn] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<
    "manager" | "cms_manager" | "generator_manager" | "viewer"
  >("viewer");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const roleEntries = Object.entries(fr.roles).filter(
    ([value]) => canManageManagerAccounts || value !== "manager",
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
              placeholder="Sélectionner un poste"
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
            <span>E-mail</span>
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
            <span>Date de naissance</span>
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
        <h3>Affectation chantier <small>(facultatif)</small></h3>
        <div className="people-form-fields">
          <label>
            <span>Chantier</span>
            <SearchableSelect
              ariaLabel="Chantier"
              value={projectId}
              onChange={setProjectId}
              placeholder="Aucun chantier"
              options={projects.map((project) => ({ value: String(project.id), label: project.name }))}
            />
          </label>
          {projectId && <>
            <label>
              <span>Fonction sur le chantier</span>
              <input required value={projectRole} onChange={(event) => setProjectRole(event.target.value)} placeholder="Ex. Ingénieur de chantier" />
            </label>
            <label>
              <span>Début de l’affectation</span>
              <input type="date" value={assignmentStartedOn} onChange={(event) => setAssignmentStartedOn(event.target.value)} />
            </label>
            <label>
              <span>Fin de l’affectation</span>
              <input type="date" min={assignmentStartedOn || undefined} value={assignmentEndedOn} onChange={(event) => setAssignmentEndedOn(event.target.value)} />
            </label>
          </>}
        </div>
      </section>
      <section
        className={`people-form-section account-access-section${createAccount ? " has-account" : ""}`}
      >
        {createAccount && <h3>{fr.directory.accountAccess}</h3>}
        <label className="account-access-toggle">
          <input
            type="checkbox"
            checked={createAccount}
            onChange={(event) => setCreateAccount(event.target.checked)}
          />
          <span>{fr.directory.createAccount}</span>
        </label>
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
              <label className="field-wide">
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
