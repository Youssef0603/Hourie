import { useState, type FormEvent } from "react";
import { fr } from "../../../i18n/fr";
import { ApiError } from "../../../shared/api/http";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { updateEmployee } from "../api";
import type { EmployeeDetails } from "../types";

type EditPersonFormProps = {
  person: EmployeeDetails;
  canManageManagerAccounts: boolean;
  onSaved: (person: EmployeeDetails) => void;
};

export function EditPersonForm({
  person,
  canManageManagerAccounts,
  onSaved,
}: EditPersonFormProps) {
  const [name, setName] = useState(person.name);
  const [phoneNumber, setPhoneNumber] = useState(person.phone_number ?? "");
  const [passportNumber, setPassportNumber] = useState(
    person.passport_number ?? "",
  );
  const [employmentDate, setEmploymentDate] = useState(
    person.employment_date ?? "",
  );
  const [birthDate, setBirthDate] = useState(person.birth_date ?? "");
  const [username, setUsername] = useState(person.user?.username ?? "");
  const [email, setEmail] = useState(person.email ?? "");
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
          passport_number: passportNumber.trim() || null,
          employment_date: employmentDate || null,
          birth_date: birthDate || null,
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
            <span>{fr.directory.phoneNumber}</span>
            <input
              type="tel"
              autoComplete="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
            />
          </label>
          <label>
            <span>E-mail</span>
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
        <h3>{fr.directory.accountAccess}</h3>
        <p className="account-form-hint">{fr.directory.editCredentialsHint}</p>
        <div className="people-form-fields">
          <label>
            <span>{fr.directory.username}</span>
            <input
              required={person.user !== null}
              minLength={3}
              autoComplete="username"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value.toLowerCase())
              }
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
          <label className="field-wide">
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
      </section>
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
