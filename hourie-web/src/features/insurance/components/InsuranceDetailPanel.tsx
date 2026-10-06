import { useState } from "react";
import { apiRequest } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import {
  coveredInsuranceLabel,
  formatInsuranceDate,
  formatInsuranceMoney,
  insurancePolicyStatus,
  insuranceStatusLabel,
  insuranceTypeLabel,
} from "../policyDisplay";
import type {
  InsurancePolicy as Policy,
  InsurancePolicyDocument as PolicyDocument,
} from "../types";
import {
  InsuranceCoveredEquipment,
  InsuranceCoveredPeople,
} from "./InsuranceCoveredItems";
import { InsuranceDocuments } from "./InsuranceDocuments";
import { InsuranceHistory } from "./InsuranceHistory";

export function InsuranceDetailPanel({
  policy,
  onClose,
  onEdit,
  onDocumentsChanged,
  onDeleted,
  onOpenEquipment,
  readOnly = false,
  nested = false,
}: {
  policy: Policy;
  onClose: () => void;
  onEdit: () => void;
  onDocumentsChanged: (documents: PolicyDocument[]) => void;
  onDeleted: () => void;
  onOpenEquipment?: (equipmentId: number) => void;
  readOnly?: boolean;
  nested?: boolean;
}) {
  const state = insurancePolicyStatus(policy);
  const [isDeleting, setIsDeleting] = useState(false);

  function openHistory() {
    const section = document.getElementById(
      `insurance-history-${policy.id}`,
    ) as HTMLDetailsElement | null;
    if (section) {
      section.open = true;
      section.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  async function remove() {
    if (!window.confirm(`Supprimer la police ${policy.policy_number} ?`))
      return;
    setIsDeleting(true);
    try {
      await apiRequest(`/api/v1/insurance-policies/${policy.id}`, {
        method: "DELETE",
      });
      onDeleted();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className={`detail-backdrop${nested ? " nested-detail-backdrop" : ""}`}
      onMouseDown={onClose}
    >
      <aside
        className="detail-panel insurance-side-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Détail de la police"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header">
          <div>
            <p className="section-label">
              {insuranceTypeLabel(policy.insurance_type)}
            </p>
            <h2>{policy.policy_number}</h2>
            <p>{policy.source || "Assureur à compléter"}</p>
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose}>
            <ActionIcon name="close" />
          </button>
        </header>
        <div className="detail-content insurance-side-content">
          {!readOnly && (
            <div className="detail-primary-actions">
              <button
                className="equipment-edit-button detail-toolbar-button"
                type="button"
                onClick={onEdit}
              >
                <ActionIcon name="edit" />
                Modifier
              </button>
              <button
                className="equipment-history-button detail-toolbar-button"
                type="button"
                onClick={() => void openHistory()}
              >
                <ActionIcon name="history" />
                Voir l’historique
              </button>
              <button
                className="danger-button detail-delete-button"
                type="button"
                disabled={isDeleting}
                onClick={() => void remove()}
                aria-label={isDeleting ? "Suppression en cours" : "Supprimer"}
              >
                <ActionIcon name="delete" />
              </button>
            </div>
          )}
          <section>
            <h3>
              <ActionIcon name="identification" />
              Informations de la police
            </h3>
            <dl>
              <div>
                <dt>Assureur</dt>
                <dd>{policy.source || "À compléter"}</dd>
              </div>
              {policy.insurance_type === "trc_rc" && (
                <div>
                  <dt>Site / projet</dt>
                  <dd>{policy.project?.name || "À compléter"}</dd>
                </div>
              )}
              <div>
                <dt>Éléments couverts</dt>
                <dd>{coveredInsuranceLabel(policy)}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>
              <ActionIcon name="history" />
              Période et statut
            </h3>
            <dl>
              <div>
                <dt>Date de début</dt>
                <dd>{formatInsuranceDate(policy.starts_on)}</dd>
              </div>
              <div>
                <dt>Date d’expiration</dt>
                <dd>{formatInsuranceDate(policy.ends_on)}</dd>
              </div>
              <div>
                <dt>Statut</dt>
                <dd>
                  <em className={`insurance-status ${state}`}>
                    {insuranceStatusLabel(state)}
                  </em>
                </dd>
              </div>
            </dl>
          </section>
          {policy.insurance_type === "equipment" && (
            <InsuranceCoveredEquipment
              equipment={policy.equipment ?? []}
              onOpenEquipment={onOpenEquipment}
            />
          )}
          {policy.insurance_type === "group_health" && (
            <InsuranceCoveredPeople employees={policy.employees ?? []} />
          )}
          {policy.insurance_type !== "equipment" &&
            policy.insurance_type !== "group_health" && (
              <section>
                <h3>
                  <ActionIcon name="specifications" />
                  Couverture
                </h3>
                <dl>
                  <div>
                    <dt>Situation assurée</dt>
                    <dd>{policy.insured_situation || "À compléter"}</dd>
                  </div>
                </dl>
              </section>
            )}
          <section>
            <h3>
              <ActionIcon name="invoice" />
              Informations financières
            </h3>
            <dl>
              <div>
                <dt>Prime nette</dt>
                <dd>{formatInsuranceMoney(policy.net_premium)}</dd>
              </div>
              <div>
                <dt>ACC</dt>
                <dd>
                  {formatInsuranceMoney(policy.accessories_amount ?? "0")}
                </dd>
              </div>
              <div>
                <dt>Taxe</dt>
                <dd>{formatInsuranceMoney(policy.tax_amount)}</dd>
              </div>
              <div>
                <dt>Prime TTC</dt>
                <dd>{formatInsuranceMoney(policy.total_amount)}</dd>
              </div>
            </dl>
          </section>
          <InsuranceDocuments
            policy={policy}
            onChanged={onDocumentsChanged}
            readOnly={readOnly}
          />
          <section>
            <h3>
              <ActionIcon name="note" />
              Observations
            </h3>
            <p className="observations">
              {policy.notes || "Aucune observation."}
            </p>
          </section>
          <InsuranceHistory policy={policy} />
        </div>
      </aside>
    </div>
  );
}
