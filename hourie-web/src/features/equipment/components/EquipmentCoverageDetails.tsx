import { fr } from "../../../i18n/fr";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { formatMoney } from "../../../shared/formatMoney";
import type { Equipment } from "../types";
import { EquipmentDetailSection } from "./EquipmentDetailSection";
import type { RelatedRecordReference } from "./RelatedRecordDetailPanel";

type InsuranceCoveragePolicy = {
  id: number;
  policy_number?: string | null;
  source?: string | null;
  ends_on?: string | null;
  total_amount?: string | number | null;
};

export function EquipmentCoverageDetails({
  equipment,
  showInsurance,
  readOnly,
  onOpenRecord,
}: {
  equipment: Equipment;
  showInsurance: boolean;
  readOnly: boolean;
  onOpenRecord: (record: RelatedRecordReference) => void;
}) {
  return (
    <>
      {showInsurance && (
        <EquipmentDetailSection title="Assurance" icon="invoice" defaultOpen={equipment.insurance_policies.length > 0}>
          <EquipmentInsuranceCoverage
            policies={equipment.insurance_policies}
            onOpenPolicy={readOnly ? undefined : (id) => onOpenRecord({ type: "insurance", id })}
          />
        </EquipmentDetailSection>
      )}
      <EquipmentDetailSection title="Admission temporaire" icon="identification" defaultOpen={equipment.temporary_admissions.length > 0}>
        <EquipmentTemporaryAdmissions
          admissions={equipment.temporary_admissions}
          onOpenAdmission={readOnly ? undefined : (id) => onOpenRecord({ type: "temporary-admission", id })}
        />
      </EquipmentDetailSection>
    </>
  );
}

export function EquipmentInsuranceCoverage({
  policies,
  onOpenPolicy,
  emptyTitle = "Aucune assurance liée",
  emptyDescription = "La police apparaîtra ici dès que ce véhicule sera ajouté à une assurance équipement.",
}: {
  policies: InsuranceCoveragePolicy[];
  onOpenPolicy?: (policyId: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const activePolicy = policies.find(policyIsActive);
  const policy = activePolicy ?? policies[0];

  if (!policy) {
    return (
      <EmptyState
        compact
        icon="invoice"
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="equipment-insurance-coverage">
      <div className="equipment-insurance-coverage-heading">
        <span className={`insurance-status ${activePolicy ? "active" : "expired"}`}>
          {activePolicy ? "Assurance active" : "Assurance expirée"}
        </span>
        {policies.length > 1 && <small>{policies.length} polices liées</small>}
      </div>
      <dl>
        {hasDisplayValue(policy.policy_number) && (
          <div><dt>N° de police</dt><dd>{policy.policy_number}</dd></div>
        )}
        {hasDisplayValue(policy.source) && (
          <div><dt>Assureur</dt><dd>{policy.source}</dd></div>
        )}
        {hasDisplayValue(policy.ends_on) && (
          <div><dt>Expiration</dt><dd>{formatCoverageDate(policy.ends_on)}</dd></div>
        )}
        {hasDisplayValue(policy.total_amount) && (
          <div><dt>Prime TTC</dt><dd>{formatMoney(policy.total_amount)}</dd></div>
        )}
      </dl>
      {onOpenPolicy && (
        <button type="button" className="insurance-policy-document" onClick={() => onOpenPolicy(policy.id)}>
          <ActionIcon name="invoice" />
          Voir l’assurance
        </button>
      )}
    </div>
  );
}

export function EquipmentTemporaryAdmissions({
  admissions,
  onOpenAdmission,
}: {
  admissions: Equipment["temporary_admissions"];
  onOpenAdmission?: (admissionId: number) => void;
}) {
  if (!admissions.length) {
    return (
      <EmptyState
        compact
        icon="identification"
        title="Aucune admission temporaire liée"
        description="L’admission apparaîtra ici lorsque cet équipement sera ajouté à un dossier AT."
      />
    );
  }

  return (
    <div className="equipment-insurance-coverage equipment-temporary-admissions">
      {admissions.map((admission) => (
        <article key={admission.id}>
          <div className="equipment-insurance-coverage-heading">
            <span className={`insurance-status ${admission.status}`}>
              {temporaryAdmissionStatusLabel(admission.status)}
            </span>
          </div>
          <dl>
            <div><dt>Référence douane</dt><dd>{admission.customs_reference}</dd></div>
            <div><dt>Entrée</dt><dd>{formatCoverageDate(admission.entered_on)}</dd></div>
            <div><dt>Échéance</dt><dd>{formatCoverageDate(admission.expires_on)}</dd></div>
            {admission.status === "cleared" && (
              <div>
                <dt>Droits payés</dt>
                <dd>{admission.customs_duty_amount === null ? fr.common.notProvided : formatMoney(admission.customs_duty_amount)}</dd>
              </div>
            )}
          </dl>
          {onOpenAdmission && (
            <button type="button" className="insurance-policy-document" onClick={() => onOpenAdmission(admission.id)}>
              <ActionIcon name="identification" />
              Voir l’admission temporaire
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

function temporaryAdmissionStatusLabel(status: Equipment["temporary_admissions"][number]["status"]) {
  return {
    active: "Active",
    returned: "Retournée",
    cleared: "Dédouanée",
    expired: "Expirée",
  }[status];
}

function policyIsActive(policy: Pick<InsuranceCoveragePolicy, "ends_on">) {
  return Boolean(policy.ends_on && policy.ends_on >= new Date().toISOString().slice(0, 10));
}

function hasDisplayValue<T>(value: T): value is Exclude<T, null | undefined | ""> {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function formatCoverageDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`))
    : fr.common.notProvided;
}
