import { fr } from "../../../i18n/fr";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { catalogLabel } from "../../equipment/catalogs";
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
  onOpenEquipment,
}: {
  person: EmployeeDetails;
  catalogs?: CatalogOption[];
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenEquipment: (equipmentId: number) => void;
}) {
  const activePolicy = person.health_insurance_policies.find(
    (policy) =>
      policy.ends_on !== null &&
      policy.ends_on >= new Date().toISOString().slice(0, 10),
  );
  const policy = activePolicy ?? person.health_insurance_policies[0];
  const assignments = person.project_assignments ?? [];
  return (
    <div className="person-detail">
      {canEdit && (
        <div className="detail-primary-actions person-detail-toolbar">
          <button
            className="equipment-edit-button detail-toolbar-button"
            type="button"
            onClick={onEdit}
          >
            <ActionIcon name="edit" />
            {fr.common.edit}
          </button>
          <button
            className="danger-button detail-delete-button"
            type="button"
            onClick={onDelete}
            aria-label={fr.directory.deletePerson}
            title={fr.directory.deletePerson}
          >
            <ActionIcon name="delete" />
          </button>
        </div>
      )}
      <section className="person-profile-summary">
        <div className="person-profile-identity">
          <span className="person-profile-avatar">{initials(person.name)}</span>
          <div>
            <h3>{person.name}</h3>
            <p>{catalogLabel(catalogs, "employee_job_title", person.job_title)}</p>
            <small>{person.user ? `@${person.user.username} · ${fr.roles[person.user.role]}` : fr.directory.noSystemAccess}</small>
          </div>
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
          <div>
            <dt>{fr.directory.workplace}</dt>
            <dd>{person.current_project?.name ?? person.current_company_location?.name ?? fr.common.notAssigned}</dd>
          </div>
        </dl>
      </section>
      <section className="person-assigned-assets-section">
        <h3><ActionIcon name="specifications" />{fr.directory.assignedEquipment}</h3>
        {person.equipment_in_custody.length > 0 ? (
          <div className="person-assigned-assets-list">
            {person.equipment_in_custody.map((equipment) => {
              const identification = [equipment.brand, equipment.model]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  className="person-assigned-asset-link"
                  key={equipment.id}
                  type="button"
                  onClick={() => onOpenEquipment(equipment.id)}
                  aria-label={`${identification || fr.common.notProvided} — ${equipment.asset_code}`}
                >
                  <div className="person-assigned-asset-copy">
                    <div>
                      <strong>{identification || fr.common.notProvided}</strong>
                      <span>{equipment.asset_code}</span>
                    </div>
                  </div>
                  <ActionIcon name="expand" />
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState
            compact
            icon="specifications"
            title={fr.directory.noAssignedEquipment}
          />
        )}
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
              <dt>État</dt>
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
    </div>
  );
}
