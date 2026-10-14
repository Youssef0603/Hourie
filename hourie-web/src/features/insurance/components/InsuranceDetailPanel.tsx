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
import { operationsText } from "../../../i18n/operations";

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
  const text = operationsText().insurance;
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
    if (!window.confirm(text.deleteConfirmation(policy.policy_number)))
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
        aria-label={text.detail}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header">
          <div>
            <p className="section-label">
              {insuranceTypeLabel(policy.insurance_type)}
            </p>
            <h2>{policy.policy_number}</h2>
            <p>{policy.source || text.insurerToComplete}</p>
          </div>
          <button type="button" aria-label={text.close} onClick={onClose}>
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
                {text.edit}
              </button>
              <button
                className="equipment-history-button detail-toolbar-button"
                type="button"
                onClick={() => void openHistory()}
              >
                <ActionIcon name="history" />
                {text.history}
              </button>
              <button
                className="danger-button detail-delete-button"
                type="button"
                disabled={isDeleting}
                onClick={() => void remove()}
                aria-label={isDeleting ? text.deleting : text.delete}
              >
                <ActionIcon name="delete" />
              </button>
            </div>
          )}
          <section>
            <h3>
              <ActionIcon name="identification" />
              {text.policyInformation}
            </h3>
            <dl>
              <div>
                <dt>{text.columns.insurer}</dt>
                <dd>{policy.source || text.toComplete}</dd>
              </div>
              {policy.insurance_type === "trc_rc" && (
                <div>
                  <dt>{text.siteProject}</dt>
                  <dd>{policy.project?.name || text.toComplete}</dd>
                </div>
              )}
              <div>
                <dt>{text.columns.covered}</dt>
                <dd>{coveredInsuranceLabel(policy)}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>
              <ActionIcon name="history" />
              {text.periodStatus}
            </h3>
            <dl>
              <div>
                <dt>{text.startDate}</dt>
                <dd>{formatInsuranceDate(policy.starts_on)}</dd>
              </div>
              <div>
                <dt>{text.expiryDate}</dt>
                <dd>{formatInsuranceDate(policy.ends_on)}</dd>
              </div>
              <div>
                <dt>{text.columns.status}</dt>
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
                  {text.coverage}
                </h3>
                <dl>
                  <div>
                    <dt>{text.insuredSituation}</dt>
                    <dd>{policy.insured_situation || text.toComplete}</dd>
                  </div>
                </dl>
              </section>
            )}
          <section>
            <h3>
              <ActionIcon name="invoice" />
              {text.financialInformation}
            </h3>
            <dl>
              <div>
                <dt>{text.netPremium}</dt>
                <dd>{formatInsuranceMoney(policy.net_premium)}</dd>
              </div>
              <div>
                <dt>ACC</dt>
                <dd>
                  {formatInsuranceMoney(policy.accessories_amount ?? "0")}
                </dd>
              </div>
              <div>
                <dt>{text.tax}</dt>
                <dd>{formatInsuranceMoney(policy.tax_amount)}</dd>
              </div>
              <div>
                <dt>{text.totalPremium}</dt>
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
              {text.observations}
            </h3>
            <p className="observations">
              {policy.notes || text.noObservation}
            </p>
          </section>
          <InsuranceHistory policy={policy} />
        </div>
      </aside>
    </div>
  );
}
