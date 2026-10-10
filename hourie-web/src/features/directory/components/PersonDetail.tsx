import { useState } from "react";
import { fr } from "../../../i18n/fr";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { catalogBadgeStyle, catalogLabel } from "../../equipment/catalogs";
import type { CatalogOption } from "../../equipment/types";
import type { EmployeeDetails } from "../types";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T00:00:00`))
    : fr.common.notAssigned;
}

export function PersonDetail({
  person,
  catalogs,
  canEdit,
  onEdit,
  onDelete,
}: {
  person: EmployeeDetails;
  catalogs?: CatalogOption[];
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showAssets, setShowAssets] = useState(false);
  const activePolicy = person.health_insurance_policies.find(
    (policy) =>
      policy.ends_on !== null &&
      policy.ends_on >= new Date().toISOString().slice(0, 10),
  );
  const policy = activePolicy ?? person.health_insurance_policies[0];
  const assignments = person.project_assignments ?? [];
  return (
    <div className="person-detail">
      <section className="person-profile-summary">
        <div className="person-profile-identity">
          <span className="person-profile-avatar">{initials(person.name)}</span>
          <div>
            <h3>{person.name}</h3>
            <p>{catalogLabel(catalogs, "employee_job_title", person.job_title)}</p>
            <small>{person.user ? `@${person.user.username} · ${fr.roles[person.user.role]}` : fr.directory.noSystemAccess}</small>
          </div>
          {canEdit && (
            <button
              className="person-delete-action"
              type="button"
              onClick={onDelete}
              aria-label={fr.directory.deletePerson}
              title={fr.directory.deletePerson}
            >
              <ActionIcon name="delete" />
            </button>
          )}
        </div>
        <dl className="person-profile-facts">
          <div>
            <dt>{fr.directory.phoneNumber}</dt>
            <dd>{person.phone_number ?? fr.common.notAssigned}</dd>
          </div>
          <div>
            <dt>{fr.directory.assignedAssets}</dt>
            <dd>
              {fr.directory.assetCount(person.equipment_in_custody.length)}
            </dd>
          </div>
          <div>
            <dt>{fr.directory.employmentDate}</dt>
            <dd>{date(person.employment_date)}</dd>
          </div>
          <div>
            <dt>Date de naissance</dt>
            <dd>{date(person.birth_date)}</dd>
          </div>
          <div>
            <dt>{fr.directory.passportNumber}</dt>
            <dd>{person.passport_number ?? fr.common.notAssigned}</dd>
          </div>
          <div>
            <dt>{fr.directory.email}</dt>
            <dd>{person.email ?? fr.common.notAssigned}</dd>
          </div>
        </dl>
        <div className="person-profile-actions">
          {canEdit && (
            <button
              className="person-detail-action primary"
              type="button"
              onClick={onEdit}
            >
              <ActionIcon name="edit" />
              {fr.common.edit}
            </button>
          )}
          <button
            className="person-detail-action"
            type="button"
            disabled={person.equipment_in_custody.length === 0}
            onClick={() => setShowAssets((visible) => !visible)}
          >
            {showAssets
              ? fr.directory.hideAssignedAssets
              : fr.directory.viewAssignedAssets}
          </button>
        </div>
      </section>
      <section className="person-project-assignments">
        <h3><ActionIcon name="location" />Affectations chantier</h3>
        {assignments.length ? <div className="person-project-assignment-list">
          {assignments.map((assignment) => <article key={assignment.id}>
            <div>
              <strong>{assignment.project.name}</strong>
              <span>{assignment.project_role}</span>
            </div>
            <div>
              <span className={`person-assignment-status${assignment.ended_on ? " ended" : ""}`}>{assignment.ended_on ? "Terminée" : "En cours"}</span>
              <small>{date(assignment.started_on)}{assignment.ended_on ? ` — ${date(assignment.ended_on)}` : ""}</small>
            </div>
          </article>)}
        </div> : <EmptyState compact icon="location" title="Aucune affectation chantier" description="Cette personne n’est actuellement affectée à aucun chantier." />}
      </section>
      <section className="person-health-insurance">
        <h3>
          <ActionIcon name="invoice" />
          Assurance santé
        </h3>
        {policy ? (
          <dl>
            <div>
              <dt>Statut</dt>
              <dd>
                <span
                  className={`insurance-status ${activePolicy ? "active" : "expired"}`}
                >
                  {activePolicy ? "Assurance active" : "Assurance expirée"}
                </span>
              </dd>
            </div>
            <div>
              <dt>N° de police</dt>
              <dd>{policy.policy_number}</dd>
            </div>
            <div>
              <dt>Assureur</dt>
              <dd>{policy.source ?? fr.common.notAssigned}</dd>
            </div>
            <div>
              <dt>Expiration</dt>
              <dd>{date(policy.ends_on)}</dd>
            </div>
          </dl>
        ) : (
          <EmptyState
            compact
            icon="invoice"
            title="Aucune assurance santé liée"
            description="La police apparaîtra ici lorsque cette personne sera ajoutée à une assurance santé groupe."
          />
        )}
      </section>
      {showAssets && person.equipment_in_custody.length > 0 && (
        <section className="person-assigned-assets-section">
          <h3>{fr.directory.assignedEquipment}</h3>
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
        </section>
      )}
    </div>
  );
}
